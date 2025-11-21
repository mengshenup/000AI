import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.browser import AngelBrowser
from services.billing import global_billing
from services.storage import save_data, load_data

# 创建 API 路由实例
router = APIRouter()

async def send_packet(ws: WebSocket, type_str: str, data: dict = None):
    # ---------------------------------------------------------------- #
    #  发送数据包(WebSocket连接, 消息类型, 数据内容)
    #
    #  函数用处：
    #     统一封装并发送 WebSocket 消息，同时自动附带当前的计费统计信息。
    #
    #  易懂解释：
    #     给前端发快递。不仅把东西（数据）发过去，还顺便把账单（Token消耗）塞进去。
    #
    #  警告：
    #     如果 WebSocket 连接已断开，发送会失败，这里捕获了异常但未做重连处理。
    # ---------------------------------------------------------------- #
    # 构造基础消息体，包含类型和计费报告
    payload = {"type": type_str, "_stats": global_billing.get_report()}
    # 如果有额外数据，合并到消息体中
    if data:
        payload.update(data)
        # 如果是情报数据，将其内容计入 AI 输出流量（模拟）
        if type_str == "new_intel":
            global_billing.track_ai(json.dumps(data), is_input=False)

    # 将消息体序列化为 JSON 字符串
    json_str = json.dumps(payload)
    # 记录 WebSocket 发送流量
    global_billing.track_ws(tx=len(json_str.encode('utf-8')))
    
    try:
        # 发送文本消息
        await ws.send_text(json_str)
    except:
        pass # 忽略发送失败（通常是因为连接已断开）

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # ---------------------------------------------------------------- #
    #  WebSocket 端点(WebSocket连接)
    #
    #  函数用处：
    #     处理客户端的主连接。负责启动浏览器服务、接收前端指令、推送实时画面和分析结果。
    #
    #  易懂解释：
    #     这是服务器的“总机”。电话接通后，一边听前端的指挥（点击、跳转），一边把浏览器的画面直播给前端看。
    #
    #  警告：
    #     这是一个无限循环。除非连接断开或发生致命错误，否则不会退出。
    # ---------------------------------------------------------------- #
    # 接受 WebSocket 连接请求
    await websocket.accept()
    
    # 初始化浏览器服务实例
    browser_service = AngelBrowser()
    # 用于存储接收任务的变量
    receiver_task = None
    
    try:
        # 启动浏览器服务
        await browser_service.start()
        # 发送启动成功日志
        await send_packet(websocket, "log", {"msg": "✨ Angel 系统已模块化启动！"})

        # 创建异步队列，用于在接收循环和处理循环之间传递消息
        queue = asyncio.Queue()

        # 定义内部接收循环函数
        async def receive_loop():
            # ---------------------------------------------------------------- #
            #  接收循环()
            #
            #  函数用处：
            #     持续监听前端发来的消息，并放入队列中等待处理。
            # ---------------------------------------------------------------- #
            try:
                while True:
                    # 等待接收前端消息
                    data = await websocket.receive_text()
                    # 记录 WebSocket 接收流量
                    global_billing.track_ws(rx=len(data.encode('utf-8')))
                    # 将解析后的 JSON 数据放入队列
                    await queue.put(json.loads(data))
            except (WebSocketDisconnect, Exception):
                # 如果连接断开或出错，放入断开连接指令
                await queue.put({"type": "disconnect"})

        # 启动接收循环任务
        receiver_task = asyncio.create_task(receive_loop())

        # 主处理循环
        while True:
            # 处理命令
            try:
                # 尝试从队列获取命令，超时时间为 0.05 秒
                # 这样做的目的是为了不阻塞下面的截图逻辑，保证画面流畅
                command = await asyncio.wait_for(queue.get(), timeout=0.05)
            except asyncio.TimeoutError:
                # 如果超时（没有新命令），则 command 为 None
                command = None

            if command:
                # 获取命令类型
                cmd_type = command.get("type")

                # 处理断开连接指令
                if cmd_type == "disconnect":
                    break
                
                # 处理浏览器导航指令
                elif cmd_type == "browser_navigate":
                    url = command.get("url")
                    if url:
                        await browser_service.page.goto(url)
                        await send_packet(websocket, "log", {"msg": f"🌍 正在前往: {url}"})

                # 处理 Agent 分析指令
                elif cmd_type == "agent_analyze":
                    # 延迟导入 Agent 服务，避免循环导入
                    from services.agent import agent_service
                    
                    # 获取当前页面 URL 和标题
                    current_url = browser_service.page.url
                    title = await browser_service.page.title()
                    
                    await send_packet(websocket, "log", {"msg": "🤖 Gemini 正在分析视频..."})
                    
                    # 调用 Agent 分析视频
                    result = await agent_service.analyze_video(title, current_url)
                    
                    # 根据分析结果发送不同消息
                    if result.get("error"):
                        await send_packet(websocket, "log", {"msg": f"❌ Agent Error: {result.get('error')}"})
                    elif result.get("found"):
                        await send_packet(websocket, "log", {"msg": f"✅ 分析完成: {result.get('summary')}"})
                        # 发送分析结果给前端保存
                        await send_packet(websocket, "analysis_result", {"result": result})
                    else:
                        await send_packet(websocket, "log", {"msg": f"🤔 分析完成: {result.get('summary')}"})

                # 处理视频跳转指令 (angt)
                elif cmd_type == "video_jump":
                    ts = command.get("timestamp", 0)
                    # 使用新的 angt_jump 方法
                    success = await browser_service.angt_jump(ts)
                    if success:
                        await send_packet(websocket, "log", {"msg": f"⏩ [Angt] 跳转至 {ts}秒"})
                    else:
                        await send_packet(websocket, "log", {"msg": "⚠️ 跳转失败：未找到视频对象"})

                # 处理视频拖拽指令
                elif cmd_type == "video_drag":
                    progress = command.get("progress", 0)
                    await browser_service.angt_drag(progress)

                # 处理开始扫描指令
                elif cmd_type == "start_scan":
                    await send_packet(websocket, "log", {"msg": "🚀 开始扫描..."})
                    # 定义回调函数用于发送发现的数据
                    async def on_item_found(item):
                        # ---------------------------------------------------------------- #
                        #  发现新点位回调(点位数据)
                        #
                        #  函数用处：
                        #     当扫描到新的点位时，通过 WebSocket 发送给前端。
                        # ---------------------------------------------------------------- #
                        await send_packet(websocket, "new_intel", {"data": item})
                    
                    # 执行扫描逻辑
                    count = await browser_service.scan_items(on_item_found)
                    msg = f"🎉 扫描完成，发现 {count} 个点位" if count > 0 else "🥺 未发现新点位"
                    await send_packet(websocket, "log", {"msg": msg})

                # 处理旧版跳转指令 (兼容性)
                elif cmd_type == "jump_to":
                    ts = command.get("timestamp", 0)
    except Exception as e:
        # 打印全局异常
        print(f"❌ WebSocket Error: {e}")

    finally:
        # 清理资源
        if receiver_task:
            receiver_task.cancel() # 取消接收任务
        await browser_service.stop() # 停止浏览器服务
        print("🛑 连接断开，资源已释放")