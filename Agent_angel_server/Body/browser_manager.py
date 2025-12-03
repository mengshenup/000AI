import asyncio # ⚡ 异步 I/O 库
from playwright.async_api import async_playwright # 🎭 Playwright 异步 API
try:
    from playwright_stealth import Stealth # 🕵️‍♂️ 反爬虫隐身插件 (新版用法)
    async def stealth_async(page):
        await Stealth().apply_stealth_async(page)
except ImportError:
    try:
        from playwright_stealth import stealth_async # 🕵️‍♂️ 尝试旧版用法
    except ImportError:
        # 🛡️ 如果未安装 stealth，提供一个空函数防止报错
        async def stealth_async(page): pass
        print("⚠️ [提示] playwright-stealth 未安装 (反爬虫功能受限)")

from Memory.system_config import USER_DATA_DIR, VIEWPORT, BROWSER_CHANNEL, TARGET_SEARCH_URL # ⚙️ 导入系统配置
from Energy.cost_tracker import global_cost_tracker # 💰 导入成本追踪器
from Eye.screenshot_tool import ScreenshotTool # 👁️ 导入截图工具
from Hand.mouse_controller import MouseController # ✋ 导入鼠标控制器

class BrowserManager:
    # =================================
    #  🎉 浏览器管理器 (单例/多租户版)
    #
    #  🎨 代码用途：
    #     管理全局唯一的 Playwright 浏览器实例，并为每个用户分配独立的 Context (上下文)。
    #     实现了“单浏览器，多用户”的高并发架构。
    #
    #  💡 易懂解释：
    #     就像一辆大巴车（浏览器），可以坐很多乘客（用户）。每个乘客都有自己的座位（Context），
    #     互不干扰。这样比每个人都开一辆车（启动多个浏览器）要省油（内存）多啦！🚌
    #
    #  ⚠️ 警告：
    #     8GB 内存上限约支持 20-50 个并发 Context（取决于网页复杂度）。
    #     务必及时调用 close_session 释放资源。
    # =================================
    
    _instance = None # 单例引用

    def __new__(cls):
        # =================================
        #  🎉 单例构造 (类对象)
        #
        #  🎨 代码用途：
        #     确保 BrowserManager 在整个应用程序中只有一个实例。
        #
        #  💡 易懂解释：
        #     世界上只能有一个 Angel 的身体管家！如果已经有一个了，就用那个；如果没有，就变一个出来。
        # =================================
        if cls._instance is None:
            cls._instance = super(BrowserManager, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        # =================================
        #  🎉 初始化管家 (无参数)
        #
        #  🎨 代码用途：
        #     初始化会话池和线程锁。使用 initialized 标志防止重复初始化。
        #
        #  💡 易懂解释：
        #     管家上任啦！准备好小本本（sessions）记录乘客，准备好锁（lock）防止大家挤破头。
        # =================================
        if self.initialized: return
        self.initialized = True
        
        self.playwright = None # 🌱 Playwright 引擎
        self.browser = None # 🌍 全局浏览器实例
        self.sessions = {} # 👥 用户会话池 {user_id: {context, page, eye, hand}}
        self.lock = asyncio.Lock() # 🔒 线程锁，防止并发启动冲突

    async def start_global_browser(self):
        # =================================
        #  🎉 启动全局浏览器 (无参数)
        #
        #  🎨 代码用途：
        #     启动唯一的 Chromium 实例。针对服务器环境进行了参数优化（禁用 GPU、沙箱等）。
        #
        #  💡 易懂解释：
        #     发动大巴车引擎！轰轰轰~ 准备接客啦！
        # =================================
        async with self.lock:
            if self.browser: return # 避免重复启动

            print("🚀 [系统] 正在启动全局浏览器引擎...")
            self.playwright = await async_playwright().start()
            
            launch_args = [
                "--disable-gpu", # 🔌 服务器通常无 GPU，禁用以防报错
                "--disable-dev-shm-usage", # 💾 防止 Docker/Linux 内存溢出
                "--no-sandbox", # 📦 禁用沙箱
                "--disable-setuid-sandbox",
                "--disable-accelerated-2d-canvas", # 🎨 禁用加速，节省显存
                "--no-first-run",
                "--no-zygote",
                "--disable-blink-features=AutomationControlled", # 🕵️‍♂️ 关键：禁用自动化控制特征
                # "--single-process", # ⚠️ 极度节省内存但不稳定，暂不开启
            ]

            try:
                # 尝试使用配置的通道 (如 chrome, msedge)
                if BROWSER_CHANNEL:
                    print(f"🚀 [系统] 尝试启动 {BROWSER_CHANNEL}...")
                    self.browser = await self.playwright.chromium.launch(
                        headless=True, # 👻 必须无头
                        args=launch_args,
                        channel=BROWSER_CHANNEL,
                        ignore_default_args=["--enable-automation"] # 🕵️‍♂️ 隐藏“正受到自动测试软件控制”的提示
                    )
                    print("✅ [系统] 全局浏览器启动成功！")
                else:
                    print("ℹ️ [系统] 未配置 BROWSER_CHANNEL，直接使用内置 Chromium")
                    raise Exception("Use bundled")
            except Exception as e:
                print(f"❌ [系统] 指定浏览器启动失败: {e}")
                print("🔄 [系统] 尝试回退到内置 Chromium...")
                # 尝试回退到默认 Chromium
                self.browser = await self.playwright.chromium.launch(
                    headless=True, 
                    args=launch_args,
                    ignore_default_args=["--enable-automation"]
                )
                print("✅ [系统] 已回退到内置 Chromium 启动。")

    async def get_or_create_session(self, user_id: str):
        # =================================
        #  🎉 获取/创建用户会话 (用户ID)
        #
        #  🎨 代码用途：
        #     为指定用户分配一个独立的 BrowserContext。如果已存在则直接返回。
        #     每个会话包含：Context, Page, Eye, Hand。
        #
        #  💡 易懂解释：
        #     乘客来啦！🎫 查票，找座位。如果是新乘客，就给他安排一个新座位，
        #     发一副眼镜（Eye）和一双手套（Hand）。
        # =================================
        if not self.browser:
            await self.start_global_browser()

        if user_id in self.sessions:
            return self.sessions[user_id]

        print(f"🆕 [会话] 为用户 {user_id} 创建新环境...")
        
        # 1. 创建上下文 (隔离环境)
        # 🛠️ 优化：使用持久化存储，避免每次都像新用户一样被检测
        # 路径: Agent_angel_server/Memorybank/BrowserData/{user_id}
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        user_data_dir = os.path.join(base_dir, "Memorybank", "BrowserData", user_id)
        os.makedirs(user_data_dir, exist_ok=True)

        # 注意：new_context 不支持 userDataDir (那是 launch 的参数)，
        # 但我们可以通过 storageState 来加载/保存 Cookies 和 LocalStorage。
        # 或者，如果需要完全持久化，应该使用 launch_persistent_context，但这会破坏单浏览器多租户架构。
        # 妥协方案：手动加载/保存 storageState。
        
        storage_state_path = os.path.join(user_data_dir, "state.json")
        storage_state = storage_state_path if os.path.exists(storage_state_path) else None

        context = await self.browser.new_context(
            viewport=VIEWPORT,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", # 🕵️‍♂️ 更新 UA 到 Chrome 128
            locale="zh-CN",
            timezone_id="Asia/Shanghai",
            device_scale_factor=1, # 🖥️ 1倍缩放，节省渲染开销
            storage_state=storage_state # 🍪 加载持久化状态 (Cookies/LS)
        )

        # 2. 创建页面
        page = await context.new_page()
        
        # 🕵️‍♂️ 额外注入：移除 webdriver 属性
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)
        
        # 🚀 自动导航到默认页面，防止白屏
        try:
            print(f"🚀 [会话] 正在预加载默认页面: {TARGET_SEARCH_URL}")
            await page.goto(TARGET_SEARCH_URL, timeout=15000)
        except Exception as e:
            print(f"⚠️ [会话] 默认页面加载超时: {e}")

        # 3. 注入反爬虫 (Anti-Anti-Bot)
        try:
            await stealth_async(page)
        except Exception as e:
            print(f"⚠️ [系统] 反爬虫注入失败: {e}")
            
        # 💾 自动保存状态钩子
        async def save_storage_state():
            try:
                await context.storage_state(path=storage_state_path)
            except: pass
            
        # 每当页面关闭或导航时尝试保存状态 (简单策略)
        page.on("close", lambda: asyncio.create_task(save_storage_state()))
        # page.on("load", lambda: asyncio.create_task(save_storage_state())) # 太频繁，暂不开启

        # 5. 挂载组件
        eye = ScreenshotTool(page)
        hand = MouseController(page)

        # 6. 流量监听
        page.on("response", self._track_response)
        page.on("request", self._track_request)

        session = {
            "context": context,
            "page": page,
            "eye": eye,
            "hand": hand,
            "created_at": asyncio.get_event_loop().time(),
            "save_state_func": save_storage_state # 暴露保存函数
        }
        
        self.sessions[user_id] = session
        return session

    async def close_session(self, user_id: str):
        # =================================
        #  🎉 关闭会话 (用户ID)
        #
        #  🎨 代码用途：
        #     清理指定用户的资源，关闭 Context。
        #     ⚠️ 注意：仅关闭指定用户的上下文，不影响其他在线用户。
        # =================================
        if user_id in self.sessions:
            print(f"👋 [会话] 用户 {user_id} 下线，清理资源。")
            session = self.sessions.pop(user_id) # 🗑️ 从池中移除
            
            # 💾 退出前保存状态
            if "save_state_func" in session:
                await session["save_state_func"]()
                
            try:
                await session['context'].close() # 🛑 关闭该用户的独立上下文
            except: pass
            
            print(f"ℹ️ [系统] 剩余活跃会话: {len(self.sessions)} (并发安全检查✅)")

    async def stop_all(self):
        # =================================
        #  🎉 停止所有 (无参数)
        #
        #  🎨 代码用途：
        #     关闭浏览器和所有会话。
        # =================================
        print("🛑 [系统] 正在停止所有浏览器服务...")
        for uid in list(self.sessions.keys()):
            await self.close_session(uid)
        
        if self.browser:
            await self.browser.close()
            self.browser = None
        
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None

    def _track_response(self, response):
        # =================================
        #  🎉 追踪响应流量 (response)
        #
        #  🎨 代码用途：
        #     监听网络响应事件，计算接收到的数据量（Rx），并记录到全局成本追踪器中。
        # =================================
        try:
            size = int(response.headers.get('content-length', 0))
            global_cost_tracker.track_browser(rx=size)
        except: pass

    def _track_request(self, request):
        # =================================
        #  🎉 追踪请求流量 (request)
        #
        #  🎨 代码用途：
        #     监听网络请求事件，估算发送的数据量（Tx），并记录到全局成本追踪器中。
        # =================================
        try:
            size = len(request.url) + 800
            if request.post_data:
                size += len(request.post_data)
            global_cost_tracker.track_browser(tx=size)
        except: pass

# 全局单例导出
global_browser_manager = BrowserManager()
