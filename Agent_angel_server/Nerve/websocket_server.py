import asyncio # ⚡ 异步 I/O
import json # 📄 JSON 处理
import time # ⏱️ 时间模块
import base64 # 🧬 Base64 编码
from fastapi import APIRouter, WebSocket, WebSocketDisconnect # 🔌 WebSocket 组件
from Body.browser_manager import global_browser_manager # 🌐 全局浏览器管理器 (单例)
from Energy.cost_tracker import global_cost_tracker # 💰 成本追踪器
from Brain.gemini_client import global_gemini # 🧠 Gemini AI 客户端

router = APIRouter() # 🛣️ 创建 WebSocket 路由

# =================================
#  🎉 WebSocket 服务 (无参数)
#
#  🎨 代码用途：
#     作为 Angel 的“神经系统”，负责建立与前端的实时双向通信，协调大脑（Brain）、躯体（Body）、眼睛（Eye）和手（Hand）的协同工作。
#     重构版：支持多用户并发，基于 user_id 分配独立的 BrowserContext。
#
#  💡 易懂解释：
#     这是 Angel 的神经中枢！⚡ 它像电话线一样，把大脑的指令传给手脚，把眼睛看到的画面传给大脑，还要负责和主人（前端）聊天哦！
#
#  ⚠️ 警告：
#     WebSocket 连接断开时，只停止“视频流”，不关闭 BrowserContext（除非超时），以便 Agent 继续后台工作。
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
    # =================================
    """发送神经冲动 (数据包)"""
    payload = {"type": type_str, "_stats": global_cost_tracker.get_report()} # 📦 封装数据包
    if data:
        payload.update(data) # ➕ 合并数据
        if type_str == "new_intel":
            global_cost_tracker.track_ai(json.dumps(data), is_input=False) # 📊 记录 AI 输出流量

    try:
        json_str = json.dumps(payload) # 📄 序列化为 JSON
        global_cost_tracker.track_ws(tx=len(json_str.encode('utf-8'))) # 📊 记录 WebSocket 发送流量
        await ws.send_text(json_str) # 📤 发送文本消息
    except Exception:
        pass # 🛡️ 忽略发送失败

@router.websocket("/ws/{user_id}")
async def neural_pathway(websocket: WebSocket, user_id: str):
    # =================================
    #  🎉 神经通路 (WebSocket连接, 用户ID)
    #
    #  🎨 代码用途：
    #     WebSocket 主循环，负责生命周期管理：
    #     1. 建立连接并获取专属 Session (Context)。
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
    
    # 1. 获取专属会话 (Session)
    try:
        session = await global_browser_manager.get_or_create_session(user_id)
        page = session['page']
        hand = session['hand']
        eye = session['eye']
        await send_impulse(websocket, "log", {"msg": f"✨ Session Ready for {user_id}!"})
    except Exception as e:
        await websocket.close(code=1011, reason=f"Init Failed: {str(e)}")
        return

    queue = asyncio.Queue(maxsize=100) # 📨 指令队列
    
    # ⚙️ 动态配置
    config = {
        "fps": 15, # 🎞️ 目标帧率 (默认 15FPS，平衡流畅度与性能)
        "quality": 50, # 💎 JPEG 质量 (默认 50，平衡画质与带宽)
        "scale": 1.0, # 📏 缩放比例 (暂未启用，需 BrowserManager 支持)
        "stream_active": True # 📺 是否推送视频流 (用户离开时可关闭)
    }

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
        except Exception:
            await queue.put(None) # 🛑 发送停止信号

    receiver_task = asyncio.create_task(sensory_input_loop()) # 🚀 启动接收协程

    # =================================
    #  🔄 主循环 (Main Loop)
    # =================================
    try:
        last_frame_time = 0
        last_activity_check = 0
        is_active_mode = False
        
        # 📸 发送初始帧 (Initial Frame)
        try:
            init_bytes = await page.screenshot(format="jpeg", quality=config['quality'], scale="css")
            b64_init = base64.b64encode(init_bytes).decode('utf-8')
            await send_impulse(websocket, "vision", {"frame": b64_init})
        except: pass

        while True:
            # 1. 处理指令 (非阻塞)
            while not queue.empty():
                cmd = await queue.get()
                if cmd is None: raise WebSocketDisconnect() # 🛑 收到停止信号

                type_str = cmd.get('type')
                
                # 🎮 控制指令
                if type_str == 'click':
                    asyncio.create_task(hand.click(cmd['x'], cmd['y']))
                elif type_str == 'move':
                    asyncio.create_task(hand.human_move(cmd['x'] * 1920, cmd['y'] * 1080)) # ⚠️ 需优化：使用真实 Viewport
                elif type_str == 'scroll':
                    asyncio.create_task(hand.scroll(cmd['deltaY']))
                elif type_str == 'navigate':
                    asyncio.create_task(page.goto(cmd['url']))
                
                # 🧠 认知指令
                elif type_str == 'task':
                    # 设定用户目标
                    from Brain.cognitive_system import global_cognitive_system
                    await global_cognitive_system.set_goal(user_id, cmd['goal'])
                    await send_impulse(websocket, "log", {"msg": f"🎯 收到任务: {cmd['goal']}"})

                # ⚙️ 配置指令
                elif type_str == 'config':
                    if 'fps' in cmd: config['fps'] = min(30, max(1, int(cmd['fps'])))
                    if 'quality' in cmd: config['quality'] = min(100, max(10, int(cmd['quality'])))
                    if 'stream' in cmd: config['stream_active'] = bool(cmd['stream'])

            # 2. 智能推流逻辑 (Smart Streaming)
            now = time.time()
            
            # 检查活跃状态 (每 0.1s 检查一次)
            if now - last_activity_check > 0.1:
                # 如果最后操作在 2秒内，视为活跃
                was_active = is_active_mode
                is_active_mode = (now - hand.last_action_time) < 2.0
                
                # 状态切换通知
                if is_active_mode and not was_active:
                    await send_impulse(websocket, "status", {"msg": "⚡ Human-AI Collaboration Active"})
                elif not is_active_mode and was_active:
                    await send_impulse(websocket, "status", {"msg": "💤 Agent Waiting..."})
                
                last_activity_check = now

            # 决定是否推流
            should_stream = config['stream_active'] and is_active_mode
            target_interval = 1.0 / config['fps']
            
            if should_stream and (now - last_frame_time >= target_interval):
                try:
                    # 📸 截图
                    screenshot_bytes = await page.screenshot(
                        format="jpeg",
                        quality=config['quality'],
                        scale="css"
                    )
                    
                    # 🧬 编码并发送
                    b64_data = base64.b64encode(screenshot_bytes).decode('utf-8')
                    await send_impulse(websocket, "vision", {"frame": b64_data})
                    
                    last_frame_time = now
                except Exception as e:
                    print(f"⚠️ Screenshot failed: {e}")

            # 3. 智能休眠 (Yield Control)
            if is_active_mode:
                # 活跃模式：按 FPS 休眠
                elapsed = time.time() - now
                sleep_time = max(0.01, target_interval - elapsed)
                await asyncio.sleep(sleep_time)
            else:
                # 待机模式：低频检查 (0.1s)
                await asyncio.sleep(0.1)

    except (WebSocketDisconnect, Exception) as e:
        print(f"🔌 [神经] 连接断开 ({user_id}): {e}")
    finally:
        if receiver_task: receiver_task.cancel()
        # ⚠️ 注意：这里不关闭 session，因为 Agent 可能还在后台运行
        # 只有当明确收到 "logout" 指令或超时才清理 session (需另外实现 SessionManager 清理策略)
        # await global_browser_manager.close_session(user_id) 
