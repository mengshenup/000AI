# 🧠 000AI Logging & Memory Protocol (v2.0)

## ⏱️ 实时心跳日志 (Real-time Heartbeat Log)

**1. 💓 工作日志 (`000AI_Copilot_WorkLog.md`)**
*   **位置**: 项目根目录 (`C:\000AI\000AI_Copilot_WorkLog.md`)
*   **责任人**: **All Personas** (Architect/Engineer/Auditor)
*   **频率**: **状态切换时** (Plan -> Logic -> Code -> Test -> Reflexion)。
*   **内容**: 必须用自然语言告诉用户“我正在做什么”。
*   **格式**: `[YYYY-MM-DD HH:MM] 🔄 [Phase]: 正在执行... (下一步: ...)`
    *   `[Phase]` 必须是以下之一: `Plan`, `Logic`, `Code`, `Test`, `Reflexion`, `Annotation`, `Conclusion`。
    *   **时间同步**: 必须优先使用用户提供的当前时间（若有），或根据上一次日志时间合理推演，避免时间倒流或过大误差。
*   **禁止**: 仅记录“完成”，必须记录“进行中”的状态。

---

## 🧠 记忆库 (Memory Bank) - Internal State

**位置**: `C:\000AI\Debug\<ProjectName>\Memory\`

**1. 🌍 上下文状态 (`activeContext.json`)**
*   **责任人**: **Architect** (Plan 阶段)
*   **内容**: 当前任务的实时状态 (Step Index, Variables) 以及 **Feature Toggles**。
*   **Schema**:
    ```json
    {
      "task_id": "...",
      "step_index": 0,
      "variables": {},
      "related_files": [
        "src/main.py",
        "src/utils.py"
      ],
      "features": {
        "auth_module": "active",
        "payment_gateway": "disabled"
      }
    }
    ```
*   **更新**: 每次 `<plan>` 之后必须更新。`related_files` 必须包含当前任务涉及的所有关键文件路径。

**2. ⚡ 实时反思流 (`reflexion_history.md`)**
*   **责任人**: **Auditor** (Reflexion 阶段)
*   **核心**: 这是 Agent 的**长期记忆**与**思维链**。
*   **触发**: 每次生成 `<reflexion>` 标签时。
*   **动作**: **必须实时追加** (Append) 到此文件，不可覆盖。
*   **格式**:
    ```markdown
    ### [YYYY-MM-DD HH:MM] Reflexion (TaskID: xxx)
    - **Trigger**: Test Failure / Step Completion
    - **Analysis**: ...
    - **Decision**: Loop back to Logic / Proceed to Annotation
    - **Validation Check**: (Only for Annotation phase) Passed / Failed
    ```

**3. 📚 知识库 (`knowledge_base.json`)**
*   **责任人**: **Auditor** (Reflexion 阶段)
*   **内容**: 沉淀的通用规则与错误模式。
*   **Snippet Library**: 必须包含标准的文件头模板和常用复杂结构（如 `try-except`）的注释模板，以减少语法错误。
*   **触发**: 解决复杂 Bug 后。

---

## 💾 任务状态 (Task State) - Execution Control

**位置**: `C:\000AI\Debug\<ProjectName>\State\`

**1. 📋 任务队列 (`task_queue.json`)**
*   **责任人**: **Architect** (Plan 阶段)
*   **内容**: 待执行的原子任务列表。
*   **Schema**: `[{"id": 1, "task": "...", "status": "pending", "retries": 0}]`

**2. 📸 运行快照 (`checkpoint.json`)**
*   **责任人**: **Engineer** (Code/Test 阶段)
*   **内容**: 长耗时任务的断点信息。
*   **Schema**: `{"task_id": 1, "timestamp": "...", "progress": "50%"}`

---

## 📊 报告归档 (Reports Archive) - Deliverables

**位置**: `C:\000AI\Debug\<ProjectName>\Reports\`

**1. 📑 任务结案报告 (`Task_Report_<Date>_<TaskID>.md`)**
*   **责任人**: **Engineer** (Annotation 阶段)
*   **触发**: 任务彻底完成 (Annotation 之后)。
*   **内容**:
    *   任务目标
    *   最终变更文件列表
    *   **Validation Status**: 必须声明 `validate_annotation.py` 已通过所有文件验证。
    *   遇到的核心困难与解决方案
    *   后续建议

**2. 🧪 测试总结报告 (`Test_Report_<Date>.md`)**
*   **责任人**: **Engineer** (Test 阶段)
*   **触发**: 批量测试结束后。
*   **内容**: 通过率、覆盖率、性能数据。

---

## 📝 原始日志 (Raw Logs)

**1. ⚡ 原始输出日志 (`Logs/`)**
*   **位置**: `C:\000AI\Debug\<ProjectName>\Logs\`
*   **内容**: 存放 `<test_action>` 的原始 `stdout/stderr` 捕获，用于调试。
