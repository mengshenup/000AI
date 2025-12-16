/* ==========================================================================
   📃 文件功能 : Rust Core 入口点
   ⚡ 逻辑摘要 : 初始化 Axum 服务器，挂载路由，启动后台任务 (认知系统、成本监控)。
   💡 易懂解释 : 这是整个 Rust 服务器的 "大门" 和 "电源开关"。
   🔋 未来扩展 : 添加更多中间件，支持 HTTPS。
   📊 当前状态 : 活跃 (更新: 2025-12-06)
   🧱 Brain/Main.rs 踩坑记录 (累积，勿覆盖) :
      1. [2025-12-04] [已修复] [循环依赖]: CDPStream 需要 AppState，但 AppState 需要 CDPStream。 -> 使用 Arc 克隆解决。
   ========================================================================== */

use axum::{
    routing::{get, post},
    Router,
};
use dashmap::DashMap;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::info;

// 📦 模块声明
pub mod planner;
use crate::planner::CognitiveSystem;

#[path = "../Body/BodyClient.rs"]
pub mod body_client;

#[path = "../Energy/CostMonitor.rs"]
pub mod cost_monitor;
use crate::cost_monitor::CostMonitor;

#[path = "../Memory/AppState.rs"]
pub mod app_state;
use crate::app_state::AppState;

#[path = "../Memory/DataModels.rs"]
pub mod data_models;

#[path = "../Memory/Config.rs"]
pub mod config;

#[path = "../Memory/KeyManager.rs"]
pub mod key_manager;
use crate::key_manager::KeyManager;

#[path = "../Energy/StreamRelay.rs"]
mod stream_relay;

#[path = "../Energy/Gateway.rs"]
mod gateway;
use crate::gateway::{ws_handler, broadcast_handler, cost_handler, create_task_handler, get_task_handler, set_key_handler, get_key_handler};

#[path = "../Energy/CDPstream.rs"]
pub mod cdp_stream;
use crate::cdp_stream::CDPStream;

#[tokio::main]
async fn main() {
    // =============================================================================
    //  🎉 主函数
    //
    //  🎨 代码用途:
    //      应用程序启动入口。
    //
    //  💡 易懂解释:
    //      这是整个 Rust 服务器的 "大门" 和 "电源开关"。
    //
    //  ⚠️ 警告:
    //      [启动顺序]: 必须先初始化日志。
    //      [密钥管理]: API密钥从RocksDB读取，不再使用.env文件。
    //
    //  ⚙️ 触发源:
    //      Through Command Line "Cargo Run" -> main
    // =============================================================================
    tracing_subscriber::fmt::init(); // 📢 初始化日志

    let cognitive = Arc::new(CognitiveSystem::new()); // 🧠 认知系统
    // Start the background thinking loop
    cognitive.clone().start().await; // 🚀 启动思考

    let cost_monitor = Arc::new(CostMonitor::new()); // 💰 成本监控
    let key_manager = Arc::new(KeyManager::new()); // 🗝️ 密钥管理
    
    // We need to construct AppState first, but CDPStream needs AppState...
    // Circular dependency. 
    // Solution: CDPStream holds a Weak reference or we initialize it later?
    // Or simpler: CDPStream is part of AppState, but its `start` method takes `Arc<AppState>`.
    // Let's make CDPStream hold `Arc<AppState>` but we construct it in 2 steps or use interior mutability.
    // Actually, CDPStream logic is: "Connect to Chrome, read frames, send to Gateway clients".
    // It needs access to `state.clients`.
    
    // Let's use a trick: Create state without CDPStream first (Option), then set it?
    // Or better: Pass `clients` and `cost_monitor` to CDPStream separately?
    // But `clients` is in `AppState`.
    
    // Refactor: CDPStream doesn't need the WHOLE AppState, just clients and cost_monitor.
    // But for simplicity in this context, let's use the `Arc` cycle approach or just pass the components.
    // Since `clients` is `DashMap` (thread safe) and `cost_monitor` is `Arc`, we can clone them.
    
    // Wait, `CDPStream` struct in `CDPstream.rs` takes `Arc<AppState>`.
    // Let's change `CDPStream` to take `clients` and `cost_monitor` directly to avoid cycle.
    // But I already wrote `CDPstream.rs` to take `Arc<AppState>`.
    // I will edit `CDPstream.rs` to fix this circular dependency in the next step.
    // For now, let's assume I will fix it.
    
    // Temporary placeholder for Main.rs logic:
    // We can't easily create the cycle in `main` without `Arc::new_cyclic` or `OnceCell`.
    // Let's modify `CDPstream.rs` to NOT take `AppState` in `new`, but take it in `start`.
    // Yes, `start(state: Arc<AppState>, user_id: String)`.
    
    let cdp_stream = Arc::new(CDPStream::new()); // 📺 CDP流服务
    
    let state = Arc::new(AppState {
        clients: DashMap::new(), // 🔌 连接池
        cognitive, // 🧠 认知系统
        cost_monitor, // 💰 成本监控
        key_manager, // 🗝️ 密钥管理
        cdp_stream: cdp_stream.clone(), // 📺 CDP流服务
    });
    
    // Now we can call start on cdp_stream if needed, passing state.
    // But cdp_stream needs to be triggered by something.
    // The user said: "Automatically start CDP stream when session created".
    // Session creation happens in Python currently? No, Python `Body/Interface.py` handles `/session/init`.
    // Rust `Planner` calls Python.
    // Who calls Rust to start CDP?
    // Maybe Python calls Rust `/internal/cdp/start`?
    // Or Rust `Planner` starts it when it sees a task?
    // The user said: "Now every time a session is created...".
    // If Python creates the session, Python should tell Rust "Session ready, please stream".
    // So we need a new endpoint in Rust: `POST /internal/cdp/start`.
    
    let app = Router::new()
        .route("/ws/{user_id}", get(ws_handler)) // 🛣️ WS路由
        .route("/internal/broadcast", post(broadcast_handler)) // 🛣️ 广播路由
        .route("/internal/cost", post(cost_handler)) // 🛣️ 成本路由
        .route("/internal/cdp/start", post(gateway::cdp_start_handler)) // 🛣️ CDP启动
        .route("/task/create", post(create_task_handler)) // 🛣️ 任务创建
        .route("/task/get", post(get_task_handler)) // 🛣️ 任务查询
        .route("/key/set", post(set_key_handler)) // 🛣️ 密钥设置
        .route("/key/get", post(get_key_handler)) // 🛣️ 密钥获取
        .layer(CorsLayer::permissive()) // 🛡️ CORS策略
        .with_state(state); // 💉 注入状态

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8000)); // 📍 绑定地址
    info!("🚀 [Rust Core] Agent Server 监听中: http://{}", addr); // 📢 启动日志
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap(); // 👂 绑定端口
    axum::serve(listener, app).await.unwrap(); // 🏃 运行服务
}
