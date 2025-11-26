// =================================
//  🎉 静态文件服务器 (Static File Server)
//
//  🎨 代码用途：
//     使用 Axum 框架提供静态文件服务，替代 Python 的 http.server。
//     监听 5500 端口，服务当前目录下的所有文件。
//
//  💡 易懂解释：
//     这是新的管家！他比以前的 Python 管家更强壮、更快速。
//     他站在门口（端口 5500），谁来要照片或网页，他都能飞快地递给他们！
//
//  ⚠️ 警告：
//     请确保运行目录下有 index.html 或其他静态资源。
//     默认监听 0.0.0.0，允许局域网访问。
// =================================

use axum::{
    Router,
    http::Method,
};
use tower_http::{
    services::ServeDir,
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // 1. 初始化日志系统
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "server=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 2. 配置 CORS (允许跨域)
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    // 3. 构建路由
    // ServeDir::new(".") 表示服务当前工作目录
    let app = Router::new()
        .fallback_service(ServeDir::new("."))
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    // 4. 绑定端口
    let addr = SocketAddr::from(([0, 0, 0, 0], 5500));
    println!("========================================================");
    println!(" 🎉 Angel Web Low Server (Axum Edition)");
    println!(" 🚀 Listening on http://{}", addr);
    println!("========================================================");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
