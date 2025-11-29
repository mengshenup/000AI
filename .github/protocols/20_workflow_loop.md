# 🔄 000AI Workflow & Coding Protocol (v2.0)

## 🕰️ 长程续航与状态管理 (Long-Running & State Management)

**1. 🧠 状态持久化 (State Persistence)**
*   **快照机制**: 耗时超过 1 分钟的任务，必须维护 `C:\000AI\Debug\<ProjectName>\State\checkpoint.json`。
*   **断点续传**: 任务中断重启时，**优先**读取快照，严禁从零开始。

**2. ⏱️ 智能监控 (Smart Monitoring)**
*   **心跳保活**: 长耗时操作（如构建、训练）必须开启详细日志 (`-v`) 或每 60 秒输出进度点 (`.`)，证明进程存活。
*   **死锁熔断**:
    *   **输入阻塞**: 依靠 `< nul` 立即熔断。
    *   **静默死锁**: 持续 **300秒** 无输出视为死锁，自动终止并触发 *Reflexion*。

**3. 🔭 上下文管理 (Context Management - Gemini 3 Era)**
*   **Full Context**: 启动时读取 `Resource_Manifest.json` 和关键源码。
*   **Failure Retention**: **严禁**删除失败的测试日志。失败的历史是成功的关键。
*   **Pruning**: 仅在系统明确警告 Token 溢出时才进行剪枝。

---

## 🛑 防死锁协议 (Anti-Loop Protocol)

**The "Three-Strike" Rule (三振出局法)**
如果同一错误持续出现 **3次**，严禁继续修改代码，必须切换策略：
1.  **Strike 1 (Direct Fix)**: 尝试直接修复代码。
2.  **Strike 2 (Debug Mode)**: 注入详细日志 (`print`/`logging`)，重新运行以获取更多信息。
3.  **Strike 3 (Isolation)**: 创建最小复现脚本 (`reproduce_issue.py`) 在 `C:\000AI\Debug\<ProjectName>\test_code\` 中隔离测试。
4.  **Escalation**: 如果 Strike 3 失败，将任务标记为 `BLOCKED`，并在 `C:\000AI\Debug\<ProjectName>\State\task_queue.json` 中跳过此步骤，继续执行下一个任务。

---

## 🔄 核心工作流 (The 6-Step Autonomous Loop)

You MUST use **XML Tags** to denote your current state.

### 1. 🗺️ 计划 (Plan) & Queue Management `<plan>`
*   **动作**:
    *   **Context Resolution**: 确定 `<ProjectName>` (默认为 `000AI` 或根据当前工作目录/用户指令推断)。
    *   **Resource Check**: 读取 `C:\000AI\Debug\<ProjectName>\Host_Profile.json`。**若不存在**，必须先调用 `Get-ComputerInfo` 生成并写入。
    *   **Context Load**: 读取 `C:\000AI\Debug\<ProjectName>\Memory\activeContext.json`。**若不存在**，执行 **Bootstrap Protocol**。
    *   **Queue Check**: 读取 `C:\000AI\Debug\<ProjectName>\State\task_queue.json`。
        *   **若存在且有 Pending**: 优先执行队列任务。
        *   **若不存在或空**: 解析用户 Prompt，生成原子任务列表，**写入** `task_queue.json`。
    *   **Decomposition**: 将大任务拆解为原子任务 (Atomic Tasks)。
*   **输出**: `<plan> ... </plan>`

### 2. 📐 逻辑构建 (Logic) `<logic>`
*   **规则**: **Logic First, Code Later**.
*   **动作**:
    *   **Consult Knowledge**: 读取 `C:\000AI\Debug\<ProjectName>\Memory\knowledge_base.json`。**若不存在**，跳过此步（视为无历史经验）。
    *   **Draft Logic**: 对于复杂任务 (>50行代码 或 >2个文件)，必须先创建 `.logic` 文件（伪代码/流程图/架构图）。
*   **禁止**: 此阶段严禁编写可执行代码。
*   **输出**: `<logic> ... </logic>`

### 3. ⌨️ 编码 (Code) `<code_action>`
*   **标准**: **高评分紧凑代码** (强类型、极简命名、原子化)。
*   **Syntax Guard**: 写入前必须检查文件扩展名。
    *   `.py`: Use `#` for comments.
    *   `.js/.ts/.c/.cpp`: Use `//` or `/* */`.
    *   `.bat`: Use `REM` (Never `::` inside blocks).
*   **Linter Check**: 在完成编码前，必须调用 `get_errors` 或类似工具检查语法错误。严禁盲目提交。
*   **禁止**: **严禁**在此阶段添加任何注释（除必要的 TODO）。
*   **目标**: 逻辑评分极高，体积极小。
*   **输出**: `<code_action> ... </code_action>`

### 4. ⚡ 测试 (Test) `<test_action>`
*   **规则**: **Silence is Gold**.
*   **动作**: 执行测试脚本，捕获真实输出。
*   **强制**: 必须使用 `Input Starvation` 参数 (e.g., `< nul`).
*   **输出**: `<test_action> ... </test_action>`

### 5. 🧠 反思 (Reflexion) `<reflexion>`
*   **触发**: 测试失败或完成。
*   **动作**: 分析 *Why* (根本原因)。
    *   **Update Knowledge**: 若发现新 Bug 模式，**写入/追加** `C:\000AI\Debug\<ProjectName>\Memory\knowledge_base.json`。
    *   **Update History**: **写入/追加** `C:\000AI\Debug\<ProjectName>\Memory\reflexion_history.md`。
*   **决策**:
    *   **失败**: 回到 `<logic>` 或 `<code_action>`。
    *   **成功**: **必须**进入 `<annotation_action>`。严禁在测试通过后直接结束任务。
*   **输出**: `<reflexion> ... </reflexion>`

### 6. 📝 个性化注释 (Annotation) `<annotation_action>`
*   **触发**: 仅在 **最终目标** 验证通过后。
*   **核心任务**: **逆向工程与文档注入**。
*   **动作**: 使用 `replace_string_in_file` 注入“五段式备注”和“Emoji 信标”。
*   **Context Refresh**: 如果对话过长，你可能忘记了规则。**请重新阅读此节**。
*   **Definition of Done (DoD)**: 
    1. 代码被完整注释。
    2. **Validation (Mandatory)**: 必须运行 `python C:\000AI\.github\tools\validate_annotation.py <filePath>`。
        *   **Visual Proof**: 你必须在终端看到 ✅ Success 消息。不要假设它通过了。
        *   **Auto-Correction**: 若验证失败，必须根据工具输出修复缺失的注释，并**重新运行验证**，直到通过。
        *   **Tool Maintenance**: 若发现 `validate_annotation.py` 存在误判 (Bug)，**必须优先修复工具本身**，然后重新验证。严禁绕过工具。
        *   **Multi-File**: 若任务涉及多个文件，必须对**每一个**文件都执行验证。
    3. 只有验证通过后，才能进入 **Step 7**。
*   **输出**: `<annotation_action> ... </annotation_action>`

### 7. 🏁 结案 (Conclusion) `<conclusion>`
*   **触发**: Annotation 完成后。
*   **动作**:
    *   **Generate Report**: 创建 `C:\000AI\Debug\<ProjectName>\Reports\Task_Report_YYYYMMDD_<TaskName>.md`。
        *   **Language**: 报告内容必须使用 **简体中文 (Simplified Chinese)**。
    *   **Update Manifest**: 更新 `C:\000AI\Debug\<ProjectName>\Resource_Manifest.json`，注册新文件和报告。
    *   **Close Task**: 在 `C:\000AI\Debug\<ProjectName>\State\task_queue.json` 中将任务标记为 `completed`。
*   **输出**: `<conclusion> ... </conclusion>`

---

## 📜 注释规范 (Strict Standards - Phase 6 Only)

**A. 文件头 (File Header)**
*   **位置**: 文件顶部。
*   **格式**:
    ```text
    /* ==========================================================================
       📃 文件功能 : [写全]
       ⚡ 逻辑摘要 : [核心算法/思路]
       💡 易懂解释 : [高中生能懂，正面可爱语气，不使用比喻]
       🔋 扩展备注 : [未来扩展建议]
       📊 当前状态 : [活跃 | 待解决 | 已完成 | 废弃] (最后更新: YYYY-MM-DD)
       🧱 [当前文件名] 踩坑记录 (必须累加，严禁覆盖) :
          1. [YYYY-MM-DD] [已修复/待验证] [坑名]: [原因] -> [修复方案] (Line XX)
       ========================================================================== */
    ```

**B. 五段式备注 (The 5-Part Block)**
*   **适用**: 函数、类、模块、HTML容器。
*   **位置**: 定义行的下一行（内部）。
*   **必填**:
```text
// =============================================================================
//  🎉 [中文含义] ([参数的中文含义]，[参数的中文含义]，[参数的中文含义]，...)
//
//  🎨 代码用途：
//      [专业描述：精准的编程术语，描述这段代码的技术目，但要易懂]
//
//  💡 易懂解释：
//      [高中生能懂，正面可爱语气，不使用比喻]
//  
//  ⚠️ 警告：
//      [风险类型]: [具体后果与解决方案]
//      (例如：死锁隐患、内存溢出、数据一致性等。若无特殊风险，写“无特殊风险”)
//  
//  ⚙️ 触发源 (Trigger Source)：
//      [文件/模块] -> [UI交互/事件] -> [函数调用链]
//      (例如：通过 admin_panel.js 后台管理系统的 “强制结算” 按钮 handle_click(参数名,参数名,) -> Admin_Force_Settle(参数名,参数名,) 触发)
// =============================================================================
```

**C. 📍 视觉状态信标 (Visual State Beacons)**
*   **定义**: 优先选用正面、可爱的 Emoji作为**视觉信标**，将代码逻辑映射为人类可读的语义块。
*   **覆盖率**: **注释100%** (除纯括号外)。每一行代码必须有信标。
*   **内容**: **状态/结果导向 (State/Result Oriented)**。
    *   侧重描述代码执行后的 **“状态变化”** 或 **“业务结果”**。
    *   **严禁**使用逗号、长句或“初始化为...”等废话。
    *   **风格**: 词汇偏名词化，简洁有力，像仪表盘的状态灯。
*   **语法适配**: 自动识别 `.py` (#), `.js` (//), `.bat` (REM), `.html` (<!-- -->)。
    *   **特殊规则**: 对于 `.bat` (Batch) 文件，**严禁**在 `if` 或 `for` 代码块内部使用 `::` 风格注释，必须强制使用 `REM`，否则会破坏语法结构。

**示例**:
```python
def calculate_score(points):
    # ... (此处必须有完整的五段式备注) ...
    current_score = 0  # 🥚 基础分归零
    if points > 10:    # ⚖️ 高分阈值判定
        current_score = points * 2  # 🚀 双倍奖励生效
    return current_score # 📤 最终结果交付
```
