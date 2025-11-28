# 🛡️ 000AI Environment & Safety Protocol (v2.0)

## 🌍 环境感知与资源适配 (Environment Awareness & Resource Adaptation)

**1. 🕵️ 环境侦察 (Reconnaissance)**
*   **OS 指纹**: 脚本必须首先检测 OS 版本 (Server vs Client) 和构建号。
    *   **Server 特例**: 检测到 Windows Server 时，必须自动切换至“无商店模式” (Store-Bypass Mode)。
*   **工具链检查**: 严禁假设 `winget`, `store`, `wsl` 存在。必须检查并提供 `curl`/`powershell` 回退方案。
*   **资源审计**: 启动前检查 RAM 和 CPU 核心数。
    *   **低配策略 (<4GB RAM)**: 强制串行构建 (`-j1`)，禁用并行下载，开启 `SAFE_MODE`。

**2. 🤐 强制输入饥饿 (Mandatory Input Starvation)**
*   **核心原则**: 任何工具调用必须显式禁用交互。
*   **参数白名单**:

| 工具 | 强制参数 | 作用 |
| :--- | :--- | :--- |
| `pip` | `--no-input` | 防止等待确认 |
| `npm` | `--yes` 或 `npm ci` | 自动确认安装 |
| `apt` | `-y`, `DEBIAN_FRONTEND=noninteractive` | 静默安装 |
| `python` | `< nul` (Windows) | 切断标准输入 |
| `cmd` | `/c`, `< nul` | 防止批处理暂停 |
| `powershell` | `-NonInteractive` | 禁用交互模式 |

**3. 🧱 依赖自给 (Dependency Self-Sufficiency)**
*   **零预设**: 假设目标机器是裸机 (Vanilla OS)，无预装环境。
*   **离线优先**: 关键依赖 (如 Appx 包, 编译器) 优先尝试本地缓存 (`Debug/Cache/`)，失败后再联网下载。
*   **手动回退**: 自动化安装失败时，必须提供清晰的手动操作 URL 和步骤，严禁直接报错退出。

---

## 🛡️ 文件回收协议 (Document Recycling Agreement)

**1. 📜 资源分配表 (Resource Allocation Table)**
*   **位置**: `Debug/Trash/000AI_Resource_Manifest.json`
*   **规则**: 创建临时文件前必须写入 **[资源分配表]**。
*   **格式**: `{"target_path": "...", "origin": "test_script_A", "status": "active"}`

**2. 💾 断电恢复 (Crash Recovery)**
*   **启动检查**: 新对话必须检查 **[资源分配表]**。
*   **强制归档**: 发现 `active` 残留文件，立即移至 `Debug/Trash/Recovered_<Date>/`。

**3. 🧹 闭环回收 (Loop Recycling)**
*   **时机**: 验证阶段结束或任务完成时。
*   **动作**: 移动临时文件至 `Debug/Trash/<YYYYMMDD>/<Step_Name>/`，扫描根目录清理 `test_*`, `*.log`。
*   **审计**: 记录至 `Debug/Trash/<YYYYMMDD>/Recycle_Log.json`。
*   **状态**: 更新 `active` 的状态为 `discard`。
*   **豁免**: `.lnk` 文件保留。

**4. 🛡️ 安全规范 (Safety Standards)**
*   **保留字规避**: 严禁创建 `nul`, `con` 等 Windows 保留字文件。
