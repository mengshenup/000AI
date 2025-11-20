import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.browser import AngelBrowser
from services.billing import global_billing

router = APIRouter()

async def send_packet(ws: WebSocket, type_str: str, data: dict = None):
    """统一发送封装"""
    payload = {"type": type_str, "_stats": global_billing.get_report()}
    if data:
        payload.update(data)
        # 如果是情报数据，计入 AI Output
        if type_str == "new_intel":
            global_billing.track_ai(json.dumps(data), is_input=False)

    json_str = json.dumps(payload)
    # 记录 WS 流量
    global_billing.track_ws(tx=len(json_str.encode('utf-8')))
    
    try:
        await ws.send_text(json_str)
    except:
        pass # 连接可能已断开

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # 初始化浏览器服务
    browser_service = AngelBrowser()
    receiver_task = None
    
    try:
        await browser_service.start()
        await send_packet(websocket, "log", {"msg": "✨ Angel 系统已模块化启动！"})

        queue = asyncio.Queue()

        # 接收循环
        async def receive_loop():
            try:
                while True:
                    data = await websocket.receive_text()
                    global_billing.track_ws(rx=len(data.encode('utf-8')))
                    await queue.put(json.loads(data))
            except (WebSocketDisconnect, Exception):
                await queue.put({"type": "disconnect"})

        receiver_task = asyncio.create_task(receive_loop())

        while True:
            # 处理命令
            try:
                # 优先处理队列命令，但不阻塞截图流
                command = await asyncio.wait_for(queue.get(), timeout=0.05)
            except asyncio.TimeoutError:
                command = None

            if command:
                cmd_type = command.get("type")

                if cmd_type == "disconnect":
                    break
                
                elif cmd_type == "start_scan":
                    await send_packet(websocket, "log", {"msg": "🚀 开始扫描..."})
                    # 定义回调函数用于发送发现的数据
                    async def on_item_found(item):
                        await send_packet(websocket, "new_intel", {"data": item})
                    
                    count = await browser_service.scan_items(on_item_found)
                    msg = f"🎉 扫描完成，发现 {count} 个点位" if count > 0 else "🥺 未发现新点位"
                    await send_packet(websocket, "log", {"msg": msg})

                elif cmd_type == "jump_to":
                    ts = command.get("timestamp", 0)
                    success = await browser_service.jump_to_video(ts)
                    if success:
                        await send_packet(websocket, "log", {"msg": f"🎬 已跳转至 {ts}秒"})
                    else:
                        await send_packet(websocket, "log", {"msg": "⚠️ 跳转失败：未找到视频对象"})

                elif cmd_type == "click":
                    if "x" in command and "y" in command:
                        await browser_service.handle_click(command["x"], command["y"])

            # 每一轮循环都发送一次截图 (保持实时画面)
            b64_img = await browser_service.get_screenshot_b64()
            if b64_img:
                await send_packet(websocket, "frame_update", {"image": f"data:image/jpeg;base64,{b64_img}"})

    except Exception as e:
        print(f"❌ WebSocket Error: {e}")

    finally:
        if receiver_task:
            receiver_task.cancel()
        await browser_service.stop()
        print("🛑 连接断开，资源已释放")