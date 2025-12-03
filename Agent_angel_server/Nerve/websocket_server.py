import asyncio # ⚡ 异步 I/O
import json # 📄 JSON 处理
import time # ⏱️ 时间模块
import hmac # 🔐 HMAC 签名
import hashlib # 🔐 哈希算法
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query # 🔌 WebSocket 组件
from Body.browser_manager import global_browser_manager # 🌐 全局浏览器管理器 (单例)
from Energy.cost_tracker import global_cost_tracker # 💰 成本追踪器
from Online.stream_manager import global_stream_manager # 📺 导入流媒体管理器
from Brain.gemini_client import global_gemini # 🧠 导入 Gemini 客户端
from Brain.cognitive_system import global_cognitive_system # 🧠 导入认知系统

router = APIRouter() # 🛣️ 创建 WebSocket 路由

# 🔑 密钥配置 (必须与 Web_compute_high 保持一致)
SECRET_KEY = "angel_secret_2025"

# 🛠️ 工具函数：Token 验证
def verify_token(token: str, user_id: str) -> bool:
    # =================================
    #  🎉 验证令牌 (Token字符串, 用户ID)
    #
    #  🎨 代码用途：
    #     验证前端传递的 JWT 或 HMAC 签名 Token 是否合法且未过期。
    #
    #  💡 易懂解释：
    #     查票啦！🎫 看看这张票是不是真的，有没有过期，是不是你本人的。
    # =================================
    
    # 0. 特殊处理：本地开发模式伪 Token
    if token.startswith("local-token-"):
        return True

    try:
        parts = token.split('.')
        if len(parts) != 3: return False
        
        uid, timestamp, signature = parts
        if uid != user_id: return False
        
        # 验证过期 (例如 24小时)
        if time.time() - int(timestamp) > 86400: return False
        
        msg = f"{uid}.{timestamp}"
        expected_signature = hmac.new(
            SECRET_KEY.encode(), 
            msg.encode(), 
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    except:
        return False

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
async def neural_pathway(websocket: WebSocket, user_id: str, token: str = Query(None)):
    # =================================
    #  🎉 神经通路 (WebSocket Endpoint)
    #
    #  🎨 代码用途：
    #     建立 WebSocket 长连接，处理鉴权、会话初始化、指令接收与分发。
    #
    #  💡 易懂解释：
    #     这是 Angel 的神经中枢！⚡ 它像电话线一样，把大脑的指令传给手脚，把眼睛看到的画面传给大脑，还要负责和主人（前端）聊天哦！
    # =================================
    
    # 0. 握手与鉴权
    await websocket.accept() # 🤝 接受连接
    if not token or not verify_token(token, user_id):
        print(f"🚫 用户 {user_id} 鉴权失败")
        await websocket.close(code=4003, reason="Auth Failed")
        return

    print(f"🔗 用户 {user_id} 已连接神经通路")

    # 1. 获取/创建浏览器会话
    try:
        session = await global_browser_manager.get_or_create_session(user_id)
        page = session['page']
        hand = session['hand']
        # eye = session['eye'] # Eye 由 StreamManager 使用
    except Exception as e:
        print(f"❌ 会话初始化失败: {e}", flush=True)
        import traceback
        traceback.print_exc()
        await websocket.close(code=1011, reason="Init Failed")
        return

    # 2. 启动视频流 (由 StreamManager 接管)
    await global_stream_manager.start_stream(user_id, websocket)
    await send_impulse(websocket, "log", {"msg": f"✨ Session Ready for {user_id}!"})

    # 3. 指令处理循环
    try:
        while True:
            data = await websocket.receive_text() # 👂 接收指令
            global_cost_tracker.track_ws(rx=len(data)) # 📊 记录接收流量
            
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                payload = message.get("payload", {})

                # 🎮 控制指令分发
                if msg_type == "heartbeat":
                    await send_impulse(websocket, "heartbeat_ack")

                elif msg_type == "auth": # 🔑 认证消息处理
                    key = message.get("key") # 📥 提取 API Key
                    if key: # ✅ 如果 Key 存在
                        global_gemini.update_key(key) # 🧠 更新大脑密钥
                        await send_impulse(websocket, "log", {"msg": "🔑 API Key Updated via Discovery Window"}) # 📢 反馈更新成功
                    
                elif msg_type == "navigate":
                    url = payload.get("url")
                    # if url: await page.goto(url)
                    await send_impulse(websocket, "status", {"msg": f"Navigated to {url} (Mocked)"})

                elif msg_type == "click":
                    x, y = payload.get("x"), payload.get("y")
                    if x is not None and y is not None:
                        # await page.mouse.click(x, y)
                        # await hand._update_cursor_visual(x, y, click_effect=True)
                        pass

                elif msg_type == "type":
                    text = payload.get("text")
                    # if text: await page.keyboard.type(text)

                elif msg_type == "scroll":
                    delta_y = payload.get("deltaY", 0)
                    # await page.mouse.wheel(0, delta_y)

                elif msg_type == "task": # 🧠 任务指令 (兼容前端 type: 'task')
                    goal = message.get("goal") # 📥 提取目标 (前端直接放在根对象中)
                    if not goal: goal = payload.get("goal") # 🛡️ 兼容 payload 结构
                    
                    if goal:
                        await send_impulse(websocket, "ai_thinking", {"goal": goal}) # 📢 反馈思考状态
                        await global_cognitive_system.set_goal(user_id, goal) # 🧠 设定认知目标，启动思考循环
                    
                elif msg_type == "ai_task": # 🧠 旧版任务指令兼容
                    goal = payload.get("goal")
                    if goal:
                        await send_impulse(websocket, "ai_thinking", {"goal": goal})
                        await global_cognitive_system.set_goal(user_id, goal)

            except json.JSONDecodeError:
                pass # 忽略非 JSON 消息

    except WebSocketDisconnect:
        print(f"🔌 用户 {user_id} 断开连接")
    except Exception as e:
        print(f"💥 神经通路异常: {e}")
    finally:
        # 4. 清理资源
        global_stream_manager.stop_stream(user_id)
        # 注意：不立即关闭浏览器会话，允许后台任务继续运行
        # await global_browser_manager.close_session(user_id)
