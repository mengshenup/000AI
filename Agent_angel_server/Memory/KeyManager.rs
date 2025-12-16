/* ==========================================================================
   📃 文件功能 : API 密钥管理
   ⚡ 逻辑摘要 : 使用 RocksDB 安全存储用户的 API Key。
   💡 易懂解释 : 机器人的 "保险箱"，专门放钥匙。
   🔋 未来扩展 : 支持加密存储 (AES)。
   📊 当前状态 : 活跃 (更新: 2025-12-06)
   🧱 Memory/KeyManager.rs 踩坑记录 :
      1. [2025-12-04] [已修复] [路径错误]: 数据库路径在不同环境下不一致。 -> 使用相对路径并自动修正。
   ========================================================================== */

// 📦 引入依赖
use std::sync::Arc; // 🔗 引入原子引用计数
use rocksdb::{DB, Options}; // 🪨 引入 RocksDB 库
use serde::{Deserialize, Serialize}; // 🦀 引入序列化库
use tracing::{info, error}; // 📢 引入日志库

#[derive(Serialize, Deserialize, Clone, Debug)] // 🧬 派生常用 Trait
pub struct UserKey {
    // =============================================================================
    //  🎉 用户密钥
    //
    //  🎨 代码用途：
    //      密钥数据结构 (暂未使用，目前直接存 String)。
    //
    //  💡 易懂解释:
    //      钥匙的标签。
    //
    //  ⚠️ 警告:
    //      无。
    //
    //  ⚙️ 触发源:
    //      (预留)
    // =============================================================================
    pub user_id: String, // 🆔 用户 ID
    pub api_key: String, // 🔑 API 密钥
    pub updated_at: i64, // ⏰ 更新时间戳
}

pub struct KeyManager {
    // =============================================================================
    //  🎉 密钥管理器
    //
    //  🎨 代码用途：
    //      封装 RocksDB 操作，提供密钥的增删改查。
    //
    //  💡 易懂解释:
    //      保险箱管理员。
    //
    //  ⚠️ 警告:
    //      RocksDB 实例是线程安全的 (Arc<DB>)。
    //
    //  ⚙️ 触发源:
    //      Main.rs -> Arc::new
    // =============================================================================
    db: Arc<DB>, // 🪨 RocksDB 实例
}

impl KeyManager {
    pub fn new() -> Self {
        // =============================================================================
        //  🎉 构造函数
        //
        //  🎨 代码用途：
        //      初始化密钥管理器，打开 RocksDB。
        //
        //  💡 易懂解释:
        //      买个新保险箱回来。
        //
        //  ⚠️ 警告:
        //      如果数据库文件损坏，会 Panic。
        //
        //  ⚙️ 触发源:
        //      Main.rs
        // =============================================================================
        let mut path = std::env::current_dir().unwrap_or_default(); // 📂 获取当前路径
        if path.ends_with("RustCore") { // 📂 检查路径层级
            path.pop(); // 🔙 回退一级
        }
        path.push("Memorybank"); // 📂 进入 Memorybank
        path.push("keys_db"); // 📂 进入 keys_db

        let mut opts = Options::default(); // ⚙️ 默认配置
        opts.create_if_missing(true); // 🆕 自动创建
        
        // Try to open DB, if fails (lock or platform issues), panic or handle gracefully
        let db = match DB::open(&opts, &path) { // 🔓 尝试打开数据库
            Ok(db) => Arc::new(db), // ✅ 成功则封装 Arc
            Err(e) => { // ❌ 失败处理
                error!(" Failed to open RocksDB at {:?}: {}", path, e); // 📢 记录错误
                panic!("RocksDB init failed"); // 💥 崩溃退出
            }
        };
        
        info!(" [KeyManager] RocksDB loaded at {:?}", path); // 📢 加载日志
        Self { db } // 📦 返回实例
    }

    pub fn get_key(&self, user_id: &str) -> Option<String> {
        // =============================================================================
        //  🎉 获取密钥 (用户ID)
        //
        //  🎨 代码用途：
        //      从数据库中检索用户的 API Key。
        //
        //  💡 易懂解释:
        //      "帮我找找这个人的钥匙。"
        //
        //  ⚠️ 警告:
        //      如果找不到，返回 None。
        //
        //  ⚙️ 触发源:
        //      Gemini.py
        // =============================================================================
        match self.db.get(user_id.as_bytes()) { // 🔍 查询数据库
            Ok(Some(value)) => { // ✅ 找到值
                String::from_utf8(value).ok() // 🔤 转换为字符串
            },
            Ok(None) => None, // ❌ 未找到
            Err(e) => { // 🚨 查询错误
                error!(" RocksDB get error: {}", e); // 📢 记录错误
                None // ❌ 返回空
            }
        }
    }

    pub fn set_key(&self, user_id: &str, key: &str) -> Result<(), String> {
        // =============================================================================
        //  🎉 设置密钥 (用户ID，密钥)
        //
        //  🎨 代码用途：
        //      保存用户的 API Key 到数据库。
        //
        //  💡 易懂解释:
        //      "把这把钥匙存起来。"
        //
        //  ⚠️ 警告:
        //      会覆盖旧值。
        //
        //  ⚙️ 触发源:
        //      API
        // =============================================================================
        self.db.put(user_id.as_bytes(), key.as_bytes()) // 💾 写入数据库
            .map_err(|e| e.to_string()) // 🔄 转换错误类型
    }
}