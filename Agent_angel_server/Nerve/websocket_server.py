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

from Memory.system_config import VIEWPORT # ⚙️ 导入视口配置

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
    # await global_stream_manager.start_stream(user_id, websocket)
    await send_impulse(websocket, "log", {"msg": f"✨ 会话已就绪: {user_id}!"})

    # 3. 指令处理循环
    try:
        while True:
            data = await websocket.receive_text() # 👂 接收指令
            global_cost_tracker.track_ws(rx=len(data)) # 📊 记录接收流量
            
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                
                # 🛠️ 兼容性修复：支持扁平结构和嵌套 payload 结构
                # 前端 network.js 发送的是扁平结构 {type: '...', data: ...}
                # 💡 易懂解释: 就像拆快递，有时候东西直接在箱子里，有时候在箱子里的盒子里。我们要都找找看！📦
                payload = message.get("payload")
                if not payload:
                    payload = message # 📦 如果没有 payload 字段，则整个消息体就是 payload

                # 🎮 控制指令分发
                if msg_type == "heartbeat":
                    await send_impulse(websocket, "heartbeat_ack")

                elif msg_type == "auth": # 🔑 认证消息处理
                    key = message.get("key") # 📥 提取 API Key
                    if key: # ✅ 如果 Key 存在
                        global_gemini.update_key(key) # 🧠 更新大脑密钥
                        await send_impulse(websocket, "log", {"msg": "🔑 API Key 已通过探索之窗更新"}) # 📢 反馈更新成功
                    
                elif msg_type == "config_update": # ⚙️ 配置更新
                    quality = payload.get("quality")
                    fps = payload.get("fps")
                    global_stream_manager.update_config(user_id, fps=fps, quality=quality)
                    print(f"服务器接收到{user_id}修改质量为{quality}、帧率为{fps}") # 📢 用户要求的特定日志格式
                    await send_impulse(websocket, "log", {"msg": f"⚙️ 画质已更新: {quality}, FPS: {fps}"})

                elif msg_type == "browser_navigate": # 🌍 浏览器导航 (修正匹配前端)
                    url = payload.get("url")
                    print(f"🌍 [调试] 收到导航请求: {url}") # 🛠️ DEBUG
                    if url: 
                        session = await global_browser_manager.get_or_create_session(user_id) # 🎫 获取会话
                        page = session['page'] # 📄 获取页面对象
                        
                        # 🎬 导航时自动开启直播流，确保用户能看到画面
                        # 检查是否已经有流在运行，如果有则不重复启动，避免中断
                        if user_id not in global_stream_manager.active_streams:
                            await global_stream_manager.start_stream(user_id, websocket)
                        
                        # 🚀 异步执行导航，防止阻塞 WebSocket 循环
                        async def safe_navigate(p, u):
                            try:
                                print(f"🚀 [调试] 正在前往 {u}...")
                                await p.goto(u, timeout=30000)
                                print(f"✅ [调试] 导航成功")
                                await send_impulse(websocket, "status", {"msg": f"已到达: {u}"})
                            except Exception as e:
                                print(f"⚠️ 导航失败: {e}")
                                await send_impulse(websocket, "status", {"msg": f"导航失败: {str(e)}"})
                        
                        asyncio.create_task(safe_navigate(page, url))
                        await send_impulse(websocket, "status", {"msg": f"正在前往 {url}..."})

                elif msg_type == "browser_back": # 🔙 后退
                    session = await global_browser_manager.get_or_create_session(user_id)
                    try:
                        await session['page'].go_back()
                        await send_impulse(websocket, "log", {"msg": "🔙 已后退"})
                    except Exception as e:
                        await send_impulse(websocket, "log", {"msg": f"⚠️ 后退失败: {e}"})

                elif msg_type == "browser_forward": # 🔜 前进
                    session = await global_browser_manager.get_or_create_session(user_id)
                    try:
                        await session['page'].go_forward()
                        await send_impulse(websocket, "log", {"msg": "🔜 已前进"})
                    except Exception as e:
                        await send_impulse(websocket, "log", {"msg": f"⚠️ 前进失败: {e}"})

                elif msg_type == "browser_refresh": # 🔄 刷新
                    session = await global_browser_manager.get_or_create_session(user_id)
                    try:
                        await session['page'].reload()
                        await send_impulse(websocket, "log", {"msg": "🔄 已刷新"})
                    except Exception as e:
                        await send_impulse(websocket, "log", {"msg": f"⚠️ 刷新失败: {e}"})

                elif msg_type == "stream_control": # 📺 流控制
                    action = payload.get("action")
                    if action == "start":
                        await global_stream_manager.start_stream(user_id, websocket) # 🎬 开始直播
                    elif action == "stop":
                        global_stream_manager.stop_stream(user_id) # 🛑 停止直播

                elif msg_type == "browser_kill_session": # 💀 强制销毁会话 (新增)
                    print(f"💀 [指令] 收到用户 {user_id} 的会话销毁请求")
                    global_stream_manager.stop_stream(user_id) # 🛑 先停止流
                    await global_browser_manager.close_session(user_id) # 🛑 再关闭浏览器上下文
                    await send_impulse(websocket, "log", {"msg": "💀 浏览器会话已销毁"})

                elif msg_type == "click":
                    x, y = payload.get("x"), payload.get("y")
                    if x is not None and y is not None:
                        session = await global_browser_manager.get_or_create_session(user_id)
                        page = session['page']
                        # 🖱️ 执行点击 (坐标转换: 相对 -> 绝对)
                        # 注意：前端传来的 x, y 是 0-1 的相对坐标
                        actual_x = x * VIEWPORT['width']
                        actual_y = y * VIEWPORT['height']
                        await page.mouse.click(actual_x, actual_y)
                        await send_impulse(websocket, "log", {"msg": f"🖱️ 点击了 ({int(actual_x)}, {int(actual_y)})"})

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
