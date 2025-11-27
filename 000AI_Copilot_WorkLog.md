# 🤖 000AI-Copilot 工作日志 (Work Log)

**身份**: 000AI-Copilot (GitHub Copilot)
**任务**: 维护与修复 000AI 项目代码，确保自动化协议执行。

## 📅 2025-11-28 修复 Setup 脚本编码与执行问题

### 1. 问题描述
- **症状**: `Web_compute_low_setup.bat` 启动即崩溃 (Crash on startup)。
- **原因**:
    1.  **编码冲突**: 脚本包含中文字符和 Emoji，导致 Batch 解析器在某些 Windows 环境下 (尤其是 Server 版) 崩溃。
    2.  **执行上下文丢失**: 在 Batch 脚本中直接调用另一个 Batch 文件 (如 mock 的 `wsl.cmd`) 而未使用 `call`，导致控制权转移且不返回，脚本提前终止。
    3.  **标签歧义**: 存在重复或歧义的 `goto` 标签 (如 `:WSLMode`)，导致逻辑死循环或跳转错误。

### 2. 修复方案
- **[Sanitization]**: 将脚本中所有 UI 文本重写为英文 (ASCII)，移除所有 Emoji，确保最大兼容性。
- **[Dependency Injection]**: 引入 `%WSL_CMD%` 变量，允许注入 Mock 环境进行沙盒测试。
- **[Call Fix]**: 为所有 `%WSL_CMD%` 调用添加 `call` 前缀，确保子脚本执行后能返回主脚本。
- **[Label Fix]**: 重命名歧义标签 (如 `:WSLMode` -> `:WSLModeTarget`)，消除死循环隐患。
- **[Mock Verification]**: 构建了完整的 Mock WSL 环境 (`Debug/MockWSL/wsl.cmd`)，模拟了 `wsl --status`, `wsl --install`, `bash -c` 等行为，验证了安装、检查、编译全流程。

### 3. 验证结果
- **测试环境**: Mock WSL Sandbox.
- **结果**: 脚本成功通过了环境检查、依赖安装模拟、Rust 安装模拟、编译模拟全流程。
- **交付**: 替换原脚本为修复后的纯英文版本，并归档了测试环境。

### 4. 待办事项
- [ ] 用户需在真实环境中运行 `Web_compute_low_setup.bat` 进行最终验证。

## 📅 2025-11-27 修复记录

### 1. 修复 `Web_compute_low_setup.bat` 注释导致的语法错误
- **问题**: 在 Batch 脚本的 `if (...)` 代码块中使用了 `::` 风格的注释。
- **原因**: Batch 解析器会将 `::` 视为标签 (Label)。在代码块 (括号内) 中，标签是不被允许的，会导致解析错误 (`! was unexpected at this time` 或类似错误)。
- **解决方案**: 将所有代码块内部的 `::` 注释替换为 `REM`。
- **状态**: 已修复。

### 2. 协议优化建议
- **目标**: 防止未来对 `.bat` 文件进行 "注释专家" 处理时再次引入 `::` 导致破坏。
- **行动**: 修改 `.github\copilot-instructions.md`，明确排除 `.bat` 文件参与 Step 3 (注释专家)，或者强制 `.bat` 文件仅使用 `REM`。考虑到 Batch 的脆弱性，建议对 `.bat` 文件豁免复杂的五段式注释，或仅允许在文件头使用。

### 3. 二次修复 (2025-11-27)
- **问题**: `Web_compute_low_setup.bat` 第 416 行在 `if` 代码块内使用了 `::` 注释，导致语法错误。
- **修复**: 将 `:: 再次检查` 替换为 `REM 再次检查`。
- **验证**: 静态检查已通过，无其他代码块内 `::` 使用。

### 4. 协议调整响应
- **用户需求**: 请求修改协议以在 Step 3 中排除 `.bat` 文件。
- **行动**: 更新 `.github\copilot-instructions.md`，在 "注释专家" 触发条件中增加排除规则。

## 📅 2025-11-27 修复 Setup 脚本工作报告

### 1. 初始诊断
- **用户环境**: Windows Server 2022, 4GB RAM, Xeon Platinum 8255C (可能核心数较多，导致默认并发过高)。
- **症状**: 运行 setup 脚本中途死机。
- **推测原因**: Rust 编译 (`cargo`) 或其他构建工具默认根据 CPU 核心数开启并发，导致 4GB 内存瞬间耗尽 (OOM) 或系统颠簸 (Thrashing)。

### 2. 行动计划
1.  读取 `Web_compute_low\Web_compute_low_setup.bat` 内容。
2.  在 `Web_compute_low\Debug\Trash\20251127\` 创建低资源消耗的测试脚本。
3. 注入内存检查和并发限制逻辑 (如 `cargo build -j 1`)。
4. 验证脚本逻辑（模拟运行）。

### 3. 执行记录 (2025-11-27)
- **[已完成]** 创建测试脚本 `Web_compute_low\Debug\Trash\20251127\Web_compute_low_setup_safe.bat`。
- **[优化点]**:
    -   **内存感知**: 自动检测可用内存，若低于 1.5GB 则进入 "Ultra-Safe Mode"。
    -   **降维打击**: 在安全模式下，强制 `CARGO_BUILD_JOBS=1` 和 `RUSTUP_IO_THREADS=1`。
    -   **分而治之**: 将 `apt-get install` 拆分为多个小步骤，避免一次性加载过多包元数据。
    -   **温柔执行**: 使用 `start /low /wait` 降低安装进程优先级，防止系统界面卡死。
    -   **喘息空间**: 在关键步骤间插入 `timeout /t 3`，让磁盘 I/O 有机会回写。
- **[进行中]** 正在执行沙盒验证...
    -   去除交互式 `pause`。
    -   **[修复]** 修正 Batch 脚本中 `if` 块内 `echo` 特殊字符 `( ) < >` 未转义导致的语法错误。
    -   **[修复]** 为 `start` 命令添加 `/b` 参数，确保在同一窗口运行，避免弹出新窗口导致输出丢失或交互阻塞。
    -   启动测试脚本 (第三次尝试)。
    -   **[验证成功]** 脚本成功检测到低内存 (<1.5GB) 并进入 Ultra-Safe Mode。依赖安装步骤顺利执行。

### 4. 代码交付 (Step 3: Comment Expert)
- **[已完成]** 将验证通过的 "Ultra-Safe Mode" 逻辑注入主脚本 `Web_compute_low\Web_compute_low_setup.bat`。
- **[已完成]** 应用 "注释专家" 协议 (Emoji 信标 + 标准头)。

### 5. 最终结论
- 修复已部署到 `Web_compute_low\Web_compute_low_setup.bat`。
- 验证脚本保留在 `Web_compute_low\Debug\Trash\20251127\` 供查阅。
- **建议**: 用户现在可以直接运行 `Web_compute_low\Web_compute_low_setup.bat`，脚本会自动检测内存并开启保护。
- 用户需运行此测试脚本进行验证。
- 若验证通过，将替换主脚本。

### 6. 自动化与健壮性增强 (2025-11-27)
- **任务**: 确保 `Web_compute_low_setup.bat` 在本地环境配置及重装流程中能自动完成，且支持非交互模式。
- **问题**: 脚本中存在多处无条件的 `pause` 命令，导致在非交互模式 (NONINTERACTIVE=1) 下脚本挂起，无法自动化测试。
- **修复**:
    -   **全局扫描**: 识别所有 `pause` 命令。
    -   **条件守卫**: 将所有关键路径上的 `pause` 替换为 `if "%NONINTERACTIVE%"=="1" ( timeout /t 3 >nul ) else ( pause )`。
    -   **错误处理**: 在错误退出路径中，非交互模式直接 `exit /b 1` 而非暂停。
- **验证**:
    -   创建测试脚本 `Debug/Trash/20251127/test_setup.bat`。
    -   验证了脚本在低内存环境下自动进入 "Ultra-Safe Mode"。
    -   验证了依赖安装、Rust 安装及测试程序编译的全流程。
    -   验证了脚本的幂等性 (Idempotency) 和重装逻辑。
- **交付**:
    -   更新了 `Web_compute_low_setup.bat`。
    -   添加了符合规范的文件头注释 (File Header)。
    -   清理了测试产生的临时文件和日志到 `Debug/Trash/20251127/Setup_Verification/`。

### 7. 待解决问题 (Pending Issues)
- **[待解决] WSL 核心完整性检测**: 
    -   当前脚本仅检测 WSL 是否安装 (`wsl --status`) 和发行版是否可用。
    -   若 WSL 子系统本身（Windows Feature）损坏（如内核丢失、服务无法启动），脚本可能无法给出准确的修复指引。
    -   需要增加对 WSL 核心组件的健康检查，并在必要时提示用户重装 WSL 组件。
>  `Web_compute_low\Web_compute_low_setup.bat`

*   **[坑 01] WSL1 文件系统 I/O 死机**
    *   ❌ 现象：在 WSL /home 目录下进行大量小文件读写 (如 rustup install) 导致 Windows Server 死机。
    *   ✅ 对策：采用 "Portable Mode" 策略，将 Rust 安装在当前目录 (NTFS) 下。
    *   👉 状态：已在 RUST_DIR 变量定义及安装路径参数中实现。

*   **[坑 02] 依赖安装顺序 (Dependency Hell)**
    *   ❌ 现象：先装 Rust 后装 GCC，会导致 Cargo 无法找到链接器 (cc)，编译报错。
    *   ✅ 对策：强制先运行 apt-get install build-essential，再运行 rustup-init。
    *   👉 状态：已在 [1.1/4] 依赖检查部分实现。

*   **[坑 03] 无限重装循环 (Infinite Loop)**
    *   ❌ 现象：刚安装完 Rust，脚本末尾尝试 update，因网络超时失败，导致脚本误判环境损坏而删除重装。
    *   ✅ 对策：引入 "JUST_INSTALLED" 标记，初次安装跳过末尾的更新检查。
    *   👉 状态：已在安装成功后设置 set JUST_INSTALLED=1。
*   **[坑 04] 路径空格 (Path with Spaces)**
    *   ❌ 现象：项目若在 "C:\My Projects" 下，Bash 解析变量时会截断。
    *   ✅ 对策：所有传递给 WSL 的路径变量必须用单引号 '' 强行包裹。
    *   👉 状态：已在 RUST_ENV 变量定义处实现。

*   **[坑 05] 隐形密码困惑 (Invisible Password)**
    *   ❌ 现象：Ubuntu 初始化时输入密码不回显，用户以为键盘坏了或卡死。
    *   ✅ 对策：在安装前输出详细的“新手安装指南”，明确告知密码是隐形的。
    *   👉 状态：已在 :DistroNotFound 标签下的 echo 提示中实现。

*   **[坑 06] 假性安装失败 (False Positives)**
    *   ❌ 现象：WSL 安装完成后常报 "Create process failed" 或 "Broken pipe"，但其实系统已就绪。
    *   ✅ 对策：提示用户忽略特定错误，并提供 "2. 重置/修复" 选项作为兜底。
    *   👉 状态：已在安装引导文案中说明。

*   **[坑 07] 资源耗尽卡死 (Resource Exhaustion)**
    *   ❌ 现象：Rustup 解压组件时 CPU 飙升导致死机。
    *   ✅ 对策：强制设置 RUSTUP_IO_THREADS=1 单线程解压。
    *   👉 状态：已在 rustup-init 调用命令中 export 该变量。

*   **[坑 19] 控制台 I/O 阻塞 (Console I/O Freeze)**
    *   ❌ 现象：在 Windows Server (特别是 RDP 远程) 环境下，如果命令行快速输出大量文本 (如 apt-get 进度条)，会导致 `conhost.exe` 占用极高 CPU，甚至导致界面死锁。
    *   ✅ 对策：**官方推荐做法**是将详细日志重定向到文件，仅在屏幕显示关键进度。
    *   👉 状态：计划在下一次修复中引入 `> setup.log 2>&1` 重定向策略。

*   **[坑 20] WSL1 内存不可控 (WSL1 Memory Leak)**
    *   ❌ 现象：WSL1 与 Windows 共享内存，且没有 `.wslconfig` 限制能力。一旦 Linux 进程 (如 rustc) 吃光内存，Windows 内核会挂起。
    *   ✅ 对策：除了应用层限制 (Jobs=1) 外，必须增加 `timeout` 强制冷却时间，让 Windows 内存管理器有机会回收 Pagefile。
    *   👉 状态：已在分步安装中增加 `timeout /t 5`。

*   **[坑 21] 幽灵下载 (Phantom Download)**
    *   ❌ 现象：`curl` 下载脚本时因网络波动导致文件截断 (如只下载了一半)，但未报错。后续 `sh` 执行时报语法错误或莫名其妙的失败。
    *   ✅ 对策：下载后必须校验文件大小 (至少 >10KB) 或检查文件尾部标记。
    *   👉 状态：计划在 Setup 脚本中增加文件大小检查。

*   **[坑 22] 启动找不到文件 (Start File Missing)**
    *   ❌ 现象：用户直接运行 `start.bat`，但因未运行 `build.bat` 导致 `Debug/simple_server` 缺失，WSL 报 "No such file or directory" 或误报为磁盘错误。
    *   ✅ 对策：在 `start.bat` 中增加文件存在性检查，若缺失则引导用户先构建。
    *   👉 状态：已修复。

*   **[坑 23] Batch 重定向歧义 (Redirection Ambiguity)**
    *   ❌ 现象：使用 `start /b ... > log` 时，CMD 可能会错误地解析重定向符号，导致新窗口闪退或日志为空。
    *   ✅ 对策：必须将整个命令包裹在 `cmd /c "..."` 中，明确重定向的作用域。例如：`start /b ... cmd /c "command > log 2>&1"`。
    *   👉 状态：已在 Setup 脚本的所有后台任务中应用。

*   **[坑 24] 协议违规：交互式暂停 (Protocol Violation: Interactive Pause)**
    *   ❌ 现象：测试脚本 `test_chmod.bat` 包含了 `pause` 命令，导致自动化流程卡死在“请按任意键继续...”，违反了“零交互”原则。
    *   ✅ 对策：已更新协议 (`.github\copilot-instructions.md`)，明确禁止在测试脚本中使用 `pause`。建议使用 `timeout /t 1 >nul` 代替。

*   **[坑 25] WSL 核心损坏 (WSL Core Corruption)**
    *   ❌ 现象：`wsl --status` 返回成功，但 `wsl --list` 或实际执行命令时挂起/报错。这通常是 WSL 服务异常或内核文件丢失。
    *   ✅ 对策：在 Setup 脚本中增加 `wsl --list` 作为完整性检查点。若失败，引导用户运行 `wsl --update`。
    *   👉 状态：已在 `Web_compute_low_setup.bat` 中实现。

## 📅 2025-11-27 自动化与交互体验优化

### 1. 需求分析
- **用户反馈**: 
    1. VS Code 重启后加载慢。
    2. `Web_compute_low` 脚本运行需要人工点击“允许”或按键，未实现全自动。
    3. 环境变量设置不够完美，希望首次安装静默，后续修复时弹窗。
    4. 缺少 WSL 核心完整性检测。

### 2. 实施方案
- **VS Code 优化**:
    -   修改 `.vscode/settings.json`，排除 `target` 和 `Debug/Trash` 目录的监视与搜索，提升加载速度。
    -   添加 `chat.tools.terminal.autoApprove` 白名单 (`wsl`, `cargo`, `cmd` 等)，消除 Copilot 执行命令时的弹窗确认。
- **脚本自动化改造**:
    -   **强制非交互**: 在 `Web_compute_low` 的 setup, build, start, package 脚本中引入 `NONINTERACTIVE` 变量。
    -   **消除阻塞**: 将所有 `pause` 替换为 `timeout` (在非交互模式下)。
    -   **智能交互模式**: `setup.bat` 自动检测是否为全新安装。若是全新安装，默认静默执行；若是已存在环境（可能损坏），默认开启交互菜单供用户选择修复。
- **增强重置逻辑**:
    -   `:FactoryReset` 现在不仅卸载 Ubuntu 发行版，还会彻底删除 Windows 侧挂载的 Rust 独立环境目录 (`no_code\wsl_rust_env`)，确保“Linux + Rust”双重重置。



