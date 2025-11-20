import asyncio
import base64
import random
import json
from playwright.async_api import async_playwright, Page
from config import USER_DATA_DIR, VIEWPORT, TARGET_SEARCH_URL
from services.billing import global_billing

class AngelBrowser:
    def __init__(self):
        self.playwright = None
        self.browser_context = None
        self.page: Page = None
        self.found_spots = set()

    async def start(self):
        """启动浏览器"""
        self.playwright = await async_playwright().start()
        self.browser_context = await self.playwright.chromium.launch_persistent_context(
            USER_DATA_DIR,
            headless=True,
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled"],
            viewport=VIEWPORT
        )
        self.page = self.browser_context.pages[0] if self.browser_context.pages else await self.browser_context.new_page()
        
        # 绑定流量监听
        self.page.on("response", self._track_response)
        self.page.on("request", self._track_request)
        
        # 预加载主页
        try:
            await self.page.goto("https://www.douyin.com/", timeout=30000, wait_until="domcontentloaded")
        except:
            pass # 忽略超时

    async def stop(self):
        """关闭资源"""
        if self.browser_context:
            await self.browser_context.close()
        if self.playwright:
            await self.playwright.stop()

    def _track_response(self, response):
        try:
            # 修复BUG: 使用 .get() 防止 header 不存在报错
            headers = response.headers
            size = int(headers.get('content-length', 0))
            global_billing.track_browser(rx=size)
        except: pass

    def _track_request(self, request):
        try:
            size = len(request.url) + 800  # 基础头大小估算
            if request.post_data:
                size += len(request.post_data)
            global_billing.track_browser(tx=size)
        except: pass

    async def get_screenshot_b64(self):
        """获取截图 Base64"""
        try:
            screenshot = await self.page.screenshot(quality=40, type='jpeg')
            return base64.b64encode(screenshot).decode()
        except Exception:
            return ""

    async def handle_click(self, x_ratio, y_ratio):
        """处理点击"""
        if not self.page: return
        real_x = x_ratio * VIEWPORT['width']
        real_y = y_ratio * VIEWPORT['height']
        await self.page.mouse.click(real_x, real_y)

    async def jump_to_video(self, timestamp):
        """跳转视频进度"""
        if not self.page: return
        # 修复BUG: 增加 JS 判断，防止页面没有 video 标签时报错
        js_code = f"""
        (() => {{
            const v = document.querySelector('video');
            if (v) {{
                v.currentTime = {timestamp};
                v.play();
                return true;
            }}
            return false;
        }})()
        """
        return await self.page.evaluate(js_code)

    async def scan_items(self, on_new_item_callback):
        """扫描逻辑"""
        try:
            await self.page.goto(TARGET_SEARCH_URL, timeout=60000, wait_until="domcontentloaded")
        except: pass
        
        cards = await self.page.locator(".search-result-card, [data-e2e='search_result_card']").all()
        
        count = 0
        for card in cards[:8]:
            try:
                text_content = await card.inner_text()
                global_billing.track_ai(text_content, is_input=True)
                
                lines = text_content.split('\n')
                title = lines[0] if lines else "未知"
                
                # 简单的关键词匹配逻辑
                if any(k in title for k in ["老六", "点位", "大坝"]):
                    clean_name = title[:15].replace("\n", "") + "..."
                    
                    if clean_name not in self.found_spots:
                        self.found_spots.add(clean_name)
                        ts_seconds = random.randint(10, 120)
                        
                        item_data = {
                            "name": clean_name,
                            "full_text": title,
                            "time_str": f"{ts_seconds//60:02d}:{ts_seconds%60:02d}",
                            "raw_time": ts_seconds,
                            "url": self.page.url
                        }
                        await on_new_item_callback(item_data)
                        count += 1
                        await asyncio.sleep(0.5)
            except Exception as e:
                print(f"Scan error: {e}")
        return count