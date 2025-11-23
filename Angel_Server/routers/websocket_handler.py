import asyncio
import json
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.browser import AngelBrowser
from services.billing import global_billing
from services.storage import save_data, load_data

# =================================
#  🎉 WebSocket 路由处理器 (WebSocket Handler)
#
#  🎨 代码用途：
#     处理所有 WebSocket 连接，负责前后端的实时通信、指令分发和数据推送。
#
#  💡 易懂解释：
#     这是服务器的“接线员”！它专门负责接听前端打来的电话，把前端的命令传给浏览器和 AI，再把结果和画面传回给前端。📞
#
#  ⚠️ 警告：
#     WebSocket 连接是长连接，需要注意异常处理和资源释放，防止内存泄漏。
# =================================

# 🛣️ 创建 API 路由实例
router = APIRouter()

async def send_packet(ws: WebSocket, type_str: str, data: dict = None):
    # =================================
    #  🎉 发送数据包 (WebSocket连接，消息类型，数据内容)
    #
    #  🎨 代码用途：
    #     统一封装并发送 WebSocket 消息，同时自动附带当前的计费统计信息。
    #
    #  💡 易懂解释：
    #     给前端发快递啦！不仅把东西（数据）发过去，还顺便把账单（Token消耗）塞进去，亲兄弟明算账嘛！📦
    #
    #  ⚠️ 警告：
    #     如果 WebSocket 连接已断开，发送会失败，这里捕获了异常但未做重连处理。
    # =================================
    # 📦 构造基础消息体，包含类型和计费报告
    payload = {"type": type_str, "_stats": global_billing.get_report()}
    # ➕ 如果有额外数据，合并到消息体中
    if data:
        payload.update(data)
        # 📊 如果是情报数据，将其内容计入 AI 输出流量（模拟）
        if type_str == "new_intel":
            global_billing.track_ai(json.dumps(data), is_input=False)

    # 📝 将消息体序列化为 JSON 字符串
    json_str = json.dumps(payload)
    # 📡 记录 WebSocket 发送流量
    global_billing.track_ws(tx=len(json_str.encode('utf-8')))
    
    try:
        # 📤 发送文本消息
        await ws.send_text(json_str)
    except:
        pass # 🔇 忽略发送失败（通常是因为连接已断开）

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # =================================
    #  🎉 WebSocket 端点 (WebSocket连接)
    #
    #  🎨 代码用途：
    #     处理客户端的主连接。负责启动浏览器服务、接收前端指令、推送实时画面和分析结果。
    #
    #  💡 易懂解释：
    #     这是服务器的“总机”！电话接通后，一边听前端的指挥（点击、跳转），一边把浏览器的画面直播给前端看，忙得不可开交！🎧
    #
    #  ⚠️ 警告：
    #     这是一个无限循环。除非连接断开或发生致命错误，否则不会退出。
    # =================================
    # 🤝 接受 WebSocket 连接请求
    await websocket.accept()
    
    # 🌐 初始化浏览器服务实例
    browser_service = AngelBrowser()
    # 📥 用于存储接收任务的变量
    receiver_task = None
    
    try:
        # 🚀 启动浏览器服务
        await browser_service.start()
        # 📢 发送启动成功日志
        await send_packet(websocket, "log", {"msg": "✨ Angel 系统已模块化启动！"})

        # 📨 创建异步队列，用于在接收循环和处理循环之间传递消息
        # 🛡️ 安全修复: 设置 maxsize=100 防止内存溢出攻击
        # 如果攻击者发送速度超过处理速度，put() 会阻塞，从而触发 TCP 背压，物理层面上阻止攻击者发送
        queue = asyncio.Queue(maxsize=100)

        # ⏱️ 帧率控制 (FPS)
        # 默认配置
        current_fps = 15
        current_quality = 'high'
        
        # 安全限制
        MAX_FPS = 30
        MIN_FPS = 1

        last_frame_time = 0
        
        # 🛡️ 日志节流: 防止配置更新泛洪导致 DoS
        last_config_log_time = 0
        last_nav_log_time = 0 # 🛡️ 导航日志节流
        last_resize_time = 0 # 🛡️ 调整大小节流

        # 🔗 定义 URL 变更回调
        async def on_url_change(new_url):
            # =================================
            #  🎉 URL 变更回调 (新URL)
            #
            #  🎨 代码用途：
            #     当浏览器 URL 发生变化时，通知前端更新地址栏。
            #
            #  💡 易懂解释：
            #     浏览器换台了，赶紧告诉遥控器显示新频道！📺
            # =================================
            await send_packet(websocket, "url_update", {"url": new_url})

        # 🔄 定义内部接收循环函数
        async def receive_loop():
            # =================================
            #  🎉 接收循环 ()
            #
            #  🎨 代码用途：
            #     持续监听前端发来的消息，并放入队列中等待处理。
            #
            #  💡 易懂解释：
            #     专门有个小耳朵一直在听前端说什么，听到了就记在小本本（队列）上，交给大脑去处理。👂
            #
            #  ⚠️ 警告：
            #     如果连接断开，会抛出 WebSocketDisconnect 异常。
            # =================================
            try:
                while True:
                    # 👂 等待接收前端消息
                    data = await websocket.receive_text()
                    # 📡 记录 WebSocket 接收流量
                    global_billing.track_ws(rx=len(data.encode('utf-8')))
                    # 📝 将解析后的 JSON 数据放入队列
                    await queue.put(json.loads(data))
            except (WebSocketDisconnect, Exception):
                # 🔌 如果连接断开或出错，放入断开连接指令
                await queue.put({"type": "disconnect"})

        # 🏃 启动接收循环任务
        receiver_task = asyncio.create_task(receive_loop())

        # 🔗 注册 URL 回调
        browser_service.set_url_callback(on_url_change)
        
        # 🔄 主处理循环
        while True:
            # 🎮 处理命令
            try:
                # ⏱️ 动态计算超时时间以匹配帧率
                # 这样做的目的是为了不阻塞下面的截图逻辑，保证画面流畅
                frame_interval = 1.0 / current_fps
                # 计算距离下一帧还有多久，至少等待 1ms 避免 CPU 空转
                wait_time = max(0.001, (last_frame_time + frame_interval) - time.time())
                
                command = await asyncio.wait_for(queue.get(), timeout=wait_time)
            except asyncio.TimeoutError:
                # ⏳ 如果超时（没有新命令），则 command 为 None
                command = None

            if command:
                # 🏷️ 获取命令类型
                cmd_type = command.get("type")

                # 🔌 处理断开连接指令
                if cmd_type == "disconnect":
                    break
                
                # ⚙️ 处理配置更新指令 (画质/帧率)
                elif cmd_type == "config_update":
                    should_log = False
                    now = time.time()
                    
                    # 1. 更新画质
                    new_quality = command.get("quality")
                    if new_quality in ['low', 'medium', 'high']:
                        if current_quality != new_quality:
                            current_quality = new_quality
                            should_log = True

                    # 2. 更新帧率 (带安全检查)
                    new_fps = command.get("fps")
                    if new_fps:
                        try:
                            new_fps = int(new_fps)
                            # 🛡️ 安全钳位: 确保 FPS 在 [MIN, MAX] 范围内
                            clamped_fps = max(MIN_FPS, min(new_fps, MAX_FPS))
                            if current_fps != clamped_fps:
                                current_fps = clamped_fps
                                should_log = True
                        except ValueError:
                            pass
                    
                    # 🛡️ 日志节流: 只有在真正变化且距离上次日志超过 1 秒时才发送
                    # 这彻底防御了“每秒切换1000万次”导致的日志泛洪攻击
                    if should_log and (now - last_config_log_time > 1.0):
                        await send_packet(websocket, "log", {
                            "msg": f"⚙️ 配置更新: 画质={current_quality.upper()}, 帧率={current_fps} FPS"
                        })
                        last_config_log_time = now

                # 🌍 处理浏览器导航指令
                elif cmd_type == "browser_navigate":
                    url = command.get("url")
                    now = time.time()
                    
                    # 🛡️ 安全检查: URL 长度限制 (防止缓冲区溢出攻击)
                    if url and len(url) < 2048:
                        # 🛡️ 安全检查: 必须是 http/https 开头 (防止 file:// 等危险协议)
                        if url.startswith("http://") or url.startswith("https://"):
                            # 🛡️ 日志节流: 防止导航泛洪
                            if now - last_nav_log_time > 1.0:
                                await browser_service.page.goto(url)
                                await send_packet(websocket, "log", {"msg": f"🌍 正在前往: {url}"})
                                last_nav_log_time = now
                        else:
                            await send_packet(websocket, "log", {"msg": "⚠️ 仅支持 http/https 协议"})
                    else:
                        pass # 忽略非法 URL

                # 🤖 处理 Agent 分析指令
                elif cmd_type == "agent_analyze":
                    # 📦 延迟导入 Agent 服务，避免循环导入
                    from services.agent import agent_service
                    
                    # 🔗 获取当前页面 URL 和标题
                    current_url = browser_service.page.url
                    title = await browser_service.page.title()
                    
                    await send_packet(websocket, "log", {"msg": "🤖 Gemini 正在分析视频..."})
                    
                    # 🧠 调用 Agent 分析视频
                    result = await agent_service.analyze_video(title, current_url)
                    
                    # 📢 根据分析结果发送不同消息
                    if result.get("error"):
                        await send_packet(websocket, "log", {"msg": f"❌ Agent Error: {result.get('error')}"})
                    elif result.get("found"):
                        await send_packet(websocket, "log", {"msg": f"✅ 分析完成: {result.get('summary')}"})
                        # 💾 发送分析结果给前端保存
                        await send_packet(websocket, "analysis_result", {"result": result})
                    else:
                        await send_packet(websocket, "log", {"msg": f"🤔 分析完成: {result.get('summary')}"})

                # 📏 处理调整窗口大小指令
                elif cmd_type == "browser_resize":
                    now = time.time()
                    # 🛡️ 节流：防止频繁调整大小 (每 0.5 秒最多一次)
                    if now - last_resize_time > 0.5:
                        width = command.get("width", 800)
                        height = command.get("height", 600)
                        
                        # 🛡️ 安全检查：限制分辨率范围，防止内存耗尽或异常
                        # 最小 320x240，最大 2560x1440 (2K)
                        width = max(320, min(width, 2560))
                        height = max(240, min(height, 1440))
                        
                        await browser_service.set_viewport(width, height)
                        last_resize_time = now
                        # await send_packet(websocket, "log", {"msg": f"📏 分辨率已调整为 {width}x{height}"})

                # ⏩ 处理视频跳转指令 (angt)
                elif cmd_type == "video_jump":
                    ts = command.get("timestamp", 0)
                    # 🎯 使用新的 angt_jump 方法
                    success = await browser_service.angt_jump(ts)
                    if success:
                        await send_packet(websocket, "log", {"msg": f"⏩ [Angt] 跳转至 {ts}秒"})
                    else:
                        await send_packet(websocket, "log", {"msg": "⚠️ 跳转失败：未找到视频对象"})

                # 🖱️ 处理视频拖拽指令
                elif cmd_type == "video_drag":
                    progress = command.get("progress", 0)
                    await browser_service.angt_drag(progress)

                # 🚀 处理开始扫描指令
                elif cmd_type == "start_scan":
                    await send_packet(websocket, "log", {"msg": "🚀 开始扫描..."})
                    # 🔙 定义回调函数用于发送发现的数据
                    async def on_item_found(item):
                        # =================================
                        #  🎉 发现新点位回调 (点位数据)
                        #
                        #  🎨 代码用途：
                        #     当扫描到新的点位时，通过 WebSocket 发送给前端。
                        #
                        #  💡 易懂解释：
                        #     找到宝藏啦！赶紧打电话告诉前端，让它显示出来！💎
                        # =================================
                        await send_packet(websocket, "new_intel", {"data": item})
                    
                    # 🕵️ 执行扫描逻辑
                    count = await browser_service.scan_items(on_item_found)
                    msg = f"🎉 扫描完成，发现 {count} 个点位" if count > 0 else "🥺 未发现新点位"
                    await send_packet(websocket, "log", {"msg": msg})

                # 🕰️ 处理旧版跳转指令 (兼容性)
                elif cmd_type == "jump_to":
                    ts = command.get("timestamp", 0)
                    # 兼容性映射：尝试使用 angt_jump
                    await browser_service.angt_jump(ts)
                    await send_packet(websocket, "log", {"msg": f"🕰️ [兼容] 跳转至 {ts}秒"})
            
            # 📸 每一帧都尝试发送截图
            # 优化：增加帧率限制，避免发送过快导致前端卡顿和流量爆炸
            current_time = time.time()
            # 动态计算帧间隔
            frame_interval = 1.0 / current_fps
            
            if current_time - last_frame_time >= frame_interval:
                try:
                    # 🖼️ 获取当前画面截图 (Base64)
                    # 传入当前的画质设置
                    screenshot = await browser_service.get_screenshot_b64(quality_mode=current_quality)
                    if screenshot:
                        # 📤 发送画面更新消息
                        await send_packet(websocket, "frame_update", {"image": screenshot})
                        last_frame_time = current_time
                except Exception as e:
                    print(f"Screenshot Error: {e}")
            else:
                # 如果没到截图时间，且刚刚没有处理命令（即 timeout 唤醒），
                # 则稍微 sleep 一下，避免 CPU 空转。
                # 如果刚刚处理了命令，则不 sleep，立即进入下一次循环以响应新命令。
                if not command:
                    # 计算还需要睡多久
                    sleep_time = frame_interval - (current_time - last_frame_time)
                    if sleep_time > 0:
                        await asyncio.sleep(sleep_time)
    except Exception as e:
        # ❌ 打印全局异常
        print(f"❌ WebSocket Error: {e}")

    finally:
        # 🧹 清理资源
        if receiver_task:
            receiver_task.cancel() # 🛑 取消接收任务
        await browser_service.stop() # 🛑 停止浏览器服务
        print("🛑 连接断开，资源已释放")