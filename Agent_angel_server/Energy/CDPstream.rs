/* ==========================================================================
   📃 文件功能 : CDP 视频流服务
   ⚡ 逻辑摘要 : 连接 Chrome DevTools Protocol，捕获屏幕并广播给前端。
   💡 易懂解释 : 这是一个 "直播推流器"，把浏览器画面实时传给用户。
   🔋 未来扩展 : 支持调整帧率和画质，支持音频流。
   📊 当前状态 : 活跃 (更新: 2025-12-06)
   🧱 Energy/CDPstream.rs 踩坑记录 (累积，勿覆盖) :
      1. [2025-12-04] [已修复] [连接失败]: 无法自动发现 Chrome WebSocket URL。 -> 增加了重试机制。
   ========================================================================== */

// 📦 引入依赖
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures::{StreamExt, SinkExt};
use serde_json::json;
use crate::app_state::AppState;
use tracing::{info, error};

pub struct CDPStream {
    // =============================================================================
    //  🎉 CDP 流媒体
    //
    //  🎨 代码用途:
    //      管理 CDP 连接和视频流推送任务。
    //
    //  💡 易懂解释:
    //      直播间管理员，负责连线和推流。
    //
    //  ⚠️ 警告:
    //      [循环引用]: 不持有 AppState，start 时传入。
    //
    //  ⚙️ 触发源:
    //      Through Brain/Main.rs "System Init" -> CDPStream
    // =============================================================================
    running: Arc<Mutex<bool>>, // 🚦 运行状态锁
}

impl CDPStream {
    pub fn new() -> Self {
        // =============================================================================
        //  🎉 构造函数
        //
        //  🎨 代码用途:
        //      创建 CDPStream 实例。
        //
        //  💡 易懂解释:
        //      准备好直播设备。
        //
        //  ⚠️ 警告:
        //      无。
        //
        //  ⚙️ 触发源:
        //      Through Brain/Main.rs "System Init" -> new
        // =============================================================================
        Self {
            running: Arc::new(Mutex::new(false)), // 🚦 初始化状态
        }
    }

    pub async fn start(&self, state: Arc<AppState>, user_id: String) {
        // =============================================================================
        //  🎉 启动推流 (状态，用户ID)
        //
        //  🎨 代码用途:
        //      启动视频流推送任务。
        //      1. 查找 Chrome 调试端口。
        //      2. 连接 WebSocket。
        //      3. 开启 Screencast。
        //      4. 转发帧数据到前端。
        //
        //  💡 易懂解释:
        //      "开播了！" 连上浏览器，把画面一帧帧发给观众。
        //
        //  ⚠️ 警告:
        //      [依赖]: 如果 Chrome 未启动或未开启 --remote-debugging-port=9222，会失败。
        //
        //  ⚙️ 触发源:
        //      Through Energy/Gateway.rs "WS Upgrade" -> start
        // =============================================================================
        let running = self.running.clone(); // 🧬 克隆锁引用
        let mut lock = running.lock().await; // 🔒 获取锁
        if *lock { // 🚦 检查是否已运行
            return; // 🚫 已经在运行
        }
        *lock = true; // 🚩 标记运行中
        drop(lock); // 🔓 释放锁

        tokio::spawn(async move { // 🚀 启动异步任务
            info!("🎥 [CDP] Starting stream for {}", user_id); // 📢 启动日志
            
            // 1. Find the browser page WebSocket URL
            let debugger_url = "http://127.0.0.1:9222/json"; // 🔗 调试接口 URL
            let client = reqwest::Client::new(); // 🔌 HTTP 客户端
            
            let mut ws_url = String::new(); // 🔗 WebSocket URL
            
            // Retry loop to find browser
            for _ in 0..10 { // 🔄 重试 10 次
                if let Ok(resp) = client.get(debugger_url).send().await { // 📥 获取页面列表
                    if let Ok(pages) = resp.json::<serde_json::Value>().await { // 📦 解析 JSON
                        if let Some(arr) = pages.as_array() { // 🔍 遍历数组
                            for page in arr { // 🔄 遍历页面
                                if let Some(url) = page["webSocketDebuggerUrl"].as_str() { // 🔍 查找 WS URL
                                    // Prefer pages that are not extensions
                                    if let Some(ty) = page["type"].as_str() { // 🔍 检查类型
                                        if ty == "page" { // 🎯 只要普通页面
                                            ws_url = url.to_string(); // 📝 记录 URL
                                            break; // 🛑 找到即停
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if !ws_url.is_empty() { break; } // 🛑 找到即停
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await; // 💤 等待 0.5 秒
            }

            if ws_url.is_empty() { // 🚦 检查是否找到
                error!("❌ [CDP] Could not find Chrome WebSocket URL"); // 🚨 报错
                *running.lock().await = false; // 🛑 重置状态
                return; // 🛑 退出
            }

            // 2. Connect to CDP
            info!("🔗 [CDP] Connecting to {}", ws_url); // 📢 连接日志
            let (ws_stream, _) = match connect_async(&ws_url).await { // 🔌 建立 WebSocket 连接
                Ok(s) => s, // ✅ 连接成功
                Err(e) => { // ❌ 连接失败
                    error!("❌ [CDP] Connection failed: {}", e); // 🚨 连接失败
                    *running.lock().await = false; // 🛑 重置状态
                    return; // 🛑 退出
                }
            };

            let (mut write, mut read) = ws_stream.split(); // ✂️ 拆分读写流

            // 3. Enable Screencast
            let cmd = json!({
                "id": 1,
                "method": "Page.startScreencast",
                "params": {
                    "format": "jpeg",
                    "quality": 60,
                    "maxWidth": 1280,
                    "maxHeight": 720,
                    "everyNthFrame": 1
                }
            }); // 📦 构造启动命令
            
            if let Err(e) = write.send(Message::Text(cmd.to_string())).await { // 📤 发送命令
                error!("❌ [CDP] Failed to send start command: {}", e); // 🚨 发送失败
                *running.lock().await = false; // 🛑 重置状态
                return; // 🛑 退出
            }

            // 4. Stream Loop
            while let Some(msg) = read.next().await { // 🔄 读取消息循环
                match msg { // 🚦 匹配消息类型
                    Ok(Message::Text(text)) => { // 📥 收到文本消息
                        if let Ok(event) = serde_json::from_str::<serde_json::Value>(&text) { // 📦 解析 JSON
                            if event["method"] == "Page.screencastFrame" { // 🎯 检查是否为帧事件
                                let params = &event["params"]; // 🔍 获取参数
                                let session_id = params["sessionId"].as_i64().unwrap_or(0); // 🆔 获取会话 ID
                                let data = params["data"].as_str().unwrap_or(""); // 🖼️ 获取图像数据
                                let timestamp = params["metadata"]["timestamp"].as_f64().unwrap_or(0.0); // ⏱️ 获取时间戳

                                // Ack the frame
                                let ack = json!({
                                    "id": session_id, // ID is arbitrary for commands, but for Ack we need sessionId in params
                                    "method": "Page.screencastFrameAck",
                                    "params": {
                                        "sessionId": session_id
                                    }
                                }); // 📦 构造确认消息
                                let _ = write.send(Message::Text(ack.to_string())).await; // 📤 发送确认

                                // Broadcast to Frontend via Gateway
                                // Construct the message expected by frontend
                                let payload = json!({
                                    "type": "vision",
                                    "frame": data,
                                    "timestamp": timestamp
                                }); // 📦 构造前端消息
                                
                                // Send to specific user
                                if let Some(tx) = state.clients.get(&user_id) { // 🔍 查找用户连接
                                    let _ = tx.send(payload.to_string()); // 📤 发送消息
                                    // Track traffic (approx)
                                    state.cost_monitor.track_ws(payload.to_string().len(), 0); // 🧾 记录流量
                                }
                            }
                        }
                    }
                    Ok(_) => {}, // 🤐 忽略其他消息
                    Err(e) => { // ❌ 发生错误
                        error!("❌ [CDP] Stream error: {}", e); // 🚨 流错误
                        break; // 🛑 退出循环
                    }
                }
                
                if !*running.lock().await { // 🚦 检查是否停止
                    break; // 🛑 退出循环
                }
            }
            
            info!("🛑 [CDP] Stream stopped"); // 📢 停止日志
            *running.lock().await = false; // 🛑 重置状态
        });
    }
    
    pub async fn stop(&self) {
        // =============================================================================
        //  🎉 停止推流()
        //
        //  🎨 代码用途:
        //      停止视频流推送。
        //
        //  💡 易懂解释:
        //      "下播了。"
        //
        //  ⚠️ 警告:
        //      无。
        //
        //  ⚙️ 触发源:
        //      Through Energy/Gateway.rs "WS Close" -> stop
        // =============================================================================
        let mut lock = self.running.lock().await; // 🔒 获取锁
        *lock = false; // 🛑 设置停止标志
    }
}
