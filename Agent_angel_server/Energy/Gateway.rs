/* ==========================================================================
   📃 文件功能 : API 网关
   ⚡ 逻辑摘要 : 处理所有 HTTP 和 WebSocket 请求，分发给相应的模块。
   💡 易懂解释 : 机器人的 "耳朵" 和 "嘴巴"，负责和外界 (前端、Python) 交流。
   🔋 未来扩展 : 添加鉴权中间件 (JWT)。
   📊 当前状态 : 活跃 (更新: 2025-12-06)
   🧱 Energy/Gateway.rs 踩坑记录 (累积，勿覆盖) :
      1. [2025-12-04] [已修复] [WebSocket断连]: 心跳机制缺失导致长连接不稳定。 -> 需前端配合发送 ping。
   ========================================================================== */

// 📦 引入依赖
use axum::{
    extract::{Path, State, ws::{Message, WebSocket, WebSocketUpgrade}},
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use serde::Deserialize;
use crate::app_state::AppState;
use tracing::info;
use futures::{sink::SinkExt, stream::StreamExt};

#[axum::debug_handler]
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(user_id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    // =============================================================================
    //  🎉 WebSocket 握手 (连接，用户ID，状态)
    //
    //  🎨 代码用途:
    //      处理 WebSocket 升级请求，建立长连接。
    //
    //  💡 易懂解释:
    //      "喂，我是用户 X，我要连线！" -> "好的，接通了。"
    //
    //  ⚠️ 警告:
    //      [资源占用]: 每个连接都会占用一个 Tokio 任务。
    //
    //  ⚙️ 触发源:
    //      Through Brain/Main.rs "Route Def" -> ws_handler
    // =============================================================================
    info!("🔌 [Gateway] 新连接请求: {}", user_id); // 📢 连接日志
    ws.on_upgrade(move |socket| handle_socket(socket, user_id, state)) // 🚀 升级协议
}

async fn handle_socket(socket: WebSocket, user_id: String, state: Arc<AppState>) {
    // =============================================================================
    //  🎉 连接处理循环 (Socket，用户ID，状态)
    //
    //  🎨 代码用途:
    //      WebSocket 连接的主循环，处理消息收发。
    //
    //  💡 易懂解释:
    //      保持通话，把听到的记下来，把要说的传过去。
    //
    //  ⚠️ 警告:
    //      [内存泄漏]: 连接断开时必须清理 clients 映射。
    //
    //  ⚙️ 触发源:
    //      Through Energy/Gateway.rs "WS Upgrade" -> handle_socket
    // =============================================================================
    let (mut sender, mut receiver) = socket.split(); // ✂️ 拆分读写流
    
    // Register client
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel(); // 📡 创建消息通道
    state.clients.insert(user_id.clone(), tx); // 📝 注册连接
    info!("✅ [Gateway] 用户 {} 已上线", user_id); // 📢 上线日志

    // Send welcome message
    let _ = sender.send(Message::Text("Connected to Angel Gateway".into())).await; // 📤 发送欢迎语

    // Spawn sender task
    let mut send_task = tokio::spawn(async move { // 🚀 启动发送任务
        while let Some(msg) = rx.recv().await { // 🔄 接收内部消息
            if sender.send(Message::Text(msg.into())).await.is_err() { // 📤 发送给客户端
                break; // ❌ 发送失败，断开
            }
        }
    });

    // Receive loop
    let state_clone = state.clone(); // 🧬 克隆状态
    let uid = user_id.clone(); // 🆔 克隆 ID
    let mut recv_task = tokio::spawn(async move { // 🚀 启动接收任务
        while let Some(Ok(msg)) = receiver.next().await { // 🔄 接收客户端消息
            if let Message::Text(text) = msg { // 📥 文本消息
                // Track traffic
                state_clone.cost_monitor.track_ws(0, text.len()); // 💰 记录流量
                
                // Handle heartbeat or commands
                if text == "ping" { // 💓 心跳检测
                    // Pong handled by sender task if needed, or just ignore
                }
            }
        }
    });

    // Wait for either task to finish
    tokio::select! { // 🚦 等待任务结束
        _ = (&mut send_task) => recv_task.abort(), // 🛑 发送端断开
        _ = (&mut recv_task) => send_task.abort(), // 🛑 接收端断开
    };

    state.clients.remove(&uid); // 🧹 清理连接
    info!("👋 [Gateway] 用户 {} 已下线", uid); // 📢 下线日志
}

#[derive(Deserialize)]
pub struct BroadcastReq {
    pub user_id: String, // 👤 目标用户 ID
    pub message: String, // 💬 广播消息内容
}

pub async fn broadcast_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<BroadcastReq>,
) -> Json<serde_json::Value> {
    // =============================================================================
    //  🎉 广播消息 (状态, 请求)
    //
    //  🎨 代码用途:
    //      内部接口，用于向指定用户发送 WebSocket 消息。
    //
    //  💡 易懂解释:
    //      后台想跟前台说话："告诉用户 X，任务完成了。"
    //
    //  ⚠️ 警告:
    //      [消息丢失]: 如果用户不在线，消息会丢失。
    //
    //  ⚙️ 触发源:
    //      Through Brain/Main.rs "Route Def" -> broadcast_handler
    // =============================================================================
    if let Some(client) = state.clients.get(&req.user_id) { // 🔍 查找用户
        let _ = client.send(req.message.clone()); // 📤 发送消息
        // Track traffic
        state.cost_monitor.track_ws(req.message.len(), 0); // 💰 记录流量
        Json(serde_json::json!({"status": "sent"})) // ✅ 返回成功
    } else {
        Json(serde_json::json!({"status": "offline"})) // ❌ 返回离线
    }
}

#[derive(Deserialize)]
pub struct CostUpdateReq {
    pub kind: String, // 🏷️ 类型 (browser, ws, ai)
    pub tx: Option<usize>, // 📤 发送字节数
    pub rx: Option<usize>, // 📥 接收字节数
    pub input_tokens: Option<u64>, // 📥 输入 Token 数
    pub output_tokens: Option<u64>, // 📤 输出 Token 数
    pub cost_usd: Option<f64>, // 💰 产生费用 (USD)
}

pub async fn cost_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CostUpdateReq>,
) -> Json<serde_json::Value> {
    // =============================================================================
    //  🎉 成本更新 (状态, 请求)
    //
    //  🎨 代码用途:
    //      接收来自 Python 端的成本报告。
    //
    //  💡 易懂解释:
    //      Python 汇报："刚才用了多少流量，花了多少钱。"
    //
    //  ⚠️ 警告:
    //      无。
    //
    //  ⚙️ 触发源:
    //      Through Brain/Main.rs "Route Def" -> cost_handler
    // =============================================================================
    match req.kind.as_str() { // 🚦 匹配类型
        "browser" => { // 🌐 浏览器流量
            state.cost_monitor.track_browser(req.tx.unwrap_or(0), req.rx.unwrap_or(0)); // 🌐 记录浏览器流量
        },
        "ws" => { // 📡 WebSocket 流量
            state.cost_monitor.track_ws(req.tx.unwrap_or(0), req.rx.unwrap_or(0)); // 📡 记录 WebSocket 流量
        },
        "ai" => { // 🧠 AI 成本
            state.cost_monitor.track_ai(
                req.input_tokens.unwrap_or(0),
                req.output_tokens.unwrap_or(0),
                req.cost_usd.unwrap_or(0.0)
            ); // 🧠 记录 AI 成本
        },
        _ => {} // 🤐 忽略其他
    }
    Json(serde_json::json!({"status": "ok"})) // ✅ 返回成功
}

#[derive(Deserialize)]
pub struct CdpStartReq {
    pub user_id: String, // 👤 用户 ID
}

pub async fn cdp_start_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CdpStartReq>,
) -> Json<serde_json::Value> {
    // =============================================================================
    //  🎉 启动 CDP (状态, 请求)
    //
    //  🎨 代码用途:
    //      触发 CDP 视频流推送。
    //
    //  💡 易懂解释:
    //      "开始直播屏幕！"
    //
    //  ⚠️ 警告:
    //      [依赖]: 需要 Chrome 开启远程调试端口 (9222)。
    //
    //  ⚙️ 触发源:
    //      Through Brain/Main.rs "Route Def" -> cdp_start_handler
    // =============================================================================
    info!("🎥 [Gateway] Request to start CDP for {}", req.user_id); // 📢 请求日志
    state.cdp_stream.start(state.clone(), req.user_id.clone()).await; // 🚀 启动 CDP 流
    Json(serde_json::json!({"status": "started"})) // ✅ 返回成功
}

#[derive(Deserialize)]
pub struct CreateTaskReq {
    pub user_id: String, // 👤 用户 ID
    pub description: String, // 📝 任务描述
}

pub async fn create_task_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateTaskReq>,
) -> Json<serde_json::Value> {
    // =============================================================================
    //  🎉 创建任务 (状态, 请求)
    //
    //  🎨 代码用途:
    //      创建新任务。
    //
    //  💡 易懂解释:
    //      "老板下单了：帮我买张票。"
    //
    //  ⚠️ 警告:
    //      无。
    //
    //  ⚙️ 触发源:
    //      Through Brain/Main.rs "Route Def" -> create_task_handler
    // =============================================================================
    state.cognitive.set_goal(req.user_id.clone(), req.description.clone()); // 🎯 设置目标
    Json(serde_json::json!({"status": "created", "user_id": req.user_id})) // ✅ 返回成功
}

#[derive(Deserialize)]
pub struct GetTaskReq {
    pub user_id: String, // 👤 用户 ID
}

pub async fn get_task_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<GetTaskReq>,
) -> Json<serde_json::Value> {
    // =============================================================================
    //  🎉 获取任务 (状态, 请求)
    //
    //  🎨 代码用途:
    //      查询用户的任务状态。
    //
    //  💡 易懂解释:
    //      "我的任务做到哪了？"
    //
    //  ⚠️ 警告:
    //      无。
    //
    //  ⚙️ 触发源:
    //      Through Brain/Main.rs "Route Def" -> get_task_handler
    // =============================================================================
    if let Some(task) = state.cognitive.tasks.get(&req.user_id) {
        Json(serde_json::json!({
            "status": "found",
            "task": {
                "id": task.id,
                "description": task.description,
                "step": task.step,
                "status": format!("{:?}", task.status)
            }
        }))
    } else {
        Json(serde_json::json!({"status": "not_found"}))
    }
}

#[derive(Deserialize)]
pub struct SetKeyReq {
    pub user_id: String, // 👤 用户 ID
    pub api_key: String, // 🔑 API 密钥
}

pub async fn set_key_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SetKeyReq>,
) -> Json<serde_json::Value> {
    // =============================================================================
    //  🎉 设置密钥 (状态, 请求)
    //
    //  🎨 代码用途:
    //      保存用户的 API 密钥。
    //
    //  💡 易懂解释:
    //      "把我的钥匙存起来。"
    //
    //  ⚠️ 警告:
    //      无。
    //
    //  ⚙️ 触发源:
    //      Through Brain/Main.rs "Route Def" -> set_key_handler
    // =============================================================================
    match state.key_manager.set_key(&req.user_id, &req.api_key) {
        Ok(_) => Json(serde_json::json!({"status": "saved"})),
        Err(e) => Json(serde_json::json!({"status": "error", "message": e}))
    }
}

#[derive(Deserialize)]
pub struct GetKeyReq {
    pub user_id: String, // 👤 用户 ID
}

pub async fn get_key_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<GetKeyReq>,
) -> Json<serde_json::Value> {
    // =============================================================================
    //  🎉 获取密钥 (状态, 请求)
    //
    //  🎨 代码用途:
    //      检索用户的 API 密钥。
    //
    //  💡 易懂解释:
    //      "帮我找找我的钥匙。"
    //
    //  ⚠️ 警告:
    //      无。
    //
    //  ⚙️ 触发源:
    //      Through Brain/Main.rs "Route Def" -> get_key_handler
    // =============================================================================
    if let Some(key) = state.key_manager.get_key(&req.user_id) {
        Json(serde_json::json!({"status": "found", "api_key": key}))
    } else {
        Json(serde_json::json!({"status": "not_found"}))
    }
}
