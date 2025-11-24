import asyncio # ⚡ 异步 I/O 库
from playwright.async_api import async_playwright # 🎭 Playwright 异步 API
from playwright_stealth import Stealth # 🕵️‍♂️ 反爬虫隐身插件
from Memory.system_config import USER_DATA_DIR, VIEWPORT, BROWSER_CHANNEL # ⚙️ 导入系统配置
from Energy.cost_tracker import global_cost_tracker # 💰 导入成本追踪器
from Eye.screenshot_tool import ScreenshotTool # 👁️ 导入截图工具
from Hand.mouse_controller import MouseController # ✋ 导入鼠标控制器

class BrowserManager:
    # =================================
    #  🎉 浏览器管理器 (无参数)
    #
    #  🎨 代码用途：
    #     作为整个系统的“躯体”核心，负责管理 Playwright 浏览器实例的生命周期，并持有“眼睛”(截图)和“手”(鼠标控制)的实例。
    #
    #  💡 易懂解释：
    #     就像是 Angel 的身体管家！它负责叫醒浏览器（启动），让浏览器睡觉（关闭），还负责连接眼睛和手，让 Angel 能看到网页并进行操作哦！✨
    #
    #  ⚠️ 警告：
    #     Playwright 的上下文管理非常关键，如果异常退出可能导致僵尸进程。务必确保 sleep 方法被正确调用以释放资源。
    # =================================
    def __init__(self):
        # =================================
        #  🎉 初始化躯体 (无参数)
        #
        #  🎨 代码用途：
        #     初始化 BrowserManager 的基础属性，设置初始状态为 None。
        #
        #  💡 易懂解释：
        #     先把身体的各个部件位置预留好，虽然现在还是空的，但马上就会填满啦！🌱
        #
        #  ⚠️ 警告：
        #     这里只是定义属性，真正的资源分配在 wake_up 方法中进行。
        # =================================
        self.playwright = None # 🌱 Playwright 引擎实例
        self.browser_context = None # 🏠 浏览器上下文环境
        self.page = None # 📄 当前操作的页面
        self.eye = None # 👁️ 视觉模块（截图工具）
        self.hand = None # ✋ 操作模块（鼠标控制器）

    async def wake_up(self):
        # =================================
        #  🎉 唤醒躯体 (无参数)
        #
        #  🎨 代码用途：
        #     启动 Playwright 引擎，加载持久化上下文，初始化页面，并挂载 Eye 和 Hand 模块。同时注入反爬虫策略。
        #
        #  💡 易懂解释：
        #     早安 Angel！🌞 这个方法就像是按下了开机键，启动浏览器，戴上眼镜（Eye），伸出双手（Hand），准备开始一天的工作啦！
        #
        #  ⚠️ 警告：
        #     launch_persistent_context 依赖 USER_DATA_DIR，如果该目录被其他进程占用可能会报错。Stealth 注入对于防止被网站识别为机器人至关重要。
        # =================================
        """唤醒躯体 (启动浏览器)"""
        self.playwright = await async_playwright().start() # 🚀 启动 Playwright 引擎
        
        launch_args = [
            "--disable-blink-features=AutomationControlled", # 🛡️ 禁用自动化控制特征
            "--disable-infobars", # 🚫 隐藏信息栏
            "--no-sandbox", # 📦 禁用沙箱模式（Linux下常用）
            "--disable-setuid-sandbox", # 🔒 禁用 setuid 沙箱
            "--disable-dev-shm-usage", # 💾 禁用 /dev/shm 使用（防止内存不足）
            "--disable-accelerated-2d-canvas", # 🎨 禁用 2D Canvas 加速
            "--disable-gpu", # 🔌 禁用 GPU 硬件加速
        ]

        # 💾 保存 PID 到文件，用于僵尸进程清理
        try:
            # 📝 注意：launch_persistent_context 返回的对象不直接暴露 PID
            # 🔧 暂时无法直接获取 PID，依靠文件锁机制管理
            pass # 🤷‍♀️ 暂时跳过
        except Exception:
            pass # 🛡️ 忽略错误

        try:
            if BROWSER_CHANNEL:
                print(f"🚀 [躯体] 正在使用系统浏览器唤醒 ({BROWSER_CHANNEL})...") # 📢 打印启动信息
                self.browser_context = await self.playwright.chromium.launch_persistent_context(
                    USER_DATA_DIR, # 📂 用户数据目录
                    headless=True, # 👻 无头模式（不显示界面）
                    channel=BROWSER_CHANNEL, # 🌐 指定浏览器通道（如 chrome, msedge）
                    args=launch_args, # ⚙️ 启动参数
                    viewport=VIEWPORT # 🖼️ 视口大小
                )
            else:
                print("🚀 [躯体] 正在使用内置 Chromium 唤醒...") # 📢 打印启动信息
                self.browser_context = await self.playwright.chromium.launch_persistent_context(
                    USER_DATA_DIR, # 📂 用户数据目录
                    headless=True, # 👻 无头模式
                    args=launch_args, # ⚙️ 启动参数
                    viewport=VIEWPORT # 🖼️ 视口大小
                )
        except Exception as e:
            print(f"❌ [躯体] 唤醒失败: {e}") # ❌ 打印错误日志
            raise e # 💥 抛出异常，终止启动

        self.page = self.browser_context.pages[0] if self.browser_context.pages else await self.browser_context.new_page() # 📄 获取或创建第一个页面
        
        # 初始化器官
        self.eye = ScreenshotTool(self.page) # 👁️ 安装视觉系统
        self.hand = MouseController(self.page) # ✋ 安装操作手
        
        # 注入反爬虫 Stealth
        await Stealth().apply_stealth_async(self.page) # 🕵️‍♂️ 开启隐身模式
        
        # 监听流量
        self.page.on("response", self._track_response) # 📥 监听响应流量
        self.page.on("request", self._track_request) # 📤 监听请求流量

    async def sleep(self):
        # =================================
        #  🎉 休眠 (无参数)
        #
        #  🎨 代码用途：
        #     安全关闭浏览器上下文和 Playwright 引擎，释放系统资源。
        #
        #  💡 易懂解释：
        #     晚安 Angel！🌙 工作结束啦，我们要把浏览器关掉，把资源还给电脑，好好休息一下。
        #
        #  ⚠️ 警告：
        #     必须确保在程序退出前调用此方法，否则可能会在系统中留下孤儿浏览器进程。
        # =================================
        """休眠 (关闭浏览器)"""
        if self.browser_context:
            await self.browser_context.close() # 🏠 关闭浏览器上下文
        if self.playwright:
            await self.playwright.stop() # 🛑 停止 Playwright 引擎

    def _track_response(self, response):
        # =================================
        #  🎉 追踪响应流量 (response)
        #
        #  🎨 代码用途：
        #     监听网络响应事件，计算接收到的数据量（Rx），并记录到全局成本追踪器中。
        #
        #  💡 易懂解释：
        #     就像记账一样！💰 每当浏览器收到网页发来的包裹（数据），我们都要记下来它有多重，看看我们用了多少流量。
        #
        #  ⚠️ 警告：
        #     这里使用了 content-length 头，如果服务器未返回此头，流量统计可能不准确（默认为0）。
        # =================================
        try:
            size = int(response.headers.get('content-length', 0)) # 📏 获取响应内容长度
            global_cost_tracker.track_browser(rx=size) # 📊 记录下行流量
        except: pass # 🛡️ 忽略统计错误

    def _track_request(self, request):
        # =================================
        #  🎉 追踪请求流量 (request)
        #
        #  🎨 代码用途：
        #     监听网络请求事件，估算发送的数据量（Tx），并记录到全局成本追踪器中。
        #
        #  💡 易懂解释：
        #     这也是记账哦！💰 每当我们向网页发送请求（比如点击链接、提交表单），也要算算我们发出去的数据有多少。
        #
        #  ⚠️ 警告：
        #     请求大小是估算的（URL长度 + 800字节头 + POST数据），并非精确的 TCP 包大小。
        # =================================
        try:
            size = len(request.url) + 800 # 📏 估算请求头大小
            if request.post_data:
                size += len(request.post_data) # 📦 加上 POST 数据大小
            global_cost_tracker.track_browser(tx=size) # 📊 记录上行流量
        except: pass # 🛡️ 忽略统计错误
