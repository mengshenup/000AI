import asyncio # ⚡ 异步 I/O
import json # 📄 JSON 处理
import time # ⏱️ 时间模块
from fastapi import APIRouter, WebSocket, WebSocketDisconnect # 🔌 WebSocket 组件
from Body.browser_manager import BrowserManager # 🌐 浏览器管理器
from Energy.cost_tracker import global_cost_tracker # 💰 成本追踪器
from Brain.gemini_client import global_gemini # 🧠 Gemini AI 客户端

router = APIRouter() # 🛣️ 创建 WebSocket 路由

# =================================
#  🎉 WebSocket 服务 (无参数)
#
#  🎨 代码用途：
#     作为 Angel 的“神经系统”，负责建立与前端的实时双向通信，协调大脑（Brain）、躯体（Body）、眼睛（Eye）和手（Hand）的协同工作。
#
#  💡 易懂解释：
#     这是 Angel 的神经中枢！⚡ 它像电话线一样，把大脑的指令传给手脚，把眼睛看到的画面传给大脑，还要负责和主人（前端）聊天哦！
#
#  ⚠️ 警告：
#     WebSocket 连接断开时必须确保释放所有资源（如关闭浏览器），否则会导致内存泄漏。
# =================================

async def send_impulse(ws: WebSocket, type_str: str, data: dict = None):
    # =================================
    #  🎉 发送神经冲动 (WebSocket连接，消息类型，数据内容)
    #
    #  🎨 代码用途：
    #     封装 WebSocket 消息发送逻辑，自动附带当前的资源消耗统计信息（_stats），并记录发送流量。
    #
    #  💡 易懂解释：
    #     哔哔！📡 发送信号啦！顺便把账单（资源消耗）也夹在信封里寄出去。
    #
    #  ⚠️ 警告：
    #     如果 WebSocket 连接已关闭，发送操作会失败，此处捕获异常以防止崩溃。
    # =================================
    """发送神经冲动 (数据包)"""
    payload = {"type": type_str, "_stats": global_cost_tracker.get_report()} # 📦 封装数据包
    if data:
        payload.update(data) # ➕ 合并数据
        if type_str == "new_intel":
            global_cost_tracker.track_ai(json.dumps(data), is_input=False) # 📊 记录 AI 输出流量

    json_str = json.dumps(payload) # 📄 序列化为 JSON
    global_cost_tracker.track_ws(tx=len(json_str.encode('utf-8'))) # 📊 记录 WebSocket 发送流量
    
    try:
        await ws.send_text(json_str) # 📤 发送文本消息
    except Exception:
        pass # 🛡️ 忽略发送失败

@router.websocket("/ws")
async def neural_pathway(websocket: WebSocket):
    # =================================
    #  🎉 神经通路 (WebSocket连接)
    #
    #  🎨 代码用途：
    #     WebSocket 主循环，负责生命周期管理：
    #     1. 建立连接并唤醒 BrowserManager。
    #     2. 启动接收循环监听前端指令。
    #     3. 在主循环中处理指令并定时发送视觉帧（截图）。
    #     4. 异常处理与资源释放。
    #
    #  💡 易懂解释：
    #     Angel 的主意识流！🌊 只要连接还在，Angel 就活着。它一边听你的指挥（点击、跳转），一边把看到的画面（截图）实时传给你。
    #
    #  ⚠️ 警告：
    #     这是一个死循环，直到连接断开。必须小心处理 asyncio.wait_for 的超时逻辑，以保证截图帧率的稳定性。
    # =================================
    """神经通路 (WebSocket Endpoint)"""
    await websocket.accept() # 🤝 接受连接
    
    # 唤醒躯体
    browser_mgr = BrowserManager() # 🤖 创建躯体实例
    receiver_task = None # 📥 接收任务句柄
    
    try:
        await browser_mgr.wake_up() # 🌅 唤醒浏览器
        await send_impulse(websocket, "log", {"msg": "✨ Browser System Online!"}) # 📢 发送上线通知

        queue = asyncio.Queue(maxsize=100) # 📨 指令队列
        current_fps = 15 # 🎞️ 默认帧率
        current_quality = 'high' # 💎 默认画质
        last_frame_time = 0 # ⏱️ 上一帧时间戳

        async def sensory_input_loop():
            # =================================
            #  🎉 感觉输入循环 (无参数)
            #
            #  🎨 代码用途：
            #     独立协程，专门负责从 WebSocket 接收数据并放入队列，避免阻塞主循环的发送逻辑。
            #
            #  💡 易懂解释：
            #     这是耳朵！👂 专门听主人说什么，听到了就记在小本本（队列）上，等大脑空了再处理。
            # =================================
            """感觉输入循环"""
            try:
                while True:
                    data = await websocket.receive_text() # 👂 接收消息
                    global_cost_tracker.track_ws(rx=len(data.encode('utf-8'))) # 📊 记录接收流量
                    await queue.put(json.loads(data)) # 📥 入队
            except (WebSocketDisconnect, Exception):
                await queue.put({"type": "disconnect"}) # 🔌 断开连接信号

        receiver_task = asyncio.create_task(sensory_input_loop()) # 🚀 启动接收协程

        while True:
            # 1. 处理指令 (运动神经)
            try:
                frame_interval = 1.0 / current_fps # ⏱️ 计算帧间隔
                # 计算剩余等待时间，保证帧率稳定
                wait_time = max(0.001, (last_frame_time + frame_interval) - time.time())
                command = await asyncio.wait_for(queue.get(), timeout=wait_time) # ⏳ 等待指令或超时
            except asyncio.TimeoutError:
                command = None # ⏰ 超时，无新指令

            if command:
                cmd_type = command.get("type") # 🏷️ 获取指令类型

                if cmd_type == "disconnect":
                    break # 💔 断开连接
                
                elif cmd_type == "config_update":
                    current_quality = command.get("quality", current_quality) # 🎨 更新画质
                    current_fps = int(command.get("fps", current_fps)) # 🎞️ 更新帧率

                elif cmd_type == "browser_navigate":
                    url = command.get("url") # 🔗 获取目标 URL
                    if url and (url.startswith("http") or url.startswith("https")):
                        await browser_mgr.page.goto(url) # 🌏 浏览器跳转
                        await send_impulse(websocket, "log", {"msg": f"🌍 Navigating to: {url}"})

                elif cmd_type == "mouse_click":
                    x = command.get("x", 0) # 📍 获取 X 坐标
                    y = command.get("y", 0) # 📍 获取 Y 坐标
                    await browser_mgr.hand.click(x, y) # 🖱️ 模拟点击

                elif cmd_type == "agent_analyze":
                    # 调用大脑
                    current_url = browser_mgr.page.url
                    title = await browser_mgr.page.title()
                    await send_impulse(websocket, "log", {"msg": "🧠 Gemini is thinking..."}) # 💭 思考中
                    
                    result = await global_gemini.analyze_video(title, current_url) # 🧠 AI 分析
                    
                    if result.get("error"):
                        await send_impulse(websocket, "log", {"msg": f"❌ Brain Error: {result.get('error')}"}) # ❌ 报错
                    else:
                        await send_impulse(websocket, "log", {"msg": f"✅ Analysis: {result.get('summary')}"}) # ✅ 成功
                        await send_impulse(websocket, "analysis_result", {"result": result}) # 📤 发送结果

            # 2. 发送视觉信号 (感觉神经)
            current_time = time.time() # ⏱️ 获取当前时间
            if current_time - last_frame_time >= (1.0 / current_fps): # ⏳ 检查是否达到帧间隔
                try:
                    screenshot = await browser_mgr.eye.capture(quality_mode=current_quality) # 📸 截图
                    if screenshot:
                        await send_impulse(websocket, "frame_update", {"image": screenshot}) # 🖼️ 发送画面
                        last_frame_time = current_time # ⏱️ 更新时间戳
                except Exception:
                    pass

    except WebSocketDisconnect:
        # 🔌 处理连接断开
        print("👋 Neural link severed.") # 👋 神经连接已切断 (客户端关闭)
    except Exception as e:
        # 🚨 处理未捕获的异常
        print(f"❌ System Failure: {e}") # ❌ 系统严重故障
        import traceback # 📜 导入堆栈跟踪
        traceback.print_exc() # 🖨️ 打印详细错误堆栈
    finally:
        # 🧹 清理资源 (无论正常结束还是出错都会执行)
        if receiver_task: 
            receiver_task.cancel() # 🛑 停止接收指令的协程
        await browser_mgr.sleep() # 🛌 让浏览器休眠以释放内存
        print("🛑 Browser sleeping.") # 📢 打印休眠状态
