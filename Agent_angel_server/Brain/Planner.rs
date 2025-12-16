/* ==========================================================================
   📃 文件功能 : 认知系统核心框架
   ⚡ 逻辑摘要 : 协调感知 (Body)、思考 (Brain)、行动 (Body) 和记忆 (Memory) 的主循环。
   💡 易懂解释 : 这是机器人的 "前额叶"，负责不停地看、想、做。
   🔋 未来扩展 : 支持多任务并行思考，引入短期记忆缓存。
   📊 当前状态 : 活跃 (更新: 2025-12-06)
   🧱 Brain/Planner.rs 踩坑记录 (累积，勿覆盖) :
      1. [2025-12-04] [已修复] [模块拆分]: 拆分过细导致引用混乱。 -> 重新封装为 Planner.rs + 原子模块。
   ========================================================================== */

pub mod types;
pub mod persistence;
pub mod brain_client;

// 📦 引入依赖
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use dashmap::DashMap;
use reqwest::Client;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STANDARD};
use rocksdb::{DB, Options};

use crate::body_client::BrowserClient;
use crate::data_models::{Task, TaskStatus, BrowserAction};

// 使用原子模块的功能
use self::persistence::{load_state, save_task};
use self::brain_client::call_python_brain;

pub struct CognitiveSystem {
    // =============================================================================
    //  🎉 认知系统
    //
    //  🎨 代码用途:
    //      核心状态容器，持有任务、浏览器客户端、HTTP客户端和数据库连接。
    //
    //  💡 易懂解释:
    //      机器人的大脑实体，装着所有它需要的东西。
    //
    //  ⚠️ 警告:
    //      [资源管理]: 持有数据库连接和 HTTP 连接池。
    //
    //  ⚙️ 触发源:
    //      Through Brain/Planner.rs "Struct Def" -> CognitiveSystem
    // =============================================================================
    pub tasks: DashMap<String, Task>, // 📋 任务列表
    browser: BrowserClient, // 🎮 浏览器控制器
    http_client: Client, // 🌐 HTTP 客户端
    db: Arc<DB>, // 💾 数据库连接
}

impl CognitiveSystem {
    pub fn new() -> Self {
        // =============================================================================
        //  🎉 构造函数
        //
        //  🎨 代码用途:
        //      构造认知系统，初始化 RocksDB 连接并加载历史任务。
        //
        //  💡 易懂解释:
        //      大脑开机，顺便回忆一下上次没做完的事。
        //
        //  ⚠️ 警告:
        //      [文件锁]: RocksDB 锁文件可能导致启动失败 (如果多进程访问)。
        //
        //  ⚙️ 触发源:
        //      Through Brain/Main.rs "System Init" -> new
        // =============================================================================
        let mut path = std::env::current_dir().unwrap_or_default(); // 📂 获取路径
        if path.ends_with("RustCore") { // 🔍 修正路径
            path.pop(); // 🔙 回退一级
        }
        path.push("Memorybank"); // 📂 进入 Memorybank
        path.push("tasks_db"); // 🎯 定位数据库

        let mut opts = Options::default(); // ⚙️ 默认配置
        opts.create_if_missing(true); // 🛠️ 自动创建
        let db = Arc::new(DB::open(&opts, path).expect("Failed to open Tasks RocksDB")); // 🔓 打开数据库

        let system = Self {
            tasks: DashMap::new(), // 📋 初始化任务表
            browser: BrowserClient::new(), // 🎮 初始化浏览器
            http_client: Client::new(), // 🌐 初始化 HTTP
            db, // 💾 注入数据库
        };
        load_state(&system.db, &system.tasks); // 📥 加载状态
        system // 🔙 返回实例
    }

    pub fn set_goal(&self, user_id: String, description: String) {
        // =============================================================================
        //  🎉 设定目标 (用户ID，描述)
        //
        //  🎨 代码用途:
        //      为指定用户设置新的任务目标。
        //
        //  💡 易懂解释:
        //      老板 (用户) 下达了新指令，赶紧记下来。
        //
        //  ⚠️ 警告:
        //      [覆盖风险]: 会覆盖该用户当前正在进行的任务。
        //
        //  ⚙️ 触发源:
        //      Through Brain/Main.rs "API Request" -> set_goal
        // =============================================================================
        let task = Task {
            id: user_id.clone(), // 🆔 用户 ID
            description, // 📝 任务描述
            step: 0, // 👣 初始步数
            status: TaskStatus::Active, // 🚦 初始状态
        };
        self.tasks.insert(user_id.clone(), task.clone()); // 📝 更新内存
        save_task(&self.db, &task); // 💾 持久化
    }

    pub async fn start(self: Arc<Self>) {
        // =============================================================================
        //  🎉 启动循环()
        //
        //  🎨 代码用途:
        //      启动后台异步循环，定期检查并处理活跃任务。
        //
        //  💡 易懂解释:
        //      大脑开始转动，每隔 2 秒看看有没有活要干。
        //
        //  ⚠️ 警告:
        //      [无限循环]: 这是一个无限循环，除非程序终止。
        //
        //  ⚙️ 触发源:
        //      Through Brain/Main.rs "System Start" -> start
        // =============================================================================
        tracing::info!("🧠 [Cognitive] System Started"); // 📢 启动日志
        let system = self.clone(); // 🧬 克隆引用
        
        tokio::spawn(async move { // 🚀 启动任务
            loop { // 🔄 无限循环
                let active_users: Vec<String> = system.tasks.iter() // 🔍 遍历任务
                    .filter(|r| r.value().status == TaskStatus::Active) // 🔍 筛选活跃
                    .map(|r| r.key().clone()) // 🔑 提取 ID
                    .collect(); // 📦 收集列表

                for user_id in active_users.iter() { // 🔄 遍历用户
                    system.process_user(user_id).await; // 🏃 处理用户
                }

                sleep(Duration::from_secs(2)).await; // 💤 休息 2 秒
            }
        });
    }

    async fn process_user(&self, user_id: &str) {
        // =============================================================================
        //  🎉 处理用户 (用户ID)
        //
        //  🎨 代码用途:
        //      执行单个用户的认知循环: 观察 -> 思考 -> 行动。
        //
        //  💡 易懂解释:
        //      针对某个用户，看一眼屏幕，想一下怎么做，然后动手操作。
        //
        //  ⚠️ 警告:
        //      [异常处理]: 如果 Python 端无响应，会记录警告并跳过。
        //
        //  ⚙️ 触发源:
        //      Through Brain/Planner.rs "Loop Tick" -> process_user
        // =============================================================================
        let task = match self.tasks.get(user_id) { // 🔍 查找任务
            Some(t) => t, // 🎯 获取任务
            None => return, // 🛑 不存在则退出
        };

        tracing::info!("🤔 [Cognitive] Thinking for {}: {} (Step {})", user_id, task.description, task.step); // 📢 思考日志

        // 1. Observe (通过 BodyClient 获取感知)
        let screenshot_bytes = match self.browser.get_screenshot(user_id).await { // 📸 获取截图
            Ok(s) => s, // 📸 成功
            Err(e) => { // 🚨 失败
                tracing::error!("❌ Screenshot failed: {}", e); // 🚨 错误日志
                return; // 🛑 退出
            }
        };
        let screenshot_b64 = BASE64_STANDARD.encode(&screenshot_bytes); // 🖼️ Base64 编码
        
        let url = self.browser.get_url(user_id).await.unwrap_or_default(); // 🌐 获取 URL

        let description = task.description.clone(); // 📝 克隆描述
        drop(task); // 🔓 释放锁

        // 2. Decide (调用 Brain Client 进行思考)
        let plan = match call_python_brain(&self.http_client, user_id, &description, &url, &screenshot_b64).await { // 🧠 调用大脑
            Some(p) => p, // 💡 获取计划
            None => { // ⚠️ 失败
                tracing::warn!("⚠️ Brain blank"); // ⚠️ 警告日志
                return; // 🛑 退出
            }
        };

        tracing::info!("💡 [Cognitive] Decision: {} - {:?}", plan.action, plan.reason); // 💡 决策日志

        // 3. Act (通过 BodyClient 执行动作)
        let action_type = plan.action.clone(); // 🎬 动作类型
        let browser_action = BrowserAction {
            action_type: plan.action, // 🎬 动作类型
            params: plan.params.unwrap_or(serde_json::Value::Null), // ⚙️ 参数
        };

        if let Err(e) = self.browser.execute_action(user_id, browser_action).await { // 🎬 执行动作
            tracing::error!("❌ Action failed: {}", e); // 🚨 错误日志
        }

        // 4. Update State (通过 Persistence 更新状态)
        if let Some(mut task) = self.tasks.get_mut(user_id) { // 📝 获取锁
            task.step += 1; // 📈 步数增加
            if action_type == "done" { // ✅ 检查完成
                task.status = TaskStatus::Completed; // ✅ 标记完成
                tracing::info!("✅ Task Completed for {}", user_id); // 📢 完成日志
            } else if task.step > 20 { // 🛑 检查限制
                task.status = TaskStatus::Failed; // 🛑 标记失败
                tracing::warn!("🛑 Task limit reached for {}", user_id); // ⚠️ 警告日志
            }
            save_task(&self.db, &task); // 💾 保存状态
        }
    }
}
