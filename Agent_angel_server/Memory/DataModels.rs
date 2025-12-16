/* ==========================================================================
   📃 文件功能 : 核心数据模型定义
   ⚡ 逻辑摘要 : 定义了任务 (Task)、状态 (TaskStatus)、行动计划 (ActionPlan) 等基础结构。
   💡 易懂解释 : 系统的 "字典"，规定了大家交流时用什么词。
   🔋 未来扩展 : 支持更复杂的任务依赖关系。
   📊 当前状态 : 活跃 (更新: 2025-12-16)
   🧱 Memory/DataModels.rs 踩坑记录 :
      1. [2025-12-04] [已修复] [枚举序列化]: TaskStatus 默认是大写，导致前端解析失败。 -> 添加 rename_all="lowercase"。
      2. [2025-12-16] [已修复] [文件重复]: 文件内容被重复粘贴多次。 -> 清理重复内容。
   ========================================================================== */

// 📦 引入依赖
use serde::{Deserialize, Serialize}; // 🦀 引入序列化库

#[derive(Debug, Clone, Serialize, Deserialize)] // 🧬 派生常用 Trait
pub struct Task {
    // =============================================================================
    //  🎉 任务
    //
    //  🎨 代码用途：
    //      描述一个用户的当前任务状态。
    //
    //  💡 易懂解释:
    //      "谁 (id) 要干什么 (description)，干到第几步了 (step)，现在咋样了 (status)。"
    //
    //  ⚠️ 警告:
    //      无。
    //
    //  ⚙️ 触发源:
    //      Planner.rs
    // =============================================================================
    pub id: String, // 🆔 用户 ID
    pub description: String, // 📝 任务描述
    pub step: u32, // 👣 当前步数
    pub status: TaskStatus, // 🚦 任务状态
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)] // 🧬 派生常用 Trait
#[serde(rename_all = "lowercase")] // 🔡 强制小写序列化
pub enum TaskStatus {
    // =============================================================================
    //  🎉 任务状态
    //
    //  🎨 代码用途：
    //      任务生命周期的枚举。
    //
    //  💡 易懂解释:
    //      任务是刚开始、正在做、做完了还是搞砸了。
    //
    //  ⚠️ 警告:
    //      序列化为小写字符串 (pending, active, ...)。
    //
    //  ⚙️ 触发源:
    //      Task struct
    // =============================================================================
    Pending, // ⏳ 等待中
    Active, // ▶️ 进行中
    Completed, // ✅ 已完成
    Failed, // ❌ 失败
}

#[derive(Debug, Clone, Serialize, Deserialize)] // 🧬 派生常用 Trait
pub struct ActionPlan {
    // =============================================================================
    //  🎉 行动计划
    //
    //  🎨 代码用途：
    //      Python Brain 返回的决策结果。
    //
    //  💡 易懂解释:
    //      大脑说："下一步做这个 (action)，因为 (reason)，参数是 (params)。"
    //
    //  ⚠️ 警告:
    //      params 是动态 JSON，需要根据 action 类型解析。
    //
    //  ⚙️ 触发源:
    //      BrainClient -> call_python_brain
    // =============================================================================
    pub action: String, // 🎬 动作类型 (click, type, done...)
    pub reason: Option<String>, // 🧠 决策理由
    pub params: Option<serde_json::Value>, // 📦 动作参数
}

#[derive(Debug, Clone, Serialize, Deserialize)] // 🧬 派生常用 Trait
pub struct BrowserAction {
    // =============================================================================
    //  🎉 浏览器动作
    //
    //  🎨 代码用途：
    //      发送给 BodyClient 的具体执行指令。
    //
    //  💡 易懂解释:
    //      给手的指令："去点那个坐标！"
    //
    //  ⚠️ 警告:
    //      无。
    //
    //  ⚙️ 触发源:
    //      Planner.rs -> process_user
    // =============================================================================
    pub action_type: String, // 🎬 动作类型
    pub params: serde_json::Value, // 📦 动作参数 (非 Option，默认 Null)
}
