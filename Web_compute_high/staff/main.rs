/* ==========================================================================
   📃 文件功能 : Web Compute High 核心服务器 (Rust 版)
   ⚡ 逻辑摘要 : 使用 Axum + RocksDB 提供高性能的 API 服务，替代 Python 版 server.py。
   💡 易懂解释 : 这是一个 "超级管家"，动作比 Python 版快 100 倍，专门处理高并发请求。
   🔋 未来扩展 : 支持 gRPC，支持集群部署。
   📊 当前状态 : 活跃 (更新: 2025-12-04)
   🧱 Web_compute_high/src/main.rs 踩坑记录 :
      1. [2025-12-04] [已修复] [RocksDB锁]: 多进程同时访问 RocksDB 会导致锁文件错误。 -> 确保同一时间只有一个进程持有 DB 锁。
   ========================================================================== */

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use rocksdb::{Options, DB, DBCompressionType};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

// 🗿 数据库路径 (WSL 路径)
const DB_PATH: &str = "./angel_rocksdb";

// =============================================================================
//  🎉 应用状态
//
//  🎨 用途:
//      共享状态容器，持有 RocksDB 连接。
//
//  💡 易懂解释:
//      管家的记事本。
//
//  ⚠️ 警告:
//      RocksDB 是线程安全的，但需要通过 Arc 共享。
//
//  ⚙️ 触发源:
//      main
// =============================================================================
struct AppState {
    db: Arc<DB>,
}

// =============================================================================
//  🎉 主函数 (无)
//
//  🎨 用途:
//      启动高性能 API 服务器。
//
//  💡 易懂解释:
//      "超级管家上班了！"
//
//  ⚠️ 警告:
//      监听 9000 端口，如果 Python 版 server.py 也在运行，会冲突。
//
//  ⚙️ 触发源:
//      cargo run
// =============================================================================
#[tokio::main]
async fn main() {
    // 1. 初始化日志
    tracing_subscriber::fmt::init(); // 📢 日志系统初始化

    // 2. 初始化 RocksDB
    println!("🗿 [Rust High] 正在启动 RocksDB 引擎..."); // 📢 启动日志
    let mut opts = Options::default();
    opts.create_if_missing(true); // 🛠️ 自动创建
    opts.set_compression_type(DBCompressionType::Lz4); // 📦 启用压缩
    opts.set_max_open_files(5000); // 📂 增加文件句柄限制
    opts.increase_parallelism(std::thread::available_parallelism().map(|n| n.get() as i32).unwrap_or(2)); // 🚀 并行优化
    opts.set_use_fsync(false); // ⚡ 牺牲持久性换取性能 (非关键数据)

    let db = DB::open(&opts, DB_PATH).expect("❌ RocksDB 启动失败"); // 🔓 打开数据库
    let shared_state = Arc::new(AppState { db: Arc::new(db) }); // 💉 注入状态
    println!("✅ [Rust High] RocksDB 已就绪: {}", DB_PATH); // 📢 就绪日志

    // 3. 构建路由
    let app = Router::new()
        // --- 健康检查 ---
        .route("/", get(root)) // 🏠 根路径健康检查
        .route("/system_info", get(system_info)) // 🖥️ 系统信息
        
        // --- 旧 API (保留兼容) ---
        .route("/key/{user_id}", get(get_key).post(save_key)) // 🔑 旧版 Key 接口
        .route("/task/{user_id}", get(get_task).post(save_task)) // 📝 旧版 Task 接口
        
        // --- 新 API (Web_compute_high 迁移) ---
        .route("/login", post(login)) // 🚪 登录接口
        .route("/save_memory", post(save_memory)) // 💾 保存记忆
        .route("/load_memory", get(load_memory)) // 📖 读取记忆
        .route("/get_apps_list", get(get_apps_list)) // 📦 获取应用列表
        .route("/update_user_keys", post(update_user_keys)) // 🔑 更新密钥
        .route("/internal/get_user_key", get(internal_get_user_key)) // 🕵️ 内部获取密钥
        .route("/internal/add_user_key", post(internal_add_user_key)) // 🔑 内部添加密钥
        
        // --- 管理员 API ---
        .route("/admin/sync_batch", post(admin_sync_batch)) // 📦 批量同步
        .route("/admin/sync_commit", post(admin_sync_commit)) // ✅ 提交同步
        
        .layer(CorsLayer::permissive()) // 🛡️ CORS 策略
        .with_state(shared_state); // 💉 状态注入

    // 4. 启动服务器
    let addr = SocketAddr::from(([0, 0, 0, 0], 9000)); // 🎯 绑定地址
    println!("🚀 [Rust High] Axum 高算力节点监听中: http://{}", addr); // 📢 监听日志
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap(); // 👂 端口绑定
    axum::serve(listener, app).await.unwrap(); // 🏃 服务运行
}

// --- 数据结构 ---

#[derive(Deserialize)]
struct LoginRequest {
    account: String,
    password: String,
}

#[derive(Serialize)]
struct LoginResponse {
    status: String,
    token: String,
    user_id: String,
    keys: Vec<UserKey>,
}

#[derive(Serialize, Deserialize, Clone)]
struct UserKey {
    value: String,
    provider: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct UserAuthData {
    password: String,
    keys: Vec<UserKey>,
}

#[derive(Deserialize)]
struct MemoryStateRequest {
    data: serde_json::Value,
    user_id: String,
}

#[derive(Deserialize)]
struct LoadMemoryQuery {
    user_id: Option<String>,
}

#[derive(Deserialize)]
struct UpdateKeysRequest {
    account: String,
    keys: Vec<UserKey>,
}

#[derive(Deserialize)]
struct InternalKeyQuery {
    user_id: String,
}

// --- 处理函数 ---

// =============================================================================
//  🎉 用户登录 (请求体)
//
//  🎨 用途:
//      用户登录接口。
//
//  💡 易懂解释:
//      "查查户口本，看看是不是自家人。"
//
//  ⚠️ 警告:
//      自动注册逻辑仅用于开发环境。
//
//  ⚙️ 触发源:
//      POST /login
// =============================================================================
async fn login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LoginRequest>,
) -> impl IntoResponse {
    let key = format!("auth:{}", req.account);
    
    // 尝试获取用户数据
    let user_data = match state.db.get(key.as_bytes()) {
        Ok(Some(val)) => {
            // 用户存在，验证密码
            let auth_data: UserAuthData = serde_json::from_slice(&val).unwrap_or(UserAuthData {
                password: "".to_string(),
                keys: vec![],
            });
            
            if auth_data.password != req.password {
                return (StatusCode::UNAUTHORIZED, Json(json!({"detail": "密码错误"}))).into_response();
            }
            auth_data
        },
        Ok(None) => {
            // 用户不存在，自动注册
            println!("🆕 [Rust High] 自动注册新用户: {}", req.account);
            let new_user = UserAuthData {
                password: req.password.clone(),
                keys: vec![],
            };
            let json_bytes = serde_json::to_vec(&new_user).unwrap();
            state.db.put(key.as_bytes(), json_bytes).unwrap();
            new_user
        },
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // 生成 Mock Token (生产环境应使用 JWT)
    let token = format!("{}.{}.signature", req.account, chrono::Utc::now().timestamp());

    (StatusCode::OK, Json(LoginResponse {
        status: "success".to_string(),
        token,
        user_id: req.account,
        keys: user_data.keys,
    })).into_response()
}

// =============================================================================
//  🎉 保存记忆 (请求体)
//
//  🎨 用途:
//      保存用户记忆 (窗口状态)。
//
//  💡 易懂解释:
//      "把房间现在的样子拍个照存起来。"
//
//  ⚠️ 警告:
//      无。
//
//  ⚙️ 触发源:
//      POST /save_memory
// =============================================================================
async fn save_memory(
    State(state): State<Arc<AppState>>,
    Json(req): Json<MemoryStateRequest>,
) -> impl IntoResponse {
    let key = format!("memory:{}", req.user_id);
    let json_str = req.data.to_string();
    
    match state.db.put(key.as_bytes(), json_str.as_bytes()) {
        Ok(_) => (StatusCode::OK, Json(json!({"status": "success"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// =============================================================================
//  🎉 读取记忆 (查询参数)
//
//  🎨 用途:
//      读取用户记忆。
//
//  💡 易懂解释:
//      "把房间恢复原样。"
//
//  ⚠️ 警告:
//      无。
//
//  ⚙️ 触发源:
//      GET /load_memory
// =============================================================================
async fn load_memory(
    State(state): State<Arc<AppState>>,
    Query(query): Query<LoadMemoryQuery>,
) -> impl IntoResponse {
    let user_id = query.user_id.unwrap_or_else(|| "default".to_string());
    let key = format!("memory:{}", user_id);
    
    match state.db.get(key.as_bytes()) {
        Ok(Some(val)) => {
            let json_val: serde_json::Value = serde_json::from_slice(&val).unwrap_or(json!({}));
            (StatusCode::OK, Json(json_val)).into_response()
        },
        Ok(None) => (StatusCode::OK, Json(json!({}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// =============================================================================
//  🎉 获取应用列表 (无)
//
//  🎨 用途:
//      获取应用列表 (Mock)。
//
//  💡 易懂解释:
//      "看看有什么好玩的。"
//
//  ⚠️ 警告:
//      目前返回空列表，依赖前端回退逻辑。
//
//  ⚙️ 触发源:
//      GET /get_apps_list
// =============================================================================
async fn get_apps_list() -> impl IntoResponse {
    // 🛠️ 返回默认应用列表，与前端 js/apps/ 目录下实际存在的应用匹配
    // 注意：ID 和 filename 必须与前端应用的 config.id 和实际文件名一致
    let apps = json!([
        {
            "id": "win-angel",
            "filename": "browser.js",
            "name": "探索之窗",
            "version": "1.0.0",
            "icon": "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
            "color": "#6c5ce7"
        },
        {
            "id": "win-intelligence",
            "filename": "intelligence.js",
            "name": "智慧锦囊",
            "version": "1.0.0",
            "icon": "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z",
            "color": "#00b894"
        },
        {
            "id": "win-personalization",
            "filename": "personalization.js",
            "name": "个性化",
            "version": "1.0.0",
            "icon": "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22l-1.92 3.32c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
            "color": "#e17055"
        },
        {
            "id": "win-manual",
            "filename": "manual.js",
            "name": "光明指引",
            "version": "1.0.0",
            "icon": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
            "color": "#0984e3"
        },
        {
            "id": "win-taskmgr",
            "filename": "task_manager.js",
            "name": "活力源泉",
            "version": "1.0.0",
            "icon": "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
            "color": "#d63031"
        },
        {
            "id": "win-performance",
            "filename": "performance.js",
            "name": "性能调优",
            "version": "1.0.0",
            "icon": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
            "color": "#6c5ce7"
        }
    ]);
    
    let system_apps = json!([
        { "id": "sys-taskbar", "filename": "taskbar.js", "version": "1.0.0" },
        { "id": "sys-desktop", "filename": "desktop.js", "version": "1.0.0" },
        { "id": "sys-context-menu", "filename": "context_menu.js", "version": "1.0.0" },
        { "id": "sys-keymgr", "filename": "key_manager.js", "version": "1.0.0" },
        { "id": "app-login", "filename": "login.js", "version": "1.0.0" },
        { "id": "win-companion", "filename": "angel.js", "version": "1.0.0" },
        { "id": "svc-billing", "filename": "billing.js", "version": "1.0.0" },
        { "id": "svc-traffic", "filename": "traffic.js", "version": "1.0.0" },
        { "id": "svc-fps", "filename": "fps.js", "version": "1.0.0" },
        { "id": "sys-appstore", "filename": "app_store.js", "version": "1.0.0" }
    ]);
    
    let resp = json!({
        "apps": apps,
        "system_apps": system_apps,
        "system_core": []
    });
    (StatusCode::OK, Json(resp))
}

// =============================================================================
//  🎉 更新密钥 (请求体)
//
//  🎨 用途:
//      更新用户密钥。
//
//  💡 易懂解释:
//      "换把新钥匙。"
//
//  ⚠️ 警告:
//      直接覆盖旧 Key 列表。
//
//  ⚙️ 触发源:
//      POST /update_user_keys
// =============================================================================
async fn update_user_keys(
    State(state): State<Arc<AppState>>,
    Json(req): Json<UpdateKeysRequest>,
) -> impl IntoResponse {
    let key = format!("auth:{}", req.account);
    
    // 读取现有用户数据
    let mut user_data = match state.db.get(key.as_bytes()) {
        Ok(Some(val)) => serde_json::from_slice::<UserAuthData>(&val).unwrap_or(UserAuthData {
            password: "".to_string(),
            keys: vec![],
        }),
        Ok(None) => UserAuthData { // 如果用户不存在，创建空用户
            password: "".to_string(),
            keys: vec![],
        },
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // 更新 Keys (简单覆盖)
    user_data.keys = req.keys;
    
    let json_bytes = serde_json::to_vec(&user_data).unwrap();
    match state.db.put(key.as_bytes(), json_bytes) {
        Ok(_) => (StatusCode::OK, Json(json!({"status": "success", "msg": "密钥已更新"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// =============================================================================
//  🎉 内部获取密钥 (查询参数)
//
//  🎨 用途:
//      内部获取用户密钥 (供 Python Agent 调用)。
//
//  💡 易懂解释:
//      "Agent 查房。"
//
//  ⚠️ 警告:
//      无鉴权 (假设内部网络安全)，生产环境需加 Key 验证。
//
//  ⚙️ 触发源:
//      GET /internal/get_user_key
// =============================================================================
async fn internal_get_user_key(
    State(state): State<Arc<AppState>>,
    Query(query): Query<InternalKeyQuery>,
) -> impl IntoResponse {
    let key = format!("auth:{}", query.user_id);
    
    match state.db.get(key.as_bytes()) {
        Ok(Some(val)) => {
            let user_data: UserAuthData = serde_json::from_slice(&val).unwrap_or(UserAuthData {
                password: "".to_string(),
                keys: vec![],
            });
            
            // 优先返回 Google Key (AIza...)
            for k in &user_data.keys {
                if k.value.starts_with("AIza") {
                    return (StatusCode::OK, Json(json!({"key": k.value}))).into_response();
                }
            }
            
            // 否则返回第一个
            if let Some(k) = user_data.keys.first() {
                return (StatusCode::OK, Json(json!({"key": k.value}))).into_response();
            }
            
            (StatusCode::OK, Json(json!({"key": null}))).into_response()
        },
        _ => (StatusCode::OK, Json(json!({"key": null}))).into_response(),
    }
}

// --- 旧 API 辅助结构 ---

#[derive(Deserialize)]
struct KeyPayload {
    api_key: String,
}

#[derive(Deserialize)]
struct TaskPayload {
    description: String,
    step: i32,
    status: String,
}

#[derive(Serialize, Deserialize)]
struct TaskResponse {
    description: String,
    step: i32,
    status: String,
}

// =============================================================================
//  🎉 获取密钥 [旧] (用户ID)
// =============================================================================
async fn get_key(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
) -> impl IntoResponse {
    let key = format!("user:{}", user_id);
    match state.db.get(key.as_bytes()) {
        Ok(Some(value)) => {
            let api_key = String::from_utf8(value).unwrap_or_default();
            (StatusCode::OK, api_key)
        }
        Ok(None) => (StatusCode::NOT_FOUND, "Key not found".to_string()),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}

// =============================================================================
//  🎉 保存密钥 [旧] (用户ID, 载荷)
// =============================================================================
async fn save_key(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
    Json(payload): Json<KeyPayload>,
) -> impl IntoResponse {
    let key = format!("user:{}", user_id);
    match state.db.put(key.as_bytes(), payload.api_key.as_bytes()) {
        Ok(_) => (StatusCode::OK, "Saved".to_string()),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}

// =============================================================================
//  🎉 获取任务 [旧] (用户ID)
// =============================================================================
async fn get_task(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
) -> impl IntoResponse {
    let key = format!("task:{}", user_id);
    match state.db.get(key.as_bytes()) {
        Ok(Some(value)) => {
            let json_str = String::from_utf8(value).unwrap_or_default();
            match serde_json::from_str::<TaskResponse>(&json_str) {
                Ok(task) => (StatusCode::OK, Json(task)).into_response(),
                Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Data corruption").into_response(),
            }
        }
        Ok(None) => (StatusCode::NOT_FOUND, "Task not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// =============================================================================
//  🎉 保存任务 [旧] (用户ID, 载荷)
// =============================================================================
async fn save_task(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
    Json(payload): Json<TaskPayload>,
) -> impl IntoResponse {
    let key = format!("task:{}", user_id);
    let task_data = TaskResponse {
        description: payload.description,
        step: payload.step,
        status: payload.status,
    };
    
    let json_str = serde_json::to_string(&task_data).unwrap();
    
    match state.db.put(key.as_bytes(), json_str.as_bytes()) {
        Ok(_) => (StatusCode::OK, "Saved".to_string()),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    }
}

// =============================================================================
//  🎉 根路径健康检查 (无)
//
//  🎨 用途:
//      健康检查接口，确认服务器正常运行。
//
//  💡 易懂解释:
//      "敲敲门，看看管家在不在。"
//
//  ⚙️ 触发源:
//      GET /
// =============================================================================
async fn root() -> impl IntoResponse {
    Json(json!({"message": "Angel Web Compute High (Rust) is running! 🦀🎩"}))
}

// =============================================================================
//  🎉 系统信息 (无)
//
//  🎨 用途:
//      返回服务器系统信息。
//
//  💡 易懂解释:
//      "管家，报一下家里的电器型号！"
//
//  ⚙️ 触发源:
//      GET /system_info
// =============================================================================
async fn system_info() -> impl IntoResponse {
    Json(json!({
        "cpu_model": std::env::consts::ARCH,
        "system": std::env::consts::OS,
        "architecture": std::env::consts::ARCH,
        "rust_version": "1.75+"
    }))
}

// =============================================================================
//  🎉 内部添加密钥 (请求体)
//
//  🎨 用途:
//      供 Agent 内部调用，向用户追加新的 API Key（不覆盖）。
//
//  💡 易懂解释:
//      "Agent 帮用户配了把新钥匙。"
//
//  ⚙️ 触发源:
//      POST /internal/add_user_key
// =============================================================================
async fn internal_add_user_key(
    State(state): State<Arc<AppState>>,
    Json(req): Json<UpdateKeysRequest>,
) -> impl IntoResponse {
    let key = format!("auth:{}", req.account);
    
    // 读取现有用户数据
    let mut user_data = match state.db.get(key.as_bytes()) {
        Ok(Some(val)) => serde_json::from_slice::<UserAuthData>(&val).unwrap_or(UserAuthData {
            password: "".to_string(),
            keys: vec![],
        }),
        Ok(None) => UserAuthData {
            password: "".to_string(),
            keys: vec![],
        },
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // 追加新 Key（检查重复）
    for new_key in req.keys {
        let exists = user_data.keys.iter().any(|k| k.value == new_key.value);
        if !exists {
            user_data.keys.push(new_key);
        }
    }
    
    let json_bytes = serde_json::to_vec(&user_data).unwrap();
    match state.db.put(key.as_bytes(), json_bytes) {
        Ok(_) => (StatusCode::OK, Json(json!({"status": "success", "msg": "密钥已追加"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// --- 管理员 API 数据结构 ---

#[derive(Deserialize)]
struct SyncBatchRequest {
    apps: Vec<SyncAppItem>,
}

#[derive(Deserialize, Serialize, Clone)]
struct SyncAppItem {
    id: String,
    name: String,
    version: String,
    path: String,
    #[serde(rename = "isSystem")]
    is_system: bool,
}

// 全局同步缓存 (使用标准库 OnceLock)
use std::sync::{Mutex, OnceLock};

static SYNC_CACHE: OnceLock<Mutex<Option<serde_json::Value>>> = OnceLock::new();

fn get_sync_cache() -> &'static Mutex<Option<serde_json::Value>> {
    SYNC_CACHE.get_or_init(|| Mutex::new(None))
}

// =============================================================================
//  🎉 批量同步 (请求体)
//
//  🎨 用途:
//      接收前端分批发送的应用数据，更新到内存缓存。
//
//  💡 易懂解释:
//      "收快递，先堆在客厅。"
//
//  ⚙️ 触发源:
//      POST /admin/sync_batch
// =============================================================================
async fn admin_sync_batch(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SyncBatchRequest>,
) -> impl IntoResponse {
    let mut cache = get_sync_cache().lock().unwrap();
    
    // 如果缓存为空，从数据库加载
    if cache.is_none() {
        let data = match state.db.get(b"memory:default") {
            Ok(Some(val)) => serde_json::from_slice(&val).unwrap_or(json!({})),
            _ => json!({"installedApps": {}}),
        };
        *cache = Some(data);
    }
    
    // 更新缓存
    if let Some(ref mut data) = *cache {
        let installed_apps = data.get_mut("installedApps")
            .and_then(|v| v.as_object_mut());
        
        if let Some(apps_map) = installed_apps {
            for app in &req.apps {
                apps_map.insert(app.id.clone(), json!({
                    "id": app.id,
                    "name": app.name,
                    "version": app.version,
                    "path": app.path,
                    "isSystem": app.is_system
                }));
            }
        }
    }
    
    Json(json!({"status": "received", "count": req.apps.len()}))
}

// =============================================================================
//  🎉 提交同步 (无)
//
//  🎨 用途:
//      将内存缓存写入数据库。
//
//  💡 易懂解释:
//      "把客厅的包裹搬进仓库。"
//
//  ⚙️ 触发源:
//      POST /admin/sync_commit
// =============================================================================
async fn admin_sync_commit(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let mut cache = get_sync_cache().lock().unwrap();
    
    if cache.is_none() {
        return Json(json!({"status": "no_changes", "msg": "没有待提交的更改"}));
    }
    
    // 写入数据库
    if let Some(ref data) = *cache {
        let json_str = data.to_string();
        match state.db.put(b"memory:default", json_str.as_bytes()) {
            Ok(_) => {
                *cache = None; // 清空缓存
                Json(json!({"status": "success", "msg": "同步完成，已写入数据库"}))
            },
            Err(e) => Json(json!({"status": "error", "msg": e.to_string()})),
        }
    } else {
        Json(json!({"status": "no_changes", "msg": "没有待提交的更改"}))
    }
}
