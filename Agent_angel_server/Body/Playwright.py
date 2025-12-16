# ==========================================================================
#  📃 文件功能 : Patchright 核心控制器 (反爬虫增强版)
#  ⚡ 逻辑摘要 : 封装 Patchright 浏览器操作，包括鼠标控制、截图、会话管理。
#  💡 易懂解释 : 机器人的 "躯干" 和 "手眼"，负责实际操作浏览器。
#  🔋 未来扩展 : 支持多标签页管理，支持文件上传下载。
#  📊 当前状态 : 活跃 (更新: 2025-12-16)
#  🧱 Body/Playwright.py 踩坑记录 (累积，勿覆盖) :
#     1. [2025-12-04] [已修复] [反爬虫]: 某些网站检测到自动化工具。 -> 引入 playwright-stealth 并禁用 blink-features。
#     2. [2025-12-16] [重构] [Patchright迁移]: 从 Playwright 迁移到 Patchright，获得更强反爬虫能力。
# ==========================================================================

import asyncio
import os
import json
import sys
from patchright.async_api import async_playwright

# 🛠️ 确保能导入 Memory 和 Energy 模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Memory.Config import USER_DATA_DIR, VIEWPORT, BROWSER_CHANNEL, TARGET_SEARCH_URL, PRICING_TABLE
from Energy.Tasks import global_net_cost

# ==========================================================================
#  ✋ Hand Section (Input)
# ==========================================================================

class MouseController:
    # =============================================================================
    #  🎉 鼠标控制器
    #
    #  🎨 代码用途:
    #      模拟鼠标移动和点击，并绘制可视化光标。
    #
    #  💡 易懂解释:
    #      这是我们的虚拟小手，负责在屏幕上点点点！
    #
    #  ⚠️ 警告:
    #      [DOM依赖]: 依赖页面 DOM 注入，如果页面 CSP 严格可能失败。
    #
    #  ⚙️ 触发源:
    #      Through Body/Playwright.py "Session Init" -> MouseController
    # =============================================================================
    def __init__(self, page):
        self.page = page # 📄 页面对象
        self.cursor_id = "angel-ai-cursor" # 🆔 光标元素 ID

    async def _ensure_cursor_visible(self):
        # =============================================================================
        #  🎉 确保光标可见
        #
        #  🎨 代码用途:
        #      在页面中注入光标 DOM 元素。
        #
        #  💡 易懂解释:
        #      把小红点贴纸贴到屏幕上，这样我们就知道手在哪里啦！
        #
        #  ⚠️ 警告:
        #      [状态重置]: 页面刷新后需要重新注入。
        #
        #  ⚙️ 触发源:
        #      Through Body/Playwright.py "Click Action" -> _ensure_cursor_visible
        # =============================================================================
        if not self.page: return # 🛑 页面不存在
        js_code = f"""
        (id) => {{
            if (!document.getElementById(id)) {{
                const cursor = document.createElement('div');
                cursor.id = id;
                cursor.style.position = 'fixed';
                cursor.style.width = '20px';
                cursor.style.height = '20px';
                cursor.style.borderRadius = '50%';
                cursor.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
                cursor.style.border = '2px solid white';
                cursor.style.pointerEvents = 'none';
                cursor.style.zIndex = '999999';
                cursor.style.transition = 'top 0.1s, left 0.1s, transform 0.1s';
                cursor.style.transform = 'translate(-50%, -50%)';
                document.body.appendChild(cursor);
            }}
        }}
        """ # 📜 JS 注入代码
        try: await self.page.evaluate(js_code, self.cursor_id) # 💉 执行 JS
        except: pass # 🤐 忽略错误

    async def _update_cursor_visual(self, x, y, click_effect=False):
        # =============================================================================
        #  🎉 更新光标视觉 (X坐标，Y坐标，点击特效)
        #
        #  🎨 代码用途:
        #      更新光标位置和样式。
        #
        #  💡 易懂解释:
        #      移动小红点，让它跟着鼠标跑！
        #
        #  ⚠️ 警告:
        #      无。
        #
        #  ⚙️ 触发源:
        #      Through Body/Playwright.py "Mouse Move" -> _update_cursor_visual
        # =============================================================================
        if not self.page: return # 🛑 页面不存在
        scale = "scale(0.8)" if click_effect else "scale(1)" # 📏 计算缩放
        color = "rgba(255, 0, 0, 0.8)" if click_effect else "rgba(255, 0, 0, 0.5)" # 🎨 计算颜色
        js_code = f"""
        (params) => {{
            const cursor = document.getElementById(params.id);
            if (cursor) {{
                cursor.style.left = params.x + 'px';
                cursor.style.top = params.y + 'px';
                cursor.style.transform = 'translate(-50%, -50%) {scale}';
                cursor.style.backgroundColor = '{color}';
            }}
        }}
        """ # 📜 JS 更新代码
        try: await self.page.evaluate(js_code, {'id': self.cursor_id, 'x': x, 'y': y}) # 💉 执行 JS
        except: pass # 🤐 忽略错误

    async def click(self, x_ratio, y_ratio):
        # =============================================================================
        #  🎉 点击 (X比例, Y比例)
        #
        #  🎨 代码用途:
        #      执行点击操作。
        #
        #  💡 易懂解释:
        #      用力按下去！点击目标位置！
        #
        #  ⚠️ 警告:
        #      [坐标系]: 坐标是相对比例 (0.0-1.0)。
        #
        #  ⚙️ 触发源:
        #      Through Body/Playwright.py "Action Execution" -> click
        # =============================================================================
        if not self.page: return # 🛑 页面不存在
        target_x = x_ratio * VIEWPORT['width'] # 🎯 计算目标 X
        target_y = y_ratio * VIEWPORT['height'] # 🎯 计算目标 Y
        
        await self._ensure_cursor_visible() # 👁️ 确保光标可见
        await self.page.mouse.move(target_x, target_y, steps=5) # 🖱️ 移动鼠标
        await self._update_cursor_visual(target_x, target_y, click_effect=True) # 🔴 按下特效
        await self.page.mouse.down() # ⬇️ 按下鼠标
        await asyncio.sleep(0.05) # ⏳ 短暂延迟
        await self.page.mouse.up() # ⬆️ 抬起鼠标
        await self._update_cursor_visual(target_x, target_y, click_effect=False) # ⚪ 抬起特效

# ==========================================================================
#  👁️ Eye Section (Vision)
# ==========================================================================

import base64

class ScreenshotTool:
    # =============================================================================
    #  🎉 截图工具
    #
    #  🎨 代码用途:
    #      捕获页面截图并转换为 Base64。
    #
    #  💡 易懂解释:
    #      这是我们的眼睛，负责把屏幕上的画面拍下来！
    #
    #  ⚠️ 警告:
    #      [性能影响]: 截图质量影响 AI 识别准确率和 Token 消耗。
    #
    #  ⚙️ 触发源:
    #      Through Body/Playwright.py "Session Init" -> ScreenshotTool
    # =============================================================================
    def __init__(self, page):
        self.page = page # 📄 页面对象

    async def capture(self, quality=50):
        # =============================================================================
        #  🎉 截图 (质量)
        #
        #  🎨 代码用途:
        #      截图。
        #
        #  💡 易懂解释:
        #      咔嚓！拍一张照片发给大脑！
        #
        #  ⚠️ 警告:
        #      [失败处理]: 返回空字符串表示失败。
        #
        #  ⚙️ 触发源:
        #      Through Body/Playwright.py "Observation" -> capture
        # =============================================================================
        if not self.page: return "" # 🛑 页面不存在
        try:
            screenshot_bytes = await self.page.screenshot(type='jpeg', quality=quality) # 📸 截图
            return base64.b64encode(screenshot_bytes).decode('utf-8') # 📦 转 Base64
        except: return "" # 🤐 忽略错误

# ==========================================================================
#  🧠 Browser Manager (The Core)
# ==========================================================================

# Patchright 已内置反检测功能，无需额外的 stealth 插件
# Patchright 自动修复了 Runtime.enable Leak 等检测点

class BrowserManager:
    # =============================================================================
    #  🎉 浏览器管理器
    #
    #  🎨 代码用途:
    #      单例模式管理 Playwright 实例和多用户会话。
    #
    #  💡 易懂解释:
    #      这是网吧老板，负责管理所有的浏览器窗口和用户！
    #
    #  ⚠️ 警告:
    #      [并发安全]: 全局单例，注意线程安全 (使用 asyncio.Lock)。
    #
    #  ⚙️ 触发源:
    #      Through Body/Playwright.py "Global Init" -> BrowserManager
    # =============================================================================
    _instance = None # 🔒 单例实例

    def __new__(cls):
        if cls._instance is None: # 🚦 检查实例
            cls._instance = super(BrowserManager, cls).__new__(cls) # 🏗️ 创建实例
            cls._instance.initialized = False # 🚩 标记未初始化
        return cls._instance # 🔙 返回实例

    def __init__(self):
        if self.initialized: return # 🛑 防止重复初始化
        self.initialized = True # 🚩 标记已初始化
        self.playwright = None # 🎭 Playwright 实例
        self.browser = None # 🌐 浏览器实例
        self.sessions = {} # {user_id: {context, page, eye, hand, cdp}} # 🗂️ 会话存储
        self.lock = asyncio.Lock() # 🔒 异步锁

    async def start_global_browser(self):
        # =============================================================================
        #  🎉 启动全局浏览器()
        #
        #  🎨 代码用途:
        #      启动全局浏览器实例。
        #
        #  💡 易懂解释:
        #      启动浏览器引擎，准备开始工作啦！
        #
        #  ⚠️ 警告:
        #      [端口占用]: 开启了远程调试端口 9222，用于 CDP 连接。
        #
        #  ⚙️ 触发源:
        #      Through Body/Playwright.py "Lazy Load" -> start_global_browser
        # =============================================================================
        async with self.lock: # 🔒 加锁
            if self.browser: return # 🛑 已启动
            print("🚀 [Playwright] 启动浏览器引擎...") # 📢 打印日志
            self.playwright = await async_playwright().start() # 🎭 启动 Playwright
            # 🎯 Patchright 优化的启动参数
            # Patchright 已自动处理大部分反检测，保持参数简洁
            launch_args = [
                "--remote-debugging-port=9222", # 🔌 开启远程调试 (CDP 需要)
                "--disable-gpu", # 🚫 禁用 GPU (服务器环境)
                "--disable-dev-shm-usage", # 🚫 禁用 /dev/shm (Docker 兼容)
                "--no-sandbox", # 🚫 禁用沙箱 (Docker 兼容)
                # Patchright 已自动隐藏 AutomationControlled，无需手动禁用
                "--disable-extensions", # 🚫 禁用扩展 (加速启动)
                "--disable-background-networking", # 🚫 禁用后台网络 (加速启动)
                "--disable-default-apps", # 🚫 禁用默认应用 (加速启动)
                "--disable-sync", # 🚫 禁用同步 (加速启动)
                "--disable-translate", # 🚫 禁用翻译 (加速启动)
                "--metrics-recording-only", # 📊 仅记录指标 (加速启动)
                "--mute-audio", # 🔇 静音 (加速启动)
                "--no-first-run", # 🚫 跳过首次运行 (加速启动)
                "--disable-background-timer-throttling", # 🚫 禁用后台定时器限制
                "--disable-backgrounding-occluded-windows", # 🚫 禁用后台窗口
                "--disable-renderer-backgrounding", # 🚫 禁用渲染器后台
            ] # 🚀 启动参数 (已优化启动速度 + Patchright 反检测)
            self.browser = await self.playwright.chromium.launch(
                headless=True, # 👻 无头模式
                args=launch_args, # ⚙️ 参数
                channel=BROWSER_CHANNEL, # 📺 浏览器通道 (推荐使用 "chrome" 而非 "chromium")
                # Patchright 已自动处理 automation 标志，无需手动忽略
                timeout=30000 # ⏱️ 启动超时30秒
            ) # 🌐 启动浏览器 (Patchright 增强版)

    async def get_or_create_session(self, user_id: str):
        # =============================================================================
        #  🎉 获取或创建会话 (用户ID)
        #
        #  🎨 代码用途:
        #      获取或创建用户会话。
        #
        #  💡 易懂解释:
        #      给新来的朋友开一台电脑，准备好环境！
        #
        #  ⚠️ 警告:
        #      [状态加载]: 会加载用户的 storage_state (Cookies 等)。
        #
        #  ⚙️ 触发源:
        #      Through Brain/Main.py "User Request" -> get_or_create_session
        # =============================================================================
        if not self.browser: # 🚦 检查浏览器
            await self.start_global_browser() # 🚀 启动浏览器

        if user_id in self.sessions: # 🚦 检查会话
            return self.sessions[user_id] # 🔙 返回现有会话

        print(f"🆕 [Playwright] 创建会话: {user_id}") # 📢 打印日志
        user_dir = os.path.join(USER_DATA_DIR, user_id) # 📂 用户目录
        os.makedirs(user_dir, exist_ok=True) # 📁 创建目录
        state_path = os.path.join(user_dir, "state.json") # 📄 状态文件路径
        storage_state = state_path if os.path.exists(state_path) else None # 💾 加载状态

        context = await self.browser.new_context(
            viewport=VIEWPORT, # 📏 视口大小
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", # 🕵️ UA
            locale="zh-CN", # 🇨🇳 语言
            storage_state=storage_state # 💾 状态
        ) # 🌐 创建上下文

        page = await context.new_page() # 📄 创建页面
        
        # ✅ Patchright 已自动隐藏 webdriver 和其他自动化特征
        # 无需手动注入脚本或使用 stealth 插件
        
        # 🚀 优化：不立即访问URL，等待用户第一次导航
        # 这样可以大幅减少启动时间
        # try: await page.goto(TARGET_SEARCH_URL, timeout=15000) # 🔗 访问目标 URL
        # except: pass # 🤐 忽略错误

        # 📡 流量监听
        page.on("response", lambda r: global_net_cost.track_browser(rx=int(r.headers.get('content-length', 0) or 0))) # 📥 监听响应流量
        page.on("request", lambda r: global_net_cost.track_browser(tx=len(r.url))) # 📤 监听请求流量

        # 💾 自动保存
        async def save_state():
            try: await context.storage_state(path=state_path) # 💾 保存状态
            except: pass # 🤐 忽略错误
        page.on("close", lambda: asyncio.create_task(save_state())) # 🚪 页面关闭时保存

        # CDP Streamer is now handled by Rust
        # We just need to ensure the browser is running with remote debugging (done in launch args)

        session = {
            "context": context, # 🌐 上下文
            "page": page, # 📄 页面
            "eye": ScreenshotTool(page), # 👁️ 截图工具
            "hand": MouseController(page), # ✋ 鼠标控制器
            "save_state": save_state # 💾 保存函数
        } # 📦 会话对象
        self.sessions[user_id] = session # 🗂️ 存储会话
        return session # 🔙 返回会话

    async def close_session(self, user_id: str):
        # =============================================================================
        #  🎉 关闭会话 (用户ID)
        #
        #  🎨 代码用途:
        #      关闭用户会话并保存状态。
        #
        #  💡 易懂解释:
        #      下机！把电脑关掉，记得保存进度哦！
        #
        #  ⚠️ 警告:
        #      无。
        #
        #  ⚙️ 触发源:
        #      Through Brain/Main.py "Cleanup" -> close_session
        # =============================================================================
        if user_id in self.sessions: # 🚦 检查会话
            session = self.sessions.pop(user_id) # 🗑️ 移除会话
            await session["save_state"]() # 💾 保存状态
            await session["context"].close() # 🚪 关闭上下文
            print(f"👋 [Playwright] 会话关闭: {user_id}") # 📢 打印日志

angel_browser = BrowserManager()
