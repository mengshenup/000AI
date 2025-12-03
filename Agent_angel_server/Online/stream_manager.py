import asyncio # ⚡ 异步 I/O
import base64 # 🧬 Base64 编码
import json # 📄 JSON 处理
from fastapi import WebSocket # 🔌 WebSocket 组件
from Eye.screenshot_tool import ScreenshotTool # 👁️ 截图工具
from Body.browser_manager import global_browser_manager # 🌐 全局浏览器管理器
from Energy.cost_tracker import global_cost_tracker # 💰 成本追踪器

class StreamManager:
    # =================================
    #  🎉 流媒体管理器 (无参数)
    #
    #  🎨 代码用途：
    #     负责管理向用户传输实时画面（截图流）。
    #     它从 Eye (ScreenshotTool) 获取图像，通过 Nerve (WebSocket) 发送给用户。
    #
    #  💡 易懂解释：
    #     这是 Angel 的直播间！🎥 它负责把眼睛看到的东西，实时直播给主人看！
    # =================================
    
    def __init__(self):
        self.active_streams = {} # 📺 存储活跃的流会话 {user_id: task}
        self.user_configs = {} # ⚙️ 存储用户配置 {user_id: {'fps': 15, 'quality': 'medium'}}

    def update_config(self, user_id: str, fps: int = None, quality: str = None):
        # =================================
        #  🎉 更新配置 (用户ID, 帧率, 画质)
        #
        #  🎨 代码用途：
        #     动态调整指定用户的直播流参数。
        # =================================
        if user_id not in self.user_configs:
            self.user_configs[user_id] = {'fps': 15, 'quality': 'medium'}
        
        if fps is not None:
            self.user_configs[user_id]['fps'] = max(1, min(60, fps)) # 限制 1-60 FPS
        if quality is not None:
            if quality in ['high', 'medium', 'low']:
                self.user_configs[user_id]['quality'] = quality
        
        print(f"⚙️ [直播] 用户 {user_id} 配置已更新: {self.user_configs[user_id]}")

    async def start_stream(self, user_id: str, websocket: WebSocket):
        # =================================
        #  🎉 开始直播 (用户ID, WebSocket连接)
        #
        #  🎨 代码用途：
        #     启动一个后台任务，持续截取浏览器画面并发送给指定用户。
        #
        #  💡 易懂解释：
        #     灯光！摄像！开拍！🎬 开始给主人直播浏览器画面啦！
        # =================================
        if user_id in self.active_streams:
            self.stop_stream(user_id) # 🛑 停止旧流

        # 创建新的流任务
        task = asyncio.create_task(self._stream_loop(user_id, websocket))
        self.active_streams[user_id] = task
        print(f"📺 用户 {user_id} 的直播流已启动")

    def stop_stream(self, user_id: str):
        # =================================
        #  🎉 停止直播 (用户ID)
        #
        #  🎨 代码用途：
        #     取消并移除指定用户的流任务。
        # =================================
        if user_id in self.active_streams:
            self.active_streams[user_id].cancel()
            del self.active_streams[user_id]
            print(f"🛑 用户 {user_id} 的直播流已停止")

    async def _stream_loop(self, user_id: str, websocket: WebSocket):
        # =================================
        #  🎉 直播循环 (内部方法)
        #
        #  🎨 代码用途：
        #     核心循环：获取 BrowserContext -> 获取 Page -> 截图 -> 发送。
        #     控制帧率以平衡性能。
        # =================================
        print(f"📺 [直播] 用户 {user_id} 的循环已启动")
        try:
            # 发送调试消息给前端
            await websocket.send_text(json.dumps({"type": "debug", "msg": f"直播流循环已启动: {user_id}"}))
            
            while True:
                # 1. 获取用户的会话 (Session)
                # 修正：直接访问 sessions 字典，因为 BrowserManager 没有 get_context 方法
                session = global_browser_manager.sessions.get(user_id)
                if not session:
                    # print(f"⚠️ [Stream] No session for {user_id}")
                    await websocket.send_text(json.dumps({"type": "debug", "msg": "正在等待会话..."}))
                    await asyncio.sleep(1) # 😴 如果没有会话，等待
                    continue

                # 2. 获取当前页面
                page = session.get('page')
                if not page:
                    print(f"⚠️ [直播] 用户 {user_id} 没有页面")
                    await websocket.send_text(json.dumps({"type": "debug", "msg": "会话存在但无页面!"}))
                    await asyncio.sleep(0.5)
                    continue

                # 3. 截图 (使用 Eye 模块)
                # 优先使用 session 中已初始化的 eye 实例，如果没有则新建
                eye = session.get('eye') or ScreenshotTool(page)
                
                # 获取用户配置
                config = self.user_configs.get(user_id, {'fps': 15, 'quality': 'medium'})
                current_quality = config['quality']
                current_fps = config['fps']
                
                # print(f"📸 [Stream] Capturing frame for {user_id}...") # 🛠️ DEBUG: Uncommented
                screenshot_b64 = await eye.capture(quality_mode=current_quality, user_id=user_id)

                if screenshot_b64:
                    # 4. 发送数据 (通过 WebSocket)
                    payload = {
                        "type": "vision", # 修正：匹配 network.js 的 vision 类型
                        "frame": screenshot_b64, # 修正：匹配 network.js 的 frame 字段
                        "_stats": global_cost_tracker.get_report()
                    }
                    await websocket.send_text(json.dumps(payload))
                    
                    # 📊 记录流量
                    global_cost_tracker.track_ws(tx=len(screenshot_b64))
                else:
                    print(f"⚠️ 截图为空 ({user_id})")
                    await websocket.send_text(json.dumps({"type": "debug", "msg": "截图返回为空!"}))

                # 5. 控制帧率
                await asyncio.sleep(1.0 / current_fps)

        except asyncio.CancelledError:
            print(f"🛑 [直播] 用户 {user_id} 的循环已取消")
            pass # 🛑 任务被取消
        except Exception as e:
            print(f"⚠️ 直播流出错 ({user_id}): {e}")
            import traceback
            traceback.print_exc()
            try:
                await websocket.send_text(json.dumps({"type": "debug", "msg": f"直播流错误: {str(e)}"}))
            except: pass
            self.stop_stream(user_id)

# 🌍 全局流管理器实例
global_stream_manager = StreamManager()
