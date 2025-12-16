/* ==========================================================================
   📃 文件功能 : 全局状态定义
   ⚡ 逻辑摘要 : 定义 AppState 结构体，持有所有共享组件 (Clients, Cognitive, Cost, Key, CDP)。
   💡 易懂解释 : 机器人的 "大脑皮层"，连接所有器官。
   🔋 未来扩展 : 添加数据库连接池。
   📊 当前状态 : 活跃 (更新: 2025-12-06)
   🧱 Memory/AppState.rs 踩坑记录 :
      1. [2025-12-06] [已修复] [文件内容错误]: 之前错误地包含了 Python 代码。 -> 重写为 Rust 结构体。
      2. [2025-12-16] [已修复] [类型不匹配]: clients 类型是 Sender<Message>，但实际发送 String。 -> 改为 Sender<String>。
   ========================================================================== */

use std::sync::Arc; // 🔗 引入原子引用计数
use dashmap::DashMap; // 🗺️ 引入并发哈希表
use tokio::sync::mpsc; // 📨 引入异步通道

use crate::planner::CognitiveSystem; // 🧠 引入认知系统
use crate::cost_monitor::CostMonitor; // 💰 引入成本监控
use crate::key_manager::KeyManager; // 🗝️ 引入密钥管理
use crate::cdp_stream::CDPStream; // 📺 引入 CDP 流

pub struct AppState {
    // =============================================================================
    //  🎉 应用状态
    //
    //  🎨 代码用途：
    //      Axum 服务器的共享状态，通过 Arc 在线程间共享。
    //
    //  💡 易懂解释:
    //      "共享内存区"，大家都能看。
    //
    //  ⚠️ 警告:
    //      字段通常包裹在 Arc 中以支持克隆。
    //
    //  ⚙️ 触发源:
    //      Main.rs -> Arc::new(AppState { ... })
    // =============================================================================
    pub clients: DashMap<String, mpsc::UnboundedSender<String>>, // 🔌 客户端连接池 (User ID -> Sender<String>)
    pub cognitive: Arc<CognitiveSystem>, // 🧠 认知系统实例
    pub cost_monitor: Arc<CostMonitor>, // 💰 成本监控实例
    pub key_manager: Arc<KeyManager>, // 🗝️ 密钥管理器实例
    pub cdp_stream: Arc<CDPStream>, // 📺 CDP 流服务实例
}