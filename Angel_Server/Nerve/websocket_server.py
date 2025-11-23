import asyncio
import json
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from Body.browser_manager import BrowserManager
from Energy.cost_tracker import global_cost_tracker
from Brain.gemini_client import global_gemini

router = APIRouter()

# =================================
#  🎉 WebSocket 服务 (Nerve/websocket_server.py)
#
#  🎨 代码用途：
#     处理 WebSocket 连接，连接大脑、躯体和外界。
# =================================

async def send_impulse(ws: WebSocket, type_str: str, data: dict = None):
    """发送神经冲动 (数据包)"""
    payload = {"type": type_str, "_stats": global_cost_tracker.get_report()}
    if data:
        payload.update(data)
        if type_str == "new_intel":
            global_cost_tracker.track_ai(json.dumps(data), is_input=False)

    json_str = json.dumps(payload)
    global_cost_tracker.track_ws(tx=len(json_str.encode('utf-8')))
    
    try:
        await ws.send_text(json_str)
    except Exception:
        pass

@router.websocket("/ws")
async def neural_pathway(websocket: WebSocket):
    """神经通路 (WebSocket Endpoint)"""
    await websocket.accept()
    
    # 唤醒躯体
    browser_mgr = BrowserManager()
    receiver_task = None
    
    try:
        await browser_mgr.wake_up()
        await send_impulse(websocket, "log", {"msg": "✨ Browser System Online!"})

        queue = asyncio.Queue(maxsize=100)
        current_fps = 15
        current_quality = 'high'
        last_frame_time = 0

        async def sensory_input_loop():
            """感觉输入循环"""
            try:
                while True:
                    data = await websocket.receive_text()
                    global_cost_tracker.track_ws(rx=len(data.encode('utf-8')))
                    await queue.put(json.loads(data))
            except (WebSocketDisconnect, Exception):
                await queue.put({"type": "disconnect"})

        receiver_task = asyncio.create_task(sensory_input_loop())

        while True:
            # 1. 处理指令 (运动神经)
            try:
                frame_interval = 1.0 / current_fps
                wait_time = max(0.001, (last_frame_time + frame_interval) - time.time())
                command = await asyncio.wait_for(queue.get(), timeout=wait_time)
            except asyncio.TimeoutError:
                command = None

            if command:
                cmd_type = command.get("type")

                if cmd_type == "disconnect":
                    break
                
                elif cmd_type == "config_update":
                    current_quality = command.get("quality", current_quality)
                    current_fps = int(command.get("fps", current_fps))

                elif cmd_type == "browser_navigate":
                    url = command.get("url")
                    if url and (url.startswith("http") or url.startswith("https")):
                        await browser_mgr.page.goto(url)
                        await send_impulse(websocket, "log", {"msg": f"🌍 Navigating to: {url}"})

                elif cmd_type == "mouse_click":
                    x = command.get("x", 0)
                    y = command.get("y", 0)
                    await browser_mgr.hand.click(x, y)

                elif cmd_type == "agent_analyze":
                    # 调用大脑
                    current_url = browser_mgr.page.url
                    title = await browser_mgr.page.title()
                    await send_impulse(websocket, "log", {"msg": "🧠 Gemini is thinking..."})
                    
                    result = await global_gemini.analyze_video(title, current_url)
                    
                    if result.get("error"):
                        await send_impulse(websocket, "log", {"msg": f"❌ Brain Error: {result.get('error')}"})
                    else:
                        await send_impulse(websocket, "log", {"msg": f"✅ Analysis: {result.get('summary')}"})
                        await send_impulse(websocket, "analysis_result", {"result": result})

            # 2. 发送视觉信号 (感觉神经)
            current_time = time.time()
            if current_time - last_frame_time >= (1.0 / current_fps):
                try:
                    screenshot = await browser_mgr.eye.capture(quality_mode=current_quality)
                    if screenshot:
                        await send_impulse(websocket, "frame_update", {"image": screenshot})
                        last_frame_time = current_time
                except Exception:
                    pass

    except WebSocketDisconnect:
        print("👋 Neural link severed.")
    except Exception as e:
        print(f"❌ System Failure: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if receiver_task: receiver_task.cancel()
        await browser_mgr.sleep()
        print("🛑 Browser sleeping.")
