import asyncio
import base64
import random
import json
from playwright.async_api import async_playwright, Page
from config import USER_DATA_DIR, VIEWPORT, TARGET_SEARCH_URL
from services.billing import global_billing

class AngelBrowser:
    # =================================
    #  🎉 天使浏览器服务 ()
    #
    #  🎨 代码用途：
    #     封装 Playwright 操作，提供无头浏览器的启动、控制、截图和网络监听功能。
    #
    #  💡 易懂解释：
    #     机器人的“眼睛”和“手”！它在后台偷偷打开一个浏览器，帮你看视频、找攻略。👀✋
    #
    #  ⚠️ 警告：
    #     浏览器非常吃内存。如果服务器配置低，可能会经常崩溃。
    # =================================
    def __init__(self):
        # =================================
        #  🎉 初始化 ()
        #
        #  🎨 代码用途：
        #     初始化浏览器实例变量。
        #
        #  💡 易懂解释：
        #     准备好工具箱，但还没开始干活（还没启动浏览器）。🧰
        #
        #  ⚠️ 警告：
        #     无。
        # =================================
        self.playwright = None # 🎭 Playwright 实例
        self.browser_context = None # 🌍 浏览器上下文
        self.page: Page = None # 📄 当前页面对象
        self.found_spots = set() # 🔍 已发现的点位集合（去重用）

    async def start(self):
        # =================================
        #  🎉 启动浏览器 ()
        #
        #  🎨 代码用途：
        #     初始化 Playwright，加载用户数据目录，并注入反爬虫绕过参数。
        #
        #  💡 易懂解释：
        #     打开浏览器，准备上网！🌐
        #
        #  ⚠️ 警告：
        #     如果 user_data 目录被其他 Chrome 进程占用，启动会失败。
        # =================================
        # 🚀 启动 Playwright 服务
        self.playwright = await async_playwright().start()
        # 🍪 启动持久化浏览器上下文（保持登录状态和缓存）
        try:
            self.browser_context = await self.playwright.chromium.launch_persistent_context(
                USER_DATA_DIR, # 📂 用户数据目录
                headless=True, # 👻 无头模式（不显示界面）
                # channel="chrome", # 🖥️ 使用系统安装的 Chrome (已注释，改用 bundled chromium)
                args=["--disable-blink-features=AutomationControlled"], # 🕵️ 隐藏自动化特征
                viewport=VIEWPORT # 📏 设置窗口大小
            )
        except Exception as e:
            print(f"❌ Browser launch failed: {e}")
            # Fallback or re-raise
            raise e
        # 📄 获取第一个页面，如果没有则新建一个
        self.page = self.browser_context.pages[0] if self.browser_context.pages else await self.browser_context.new_page()
        
        # 📡 绑定流量监听事件
        self.page.on("response", self._track_response) # 📥 监听响应
        self.page.on("request", self._track_request) # 📤 监听请求
        
        # 🏠 预加载主页
        try:
            # ⏳ 访问抖音主页，超时时间 30秒
            await self.page.goto("https://www.douyin.com/", timeout=30000, wait_until="domcontentloaded")
        except:
            pass # 🤐 忽略超时错误

    async def stop(self):
        # =================================
        #  🎉 关闭资源 ()
        #
        #  🎨 代码用途：
        #     安全关闭浏览器上下文和 Playwright 实例，释放系统资源。
        #
        #  💡 易懂解释：
        #     关掉浏览器，休息了。💤
        #
        #  ⚠️ 警告：
        #     无。
        # =================================
        if self.browser_context:
            await self.browser_context.close() # 🚪 关闭浏览器
        if self.playwright:
            await self.playwright.stop() # 🛑 停止 Playwright 服务

    def _track_response(self, response):
        # =================================
        #  🎉 追踪响应流量 (响应对象)
        #
        #  🎨 代码用途：
        #     监听网络响应，统计下载流量。
        #
        #  💡 易懂解释：
        #     看看下载了多少东西。📥
        #
        #  ⚠️ 警告：
        #     无。
        # =================================
        try:
            # 🛡️ 修复BUG: 使用 .get() 防止 header 不存在报错
            headers = response.headers
            # 📏 获取内容长度
            size = int(headers.get('content-length', 0))
            # 💰 记录下载流量
            global_billing.track_browser(rx=size)
        except: pass

    def _track_request(self, request):
        # =================================
        #  🎉 追踪请求流量 (请求对象)
        #
        #  🎨 代码用途：
        #     监听网络请求，统计上传流量。
        #
        #  💡 易懂解释：
        #     看看上传了多少东西。📤
        #
        #  ⚠️ 警告：
        #     无。
        # =================================
        try:
            # 📏 估算请求头大小 (URL长度 + 800字节基础头)
            size = len(request.url) + 800  
            # 📦 如果有 POST 数据，加上数据长度
            if request.post_data:
                size += len(request.post_data)
            # 💰 记录上传流量
            global_billing.track_browser(tx=size)
        except: pass

    async def get_screenshot_b64(self):
        # =================================
        #  🎉 获取截图 (无参数)
        #
        #  🎨 代码用途：
        #     截取当前页面画面，压缩为 JPEG 并转换为 Base64 字符串。
        #
        #  💡 易懂解释：
        #     给当前网页拍张照，发给前端看。📸
        #
        #  ⚠️ 警告：
        #     频繁截图会大量消耗 CPU 和带宽。quality=40 是为了平衡性能。
        # =================================
        try:
            # 🖼️ 截图并压缩
            screenshot = await self.page.screenshot(quality=40, type='jpeg')
            # 🔡 转换为 Base64 字符串
            return base64.b64encode(screenshot).decode()
        except Exception:
            return "" # ❌ 失败返回空字符串

    async def handle_click(self, x_ratio, y_ratio):
        # =================================
        #  🎉 处理点击 (X轴比例，Y轴比例)
        #
        #  🎨 代码用途：
        #     将前端传来的相对坐标转换为浏览器视口的绝对坐标，并执行点击。
        #
        #  💡 易懂解释：
        #     你在屏幕上点哪里，机器人就在浏览器里点哪里。👆
        #
        #  ⚠️ 警告：
        #     无。
        # =================================
        if not self.page: return
        # 📐 计算真实 X 坐标
        real_x = x_ratio * VIEWPORT['width']
        # 📐 计算真实 Y 坐标
        real_y = y_ratio * VIEWPORT['height']
        # 🖱️ 执行点击操作
        await self.page.mouse.click(real_x, real_y)

    async def angt_jump(self, timestamp):
        # =================================
        #  🎉 视频跳转 (时间戳秒)
        #
        #  🎨 代码用途：
        #     注入 JS 代码，控制页面中的 <video> 元素跳转到指定时间。
        #
        #  💡 易懂解释：
        #     快进到指定时间！⏩
        #
        #  ⚠️ 警告：
        #     如果页面没有 video 标签，或者视频未加载，操作会失败。
        # =================================
        if not self.page: return False
        print(f"⏩ Jumping to {timestamp}s")
        # 💉 构造 JavaScript 代码
        js_code = f"""
        (() => {{
            const v = document.querySelector('video'); // 🔍 查找视频元素
            if (v) {{
                v.currentTime = {timestamp}; // ⏱️ 设置当前时间
                v.play(); // ▶️ 播放
                return true; // ✅ 成功
            }}
            return false; // ❌ 失败
        }})()
        """
        # 🏃 在页面中执行 JS
        return await self.page.evaluate(js_code)

    async def angt_drag(self, progress_percent):
        # =================================
        #  🎉 拖动进度条 (百分比)
        #
        #  🎨 代码用途：
        #     根据百分比计算目标时间，并跳转。
        #
        #  💡 易懂解释：
        #     把进度条拖到 50% 的位置。🎞️
        #
        #  ⚠️ 警告：
        #     无。
        # =================================
        if not self.page: return False
        # 💉 构造 JavaScript 代码
        js_code = f"""
        (() => {{
            const v = document.querySelector('video'); // 🔍 查找视频元素
            if (v) {{
                const duration = v.duration || 100; // 📏 获取视频总时长
                v.currentTime = duration * ({progress_percent} / 100); // ⏱️ 计算目标时间
                return true;
            }}
            return false;
        }})()
        """
        # 🏃 在页面中执行 JS
        return await self.page.evaluate(js_code)

    async def jump_to_video(self, timestamp):
        # 🔄 兼容旧接口，调用 angt_jump
        return await self.angt_jump(timestamp)

    async def scan_items(self, on_new_item_callback):
        # =================================
        #  🎉 扫描点位 (回调函数)
        #
        #  🎨 代码用途：
        #     访问搜索页面，抓取前8个结果，分析标题是否包含关键词，并模拟生成点位数据。
        #
        #  💡 易懂解释：
        #     去搜“老六点位”，把搜到的结果一个个念给你听。📢
        #
        #  ⚠️ 警告：
        #     这里包含了一些模拟逻辑（随机时间戳），实际生产环境需要更复杂的页面解析。
        # =================================
        try:
            # 🔗 跳转到搜索页面
            await self.page.goto(TARGET_SEARCH_URL, timeout=60000, wait_until="domcontentloaded")
        except: pass
        
        # 🃏 获取所有搜索结果卡片
        cards = await self.page.locator(".search-result-card, [data-e2e='search_result_card']").all()
        
        count = 0
        # 🔄 遍历前 8 个结果
        for card in cards[:8]:
            try:
                # 📄 获取卡片文本内容
                text_content = await card.inner_text()
                # 💰 记录 AI 输入流量
                global_billing.track_ai(text_content, is_input=True)
                
                # 📑 提取标题（第一行）
                lines = text_content.split('\n')
                title = lines[0] if lines else "未知"
                
                # 🔍 简单的关键词匹配逻辑
                if any(k in title for k in ["老六", "点位", "大坝"]):
                    # ✂️ 生成简短名称
                    clean_name = title[:15].replace("\n", "") + "..."
                    
                    # 🆕 如果是新发现的点位
                    if clean_name not in self.found_spots:
                        self.found_spots.add(clean_name) # ➕ 加入已发现集合
                        ts_seconds = random.randint(10, 120) # 🎲 模拟随机时间戳
                        
                        # 📦 构造点位数据对象
                        item_data = {
                            "name": clean_name,
                            "full_text": title,
                            "time_str": f"{ts_seconds//60:02d}:{ts_seconds%60:02d}",
                            "raw_time": ts_seconds,
                            "url": self.page.url
                        }
                        # 📞 调用回调函数发送数据
                        await on_new_item_callback(item_data)
                        count += 1
                        # ⏸️ 稍微暂停，模拟处理时间
                        await asyncio.sleep(0.5)
            except Exception as e:
                print(f"Scan error: {e}")
        return count