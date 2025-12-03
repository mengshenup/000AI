# ==========================================================================
#  📃 文件功能 : CDP 高速推流器 (CDPStreamer)
#  ⚡ 逻辑摘要 : 利用 Chrome DevTools Protocol 直接获取 Screencast 帧，实现低延迟、高并发推流。
#  💡 易懂解释 : 这是 Angel 的“量子传输通道”！🚀 不再一张张拍照，而是直接把浏览器的画面信号接过来，速度快得飞起！
#  🔋 未来扩展 : 支持更多 CDP 事件监听。
#  📊 当前状态 : 活跃 (更新: 2025-12-03)
# ==========================================================================
import asyncio
import base64
import json
from fastapi import WebSocket
from Energy.cost_tracker import global_cost_tracker

class CDPStreamer:
    def __init__(self, page):
        self.page = page
        self.session = None
        self.running = False
        self.websocket = None
        self.user_id = None
        self.last_frame_time = 0
        self.target_fps = 30
        # 💾 保存当前参数用于重启
        self._current_quality = 60
        self._current_width = None
        self._current_height = None

    async def start(self, websocket: WebSocket, user_id: str, quality=60, width=None, height=None):
        """启动 CDP Screencast"""
        if self.running: return
        
        self.websocket = websocket
        self.user_id = user_id
        self.running = True
        
        # 保存参数
        self._current_quality = quality
        self._current_width = width
        self._current_height = height
        
        try:
            # 1. 创建 CDP 会话 (如果尚未创建)
            if not self.session:
                self.session = await self.page.context.new_cdp_session(self.page)
                self.session.on("Page.screencastFrame", self._on_screencast_frame)
            
            # 2. 启动 Screencast
            await self._send_start_command()
            print(f"🚀 [CDP] 用户 {user_id} 的高速流已启动 (Q:{quality})")
            
        except Exception as e:
            print(f"❌ [CDP] 启动失败: {e}")
            self.running = False

    async def _send_start_command(self):
        """发送启动指令 (内部复用)"""
        if not self.session: return
        params = {
            "format": "jpeg",
            "quality": self._current_quality,
            "everyNthFrame": 1
        }
        if self._current_width and self._current_height:
            params["maxWidth"] = self._current_width
            params["maxHeight"] = self._current_height
            
        await self.session.send("Page.startScreencast", params)

    async def stop(self):
        """停止 CDP Screencast"""
        if not self.running: return
        self.running = False
        
        try:
            if self.session:
                await self.session.send("Page.stopScreencast")
                # 注意：不 detach，以便复用 session 或保持监听
                self.session.detach() 
                self.session = None
        except Exception as e:
            print(f"⚠️ [CDP] 停止时出错: {e}")
        
        print(f"🛑 [CDP] 用户 {self.user_id} 的高速流已停止")

    def _on_screencast_frame(self, event):
        """处理 CDP 帧事件 (同步回调，需调度到 Loop)"""
        if not self.running: return
        
        # 1. 获取数据
        data = event.get("data") # Base64 string
        metadata = event.get("metadata")
        session_id = event.get("sessionId")
        
        # 2. 确认帧 (必须 Ack，否则 Chrome 会停止发送)
        asyncio.create_task(self._ack_frame(session_id))
        
        # 3. FPS 限流控制
        now = asyncio.get_event_loop().time()
        if now - self.last_frame_time < 1.0 / self.target_fps:
            return # ⏳ 丢弃该帧，保持帧率
        self.last_frame_time = now

        # 4. 发送给前端
        asyncio.create_task(self._send_to_client(data))

    async def _ack_frame(self, session_id):
        try:
            if self.session:
                await self.session.send("Page.screencastFrameAck", {"sessionId": session_id})
        except: pass

    async def _send_to_client(self, frame_data):
        try:
            payload = {
                "type": "vision",
                "frame": frame_data,
                "_stats": global_cost_tracker.get_report()
            }
            await self.websocket.send_text(json.dumps(payload))
            global_cost_tracker.track_ws(tx=len(frame_data))
        except Exception:
            # 连接断开，停止流
            await self.stop()

    async def update_config(self, quality=None, fps=None):
        """动态更新配置 (热切换)"""
        if not self.running or not self.session: return
        
        needs_restart = False
        
        # 更新 FPS (仅影响 Python 端限流，无需重启 CDP)
        if fps is not None:
            self.target_fps = int(fps)
            # print(f"⚙️ [CDP] FPS 目标已更新: {self.target_fps}")

        # 更新画质 (需要重启 CDP Screencast)
        if quality is not None and quality != self._current_quality:
            self._current_quality = int(quality)
            needs_restart = True
            
        if needs_restart:
            # print(f"🔄 [CDP] 正在重启流以应用新画质: {self._current_quality}")
            # 必须先停止再启动才能生效参数
            await self.session.send("Page.stopScreencast")
            await self._send_start_command()
