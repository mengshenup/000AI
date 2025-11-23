import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from Memory.system_config import USER_DATA_DIR, VIEWPORT, BROWSER_CHANNEL
from Energy.cost_tracker import global_cost_tracker
from Eye.screenshot_tool import ScreenshotTool
from Hand.mouse_controller import MouseController

class BrowserManager:
    # =================================
    #  🎉 浏览器管理器 (Body/browser_manager.py)
    #
    #  🎨 代码用途：
    #     管理浏览器生命周期，并持有 Eye 和 Hand 实例。
    # =================================
    def __init__(self):
        self.playwright = None
        self.browser_context = None
        self.page = None
        self.eye = None
        self.hand = None

    async def wake_up(self):
        """唤醒躯体 (启动浏览器)"""
        self.playwright = await async_playwright().start()
        
        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
        ]

        # 💾 保存 PID 到文件，用于僵尸进程清理
        try:
            # 注意：launch_persistent_context 返回的 BrowserContext 对象在 Python Playwright 中
            # 并不直接暴露 process.pid。但我们可以通过 browser_context.browser (如果是 launch) 
            # 或者通过 hack 方式获取。
            # 对于 persistent_context，它实际上对应一个浏览器进程。
            # 暂时无法直接获取 PID，但我们可以依靠文件锁机制。
            pass
        except Exception:
            pass

        try:
            if BROWSER_CHANNEL:
                print(f"🚀 [躯体] 正在使用系统浏览器唤醒 ({BROWSER_CHANNEL})...")
                self.browser_context = await self.playwright.chromium.launch_persistent_context(
                    USER_DATA_DIR,
                    headless=True,
                    channel=BROWSER_CHANNEL,
                    args=launch_args,
                    viewport=VIEWPORT
                )
            else:
                print("🚀 [躯体] 正在使用内置 Chromium 唤醒...")
                self.browser_context = await self.playwright.chromium.launch_persistent_context(
                    USER_DATA_DIR,
                    headless=True,
                    args=launch_args,
                    viewport=VIEWPORT
                )
        except Exception as e:
            print(f"❌ [躯体] 唤醒失败: {e}")
            raise e

        self.page = self.browser_context.pages[0] if self.browser_context.pages else await self.browser_context.new_page()
        
        # 初始化器官
        self.eye = ScreenshotTool(self.page)
        self.hand = MouseController(self.page)
        
        # 注入反爬虫 Stealth
        await Stealth().apply_stealth_async(self.page)
        
        # 监听流量
        self.page.on("response", self._track_response)
        self.page.on("request", self._track_request)

    async def sleep(self):
        """休眠 (关闭浏览器)"""
        if self.browser_context:
            await self.browser_context.close()
        if self.playwright:
            await self.playwright.stop()

    def _track_response(self, response):
        try:
            size = int(response.headers.get('content-length', 0))
            global_cost_tracker.track_browser(rx=size)
        except: pass

    def _track_request(self, request):
        try:
            size = len(request.url) + 800
            if request.post_data:
                size += len(request.post_data)
            global_cost_tracker.track_browser(tx=size)
        except: pass
