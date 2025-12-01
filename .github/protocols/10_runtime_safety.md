# 🛡️ 000AI 运行时安全规范 (v3.0)

> ⚠️ **核心要求**: 本规范定义的所有安全措施，必须在 `20_coding_workflow.md` 的 `<plan>` 阶段显式验证。

## 🤖 自动化执行标准

**1. 🤐 自动输入交互指令 (Auto-Input Interaction Instructions)**
*   **原则**: 必须预判命令行的交互需求，并通过管道 (`|`)、重定向 (`<`) 或参数 (`-y`) **主动注入** 所需输入，确保进程自动流转。
*   **实现策略**:
    1.  **参数优先**: 优先使用工具自带的自动应答参数 (如 `-y`, `--yes`)。
    2.  **管道注入**: 对于无自动参数的工具，使用管道传递输入。
        *   PowerShell: `'y' | command` 或 `"input string" | command`
        *   CMD: `echo y | command`
    3.  **输入流控制**: 仅在无需任何输入时，才使用 `< nul` 切断输入流以防挂起。
*   **工具适配表**:
| 工具 | 自动输入方法 | 效果 |
| :--- | :--- | :--- |
| `npm` | `--yes` 或 `npm ci` | 自动确认/安装 |
| `apt` | `-y` | 自动确认操作 |
| `pip` | `--no-input` | 自动处理提示 (默认行为) |
| `python` | `echo "input" | python script.py` | 管道注入输入 |
| `cmd` | `echo y | command` | 管道注入确认 |
| `powershell` | `"y" | command` | 管道注入确认 |

## 🕵️ 环境验证
*   **预检**: 在执行资源密集型任务前，验证 CPU、RAM 和 OS 版本。
*   **兼容性**: 优先采用跨平台、低依赖的实现方案。确保在低配置硬件上的可用性。

## 🛡️ 测试文件创建规范

**1. 📂 目录结构标准**
*   **根目录**: `C:\000AI\Debug\<ProjectName>\`
*   **标准子目录**:
    *   `test_code\` (测试脚本/程序)
    *   `Trash\` (临时/一次性制品)
    *   `Logs\` (执行日志)
    *   `no_code\` (环境/依赖/安装包)
    *   `\` (清单文件)

**2. 🏗️ 测试文件创建规范 (Test File Creation Standards)**
*   **路径强制**:
    *   测试 -> `C:\000AI\Debug\<ProjectName>\test_code\`
    *   临时 -> `C:\000AI\Debug\<ProjectName>\Trash\`
    *   日志 -> `C:\000AI\Debug\<ProjectName>\Logs\`
    *   依赖 -> `C:\000AI\Debug\<ProjectName>\no_code\`
    **目录**:`<ProjectName>` 为子目录 (默认: `Web_compute_low`)。
*   **清单登记**:
    *   文件创建后，必须更新 `C:\000AI\Debug\<ProjectName>\Resource_Manifest.json`。
    *   条目格式: `{"path": "...", "type": "test_code", "created_at": "...", "status": "active"}`。
*   **禁止事项**:
    *   禁止在根目录直接创建文件 (清单除外)。
    *   禁止使用 Windows 保留名称 (`nul`, `con`, `prn` 等)。

## ⏱️ 进度追踪日志 (Progress Tracking Log)

**1. 💓 活动日志 (`000AI_Copilot_WorkLog.md`)**
*   **位置**: 项目根目录 (`C:\000AI\000AI_Copilot_WorkLog.md`)
*   **触发条件**:在状态转换时 (Plan、Logic、Code、Test、Reflexion、Annotation)。
*   **内容**: 当前操作的自然语言描述。
*   **格式**: `[YYYY-MM-DD HH:MM] 🔄 [State]: 执行中... (下一步: ...)`
    *   `[State]` 写: `Plan`, `Logic`, `Code`, `Test`, `Reflexion`, `Annotation`。
