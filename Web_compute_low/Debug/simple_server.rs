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
use std::net::SocketAddr; // 📡 网络地址类型，用于表示 IP + 端口

// =================================
//  🎉 主函数 (异步运行时入口)
//
//  🎨 代码用途：
//     使用 Tokio 异步运行时启动 Axum 静态文件服务器。
//     配置日志、CORS、路由，并监听 5500 端口。
//
//  💡 易懂解释：
//     这是整个服务器的起点！就像按下启动按钮，让管家开始工作。
//     他会先准备好记事本（日志），设置好门禁规则（CORS），然后站在门口迎接客人！
//
//  ⚠️ 警告：
//     tokio::main 宏会自动创建异步运行时，不要重复初始化。
//     ServeDir 默认服务当前工作目录，请确保在正确的目录下运行。
//
//  ⚙️ 被谁调用：
//     程序入口，由操作系统调用
// =================================
#[tokio::main] // 🚀 Tokio 异步运行时宏，将 main 函数转换为异步入口点
async fn main() {
    // 🌟 初始化日志系统 (使用简化的格式化订阅器)
    tracing_subscriber::fmt() // 📝 创建格式化日志订阅器，用于记录运行状态
        .with_max_level(tracing::Level::INFO) // 🔍 设置最大日志级别为 INFO，只记录重要信息
        .init(); // 🎯 初始化全局日志系统，让日志功能生效

    // 🌐 配置 CORS (跨域资源共享策略)
    let cors = CorsLayer::new() // 🛡️ 创建 CORS 中间件层
        .allow_origin(Any) // 🌍 允许任何来源访问（开发环境用，生产环境建议限制）
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS]) // 📮 允许的 HTTP 方法列表
        .allow_headers(Any); // 📋 允许任何请求头

    // 🏗️ 构建应用路由
    let app = Router::new() // 🎪 创建空的路由器实例
        .fallback_service(ServeDir::new(".")) // 📂 设置回退服务：提供当前目录的静态文件
        .layer(cors) // 🛡️ 添加 CORS 中间件层
        .layer(TraceLayer::new_for_http()); // 📊 添加 HTTP 请求追踪层，用于日志记录

    // 4. 绑定端口
    let addr = SocketAddr::from(([0, 0, 0, 0], 5500));
    println!("========================================================");
    println!(" 🎉 Angel Web Low Server (Axum Edition)");
    println!(" 🚀 Listening on http://{}", addr);
    println!("========================================================");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
