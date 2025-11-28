# 🧠 000AI Logging & Memory Protocol (v2.0)

## 🏦 记忆库模式 (The Memory Bank Pattern)

Instead of relying solely on Markdown logs, you MUST use structured JSON files in `Debug/Memorybank/` to manage state.

**1. 🌍 系统上下文 (`systemContext.json`)**
*   **内容**: OS 版本, 工具链状态, 环境变量, 已知限制.
*   **更新**: 每次 `10_environment_safety.md` 检查后更新.
*   **Schema**:
    ```json
    {
      "os": "Windows Server 2022",
      "shell": "pwsh",
      "tools": {"python": "3.10", "cargo": "1.70"},
      "constraints": ["no_store", "low_memory"]
    }
    ```

**2. 🏗️ 产品上下文 (`productContext.json`)**
*   **内容**: 项目的高层目标, 设计原则, 核心功能列表.
*   **更新**: 仅在架构变更时更新.

**3. ⚡ 活动上下文 (`activeContext.json`)**
*   **内容**: 当前任务的实时状态.
*   **核心字段**:
    *   `task_id`: 当前任务ID.
    *   `step_index`: 当前执行到的步骤索引.
    *   `steps`: 步骤列表 (状态: pending/active/done/failed).
    *   `variables`: 任务运行时的临时变量.
*   **规则**: 每次 `<plan>` 或 `<reflexion>` 后必须更新此文件.

---

## 📝 审计与日志 (Audit & Logging)

**1. 📘 主工作日志 (Master Work Log)**
*   **文件**: `000AI_Copilot_WorkLog.md`
*   **规则**: 仅记录高层里程碑 (Milestones). 详细步骤移至 `activeContext.json`.

**2. ⚡ 实时日志 (Live Logging)**
*   **文件**: `Debug/Logs/<YYYYMMDD>/<HHMM>_<TaskName>.md`
*   **规则**: 记录 `<test_action>` 的原始输出和 `<reflexion>` 的思考过程.

**3. 🚦 功能状态控制 (Feature Status Control)**
*   **文件**: `Debug/Memorybank/feature_status.json`
*   **Schema**: `{"feature_name": {"status": "active", "last_verified": "2023-10-27"}}`

**4. 🧠 长期记忆 (Long-term Memory)**
*   **知识库**: `Debug/Memory/knowledge_base.json`
    *   **Schema**: `{"pattern": "错误特征", "fix": "解决方案", "context": "适用场景"}`
    *   **触发**: 每次解决复杂 BUG 后，必须提取通用规则写入。
