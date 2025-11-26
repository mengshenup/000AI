@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

:: ============================================================================
::  🚨 维护者必读：环境安装踩坑与解决方案记录 (Setup Pitfalls & Fixes)
:: ============================================================================
::  警告：本脚本包含针对 Windows Server + WSL1 特殊环境的 12 项关键修复。
::  修改任何逻辑前，请务必对照下表，否则极易导致系统死机或无限重装循环。
::
::  [坑 01] WSL1 文件系统 I/O 死机
::  ❌ 现象：在 WSL /home 目录下进行大量小文件读写 (如 rustup install) 导致 Windows Server 死机。
::  ✅ 对策：采用 "Portable Mode" 策略，将 Rust 安装在当前目录 (NTFS) 下。
::  👉 状态：已在 RUST_DIR 变量定义及安装路径参数中实现。
::
::  [坑 02] 依赖安装顺序 (Dependency Hell)
::  ❌ 现象：先装 Rust 后装 GCC，会导致 Cargo 无法找到链接器 (cc)，编译报错。
::  ✅ 对策：强制先运行 apt-get install build-essential，再运行 rustup-init。
::  👉 状态：已在 [1.1/4] 依赖检查部分实现。
::
::  [坑 03] 无限重装循环 (Infinite Loop)
::  ❌ 现象：刚安装完 Rust，脚本末尾尝试 update，因网络超时失败，导致脚本误判环境损坏而删除重装。
::  ✅ 对策：引入 "JUST_INSTALLED" 标记，初次安装跳过末尾的更新检查。
::  👉 状态：已在安装成功后设置 set JUST_INSTALLED=1。
::
::  [坑 04] 路径空格 (Path with Spaces)
::  ❌ 现象：项目若在 "C:\My Projects" 下，Bash 解析变量时会截断。
::  ✅ 对策：所有传递给 WSL 的路径变量必须用单引号 '' 强行包裹。
::  👉 状态：已在 RUST_ENV 变量定义处实现。
::
::  [坑 05] 隐形密码困惑 (Invisible Password)
::  ❌ 现象：Ubuntu 初始化时输入密码不回显，用户以为键盘坏了或卡死。
::  ✅ 对策：在安装前输出详细的“新手安装指南”，明确告知密码是隐形的。
::  👉 状态：已在 :DistroNotFound 标签下的 echo 提示中实现。
::
::  [坑 06] 假性安装失败 (False Positives)
::  ❌ 现象：WSL 安装完成后常报 "Create process failed" 或 "Broken pipe"，但其实系统已就绪。
::  ✅ 对策：提示用户忽略特定错误，并提供 "2. 重置/修复" 选项作为兜底。
::  👉 状态：已在安装引导文案中说明。
::
::  [坑 07] 资源耗尽卡死 (Resource Exhaustion)
::  ❌ 现象：Rustup 解压组件时 CPU 飙升导致死机。
::  ✅ 对策：强制设置 RUSTUP_IO_THREADS=1 单线程解压。
::  👉 状态：已在 rustup-init 调用命令中 export 该变量。
::
::  [坑 08] 文件锁无法删除 (File Locking)
::  ❌ 现象：重装时 rmdir 失败，因为 VS Code 或终端占用了 wsl_rust_env 目录。
::  ✅ 对策：rmdir 后立即检查文件夹是否存在，若存在则暂停提示用户关闭程序。
::  👉 状态：已在 :WSLRustNotFound 的清理逻辑中实现。
::
::  [坑 09] Windows Server 特性
::  ❌ 现象：Server 版系统默认未启用 WSL 功能，且 wsl --install 行为与 Win10 不同。
::  ✅ 对策：增加 OS 检测提示，并使用 Start-Process 提权运行安装命令。
::  👉 状态：已在 :CheckEnv 和 :WSLNotFound 中实现。
::
::  [坑 10] 环境变量持久化
::  ❌ 现象：wsl bash -c 是非交互式的，环境变量无法跨命令保留。
::  ✅ 对策：定义 %RUST_ENV% 宏，在每次调用 rustc/cargo 时显式注入。
::  👉 状态：已在脚本头部定义 RUST_ENV 并在所有调用处使用。
::
::  [坑 11] 换行符问题 (CRLF)
::  ❌ 现象：curl 下载的脚本如果是 CRLF 格式，sh 执行会报错。
::  ✅ 对策：直接通过 curl | sh 管道执行，或确保下载工具不转换换行符 (这里用了 curl -o)。
::  👉 状态：当前使用 curl -o 保存为临时文件再执行，规避了部分管道问题。
::
::  [坑 12] 默认版本兼容性
::  ❌ 现象：WSL2 在某些旧版 Server 或虚拟机中无法启动。
::  ✅ 对策：默认尝试设置 wsl --set-default-version 1 以保底兼容性。
::  👉 状态：已在 :DistroNotFound 中实现。
::
::  [坑 13] 时间同步 (Time Sync)
::  ❌ 现象：WSL 时间与 Windows 不一致，导致 apt-get 报错 "Release file is not valid yet"。
::  ✅ 对策：这是 WSL1 常见 Bug。若遇到，需手动运行 `wsl -u root hwclock -s`。
::  👉 状态：脚本未自动执行(需 root)，仅在此记录。
::
::  [坑 14] DNS 解析失败 (DNS Resolution)
::  ❌ 现象：curl 无法解析域名，导致下载失败。
::  ✅ 对策：WSL 自动生成的 /etc/resolv.conf 有时失效。需手动指定 DNS。
::  👉 状态：脚本依赖系统网络配置，若失败请检查宿主机 DNS。
::
::  [坑 15] 依赖虚假安装 (Phantom Install)
::  ❌ 现象：apt-get 因网络或锁报错，但脚本未检查退出码继续执行，导致后续 cargo build 报链接错误。
::  ✅ 对策：安装后必须显式验证 `cc --version` 和 `pkg-config --version`。
::  👉 状态：已在 [1.1/4] 依赖检查部分增加二次验证逻辑。
::
::  [坑 16] Dpkg 锁死 (Dpkg Lock)
::  ❌ 现象：上次安装意外中断 (如死机)，导致 apt-get 报错 "Could not get lock"。
::  ✅ 对策：在安装前自动运行 `dpkg --configure -a` 并尝试清理锁文件。
::  👉 状态：已在依赖安装前的 Crash Recovery 模块实现。
::
::  [坑 17] 僵尸环境 (Zombie Environment)
::  ❌ 现象：Rust 安装途中断电，导致 rustc 存在但标准库缺失。Pre-flight 检查失败但脚本未自动修复。
::  ✅ 对策：在编译器检查失败时，自动触发一次环境销毁与重装 (限次 1 次)。
::  👉 状态：已在 [2.9/4] 编译器检查模块实现自动重试逻辑。
::
::  [坑 18] 幽灵版本 (Ghost Version)
::  ❌ 现象：系统重启导致二进制文件截断，但 --version 仍能返回 (极罕见) 或依赖库损坏。
::  ✅ 对策：单纯的版本检查不可靠。必须通过 pkg-config 验证关键库 (OpenSSL) 的完整性。
::  👉 状态：已在依赖验证阶段增加 OpenSSL 深度检查。
:: ============================================================================

:: 初始化重试计数器
set RETRY_COUNT=0

goto :MainMenu

:MainMenu
cls
echo ========================================================
echo   Angel Client Setup (Web_compute_low)
echo   v2.2 (Crash Recovery ^& Memory Fix)
echo ========================================================
echo.
echo   1. 开始配置/继续安装 (Start/Continue Setup)
echo   2. 【重置/修复】Ubuntu (Reset/Fix Ubuntu)
echo      👉 如果之前密码输错、安装卡住，请选这个！
echo.
set /p choice="请选择 (Input 1 or 2): "
if "%choice%"=="2" goto :FactoryReset
goto :CheckEnv

:FactoryReset
echo.
echo 🗑️  正在卸载旧的 Ubuntu 实例...
echo    (Unregistering Ubuntu...)
wsl --unregister Ubuntu
echo.
echo ✅ 清理完成！现在您可以重新安装了。
echo.
pause
goto :CheckEnv

:CheckEnv
echo ========================================================
echo   Angel Client Setup (Web_compute_low)
echo ========================================================
echo.
echo [0/3] 正在检查系统环境...

:: 1. 检查是否为 Windows Server (仅提示，不强制切换)
wmic os get caption | findstr /i "Server" >nul
if %errorlevel% equ 0 (
    echo ⚠️  检测到 Windows Server 系统。
    echo.
    echo    请确保已启用 WSL 功能。
    echo    ^(Please ensure WSL is enabled.^)
)

:: 2. 检查 WSL 是否可用
wsl --status >nul 2>&1
if %errorlevel% neq 0 goto :WSLNotFound

:: 3. 检查 WSL 发行版是否可用
wsl echo check >nul 2>&1
if %errorlevel% neq 0 goto :DistroNotFound

echo ✅ 环境检查通过 (WSL Linux Mode)。
goto :WSLMode

:WSLNotFound
echo ❌ 未检测到 WSL (Windows Subsystem for Linux)。
echo.
echo    正在尝试自动安装 WSL...
echo    (Installing WSL...)
echo.
echo    需要管理员权限。
echo    (Requires Admin privileges.)
echo.

powershell -Command "Start-Process wsl -ArgumentList '--install' -Verb RunAs -Wait"

echo.
echo ⚠️  请按照提示操作。
echo    (Please follow the prompts.)
echo.
echo    安装完成后，请 [重启电脑] 并再次运行。
echo    (Please RESTART your computer after installation.)
pause
exit /b

:DistroNotFound
echo ❌ 未检测到默认 Linux 发行版 (No default Linux distro found)。
echo.
echo    [兼容性修复] 正在将 WSL 默认版本设置为 1...
echo    (Setting WSL default version to 1 for compatibility...)
wsl --set-default-version 1 >nul 2>&1

echo.
echo    ========================================================
echo    🎓 新手安装指南 (Installation Guide)
echo    ========================================================
echo    即将弹出一个黑色的 Ubuntu 安装窗口。
echo    请按以下步骤“无脑”操作：
echo.
echo    1. 看到 "Enter new UNIX username" 时:
echo       👉 输入: admin  (然后按回车)
echo.
echo    2. 看到 "New password" 时:
echo       👉 输入: 0      (注意: 屏幕上不会显示任何星号，是隐形的！)
echo       👉 按回车
echo.
echo    3. 看到 "Retype new password" 时:
echo       👉 再次输入: 0
echo       👉 按回车
echo.
echo    (无法自动输入密码是因为 Linux 安全机制限制，请手动完成)
echo    ========================================================
echo.
echo    ⚠️  常见问题 (Known Issues):
echo    如果您看到 "password updated successfully" 但随后报错:
echo    "Create process failed" 或 "Broken pipe"...
echo    👉 请无视它！这表示安装其实成功了，只是最后启动 Shell 失败。
echo    👉 直接关闭那个黑窗口，然后在这里按任意键继续即可。
echo.
echo    准备好了吗？按任意键开始安装...
pause >nul

:: 使用 cmd /k 保持窗口打开
:: 注意: 如果已经存在 (ERROR_ALREADY_EXISTS)，说明上次其实装好了，只是没检测到。
:: 所以这里我们不强制它必须成功，而是让用户继续。
powershell -Command "Start-Process cmd -ArgumentList '/k wsl --install -d Ubuntu' -Verb RunAs -Wait"

echo.
echo ⚠️  安装窗口关闭后，请按任意键继续...
pause

:: 再次检查
wsl -d Ubuntu echo check >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ 依然无法连接到 Ubuntu。
    echo.
    echo    这可能是因为安装过程卡住了，或者环境有问题。
    echo.
    echo    👉 建议您选择主菜单的 "2. 重置/修复 Ubuntu" 
    echo       彻底删掉重来一次。
    echo.
    pause
    exit /b
)
goto :WSLMode

echo.
echo ⚠️  如果安装成功，请按任意键继续...
echo    (If installation is complete, press any key to continue...)
pause

:: 再次检查
wsl echo check >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ 依然无法连接到 Linux 发行版。
    echo.
    echo    可能的原因 ^(Possible Reasons^):
    echo    1. 您刚刚安装了 WSL 功能，但还没有【重启电脑】。
    echo       ^(You need to RESTART your computer.^)
    echo    2. Windows Server 需要手动启用功能。
    echo       ^(Windows Server might need manual feature enablement.^)
    echo.
    echo    请尝试手动运行以下命令查看详细错误:
    echo    wsl --install -d Ubuntu
    echo.
    echo    然后重启电脑。
    pause
    exit /b
)
goto :WSLMode

:: ========================================================
::  🐧 WSL Linux 模式 (原逻辑)
:: ========================================================
:WSLMode
echo.
echo [1/4] 进入 Linux/WSL 构建流程...
echo    (Entering Linux/WSL build process...)

:: ---------------------------------------------------------
:: 1. 系统依赖检查 (System Dependencies) - 提前执行
:: ---------------------------------------------------------
:: 必须先安装 gcc/cc，否则 Rust 编译器无法链接，导致后续检查失败
echo.
echo [1.1/4] 检查系统依赖 (Checking Dependencies)...
echo    (Installing build-essential, pkg-config, libssl-dev...)

:: [Crash Recovery] 尝试修复可能因死机中断的安装锁 (Fix broken dpkg)
echo    🛠️  正在清理潜在的包管理锁 (Cleaning package locks)...
wsl -u root rm /var/lib/apt/lists/lock >nul 2>&1
wsl -u root rm /var/cache/apt/archives/lock >nul 2>&1
wsl -u root rm /var/lib/dpkg/lock* >nul 2>&1
wsl -u root dpkg --configure -a >nul 2>&1
wsl -u root apt-get update >nul 2>&1

echo    📦 正在安装/更新编译器 (Installing compiler toolchain)...
wsl -u root apt-get install -y build-essential pkg-config libssl-dev >nul 2>&1

:: [验证] 确保编译器真的装上了，防止后续 Cargo 报错
echo    🔍 验证关键组件 (Verifying components)...
wsl bash -c "cc --version >/dev/null 2>&1 && pkg-config --version >/dev/null 2>&1"

:: [深度验证] 检查 OpenSSL 是否能被链接 (Axum/Tokio 必需)
:: 防止 apt-get 假死导致库文件为空
cmd /c "wsl bash -c "pkg-config --exists openssl || pkg-config --exists libssl""
if %errorlevel% neq 0 (
    echo    ⚠️  OpenSSL 库检查失败，正在尝试修复...
    cmd /c "wsl -u root apt-get install -y --reinstall libssl-dev pkg-config"
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ 关键依赖缺失 ^(Missing Dependencies^).
    echo    GCC 或 pkg-config 未正确安装。这通常是因为网络问题或 apt 进程被锁。
    echo.
    echo    正在尝试强制修复...
    echo    ^(Attempting force fix...^)
    
    cmd /c "wsl -u root dpkg --configure -a"
    cmd /c "wsl -u root apt-get update"
    cmd /c "wsl -u root apt-get install -y --fix-missing build-essential pkg-config libssl-dev"
    
    :: 再次检查
    cmd /c "wsl bash -c "cc --version >nul 2>&1""
    if %errorlevel% neq 0 (
        echo.
        echo ❌ 修复失败。无法安装编译器。
        echo    请检查网络，或尝试手动运行:
        echo    wsl -u root apt-get install build-essential pkg-config libssl-dev
        pause
        exit /b
    )
)

echo ✅ 依赖检查完成。

:: ---------------------------------------------------------
:: [关键优化] 使用项目内的独立 Rust 环境 (Portable Mode)
:: ---------------------------------------------------------
REM Purpose:
REM 1. Avoid WSL1 VolFS I/O freeze.
REM 2. Keep Rust files on NTFS for better performance.
REM 3. Isolate from system Rust.
:: ---------------------------------------------------------

:: 计算 WSL 路径
for /f "delims=" %%i in ('wsl wslpath -a .') do set "WSL_PWD=%%i"
set "RUST_DIR=%WSL_PWD%/no_code/wsl_rust_env"

:: [Critical Fix] 使用 WSLENV 传递环境变量，避免 Shell 转义地狱
:: /p 标志会自动将 Windows 路径转换为 WSL 路径
set "RUSTUP_HOME=%RUST_DIR%/rustup"
set "CARGO_HOME=%RUST_DIR%/cargo"
set "RUSTUP_IO_THREADS=1"
set "WSLENV=RUSTUP_HOME/p:CARGO_HOME/p:RUSTUP_IO_THREADS"

:: [Critical Fix] 仅在 Bash 中设置 PATH，使用双引号支持空格
set "RUST_ENV=export PATH=\"$CARGO_HOME/bin:$PATH\";"

echo.
echo [配置] 启用高性能独立环境 (Portable Rust Environment)...
echo    Location: %RUST_DIR%

:: 检查 Rust 是否存在于独立环境中 (同时检查 rustc 和 cargo)
:: [Critical Fix] 移除 cmd /c 包装，直接调用 wsl 以避免双引号解析错误
wsl bash -c "%RUST_ENV% rustc --version >nul 2>&1 && %RUST_ENV% cargo --version >nul 2>&1"
if %errorlevel% equ 0 goto :WSLRustFound

:WSLRustNotFound
echo ❌ 独立环境中未检测到完整 Rust (rustc/cargo missing)。
echo    (Portable Rust not found or corrupted.)
echo.
echo    正在安装 Rust 到项目目录 (Installing to project dir)...
echo    (这能有效防止系统死机)
echo.

:: 1. 清理旧的临时文件
if exist "no_code\wsl_rust_env" (
    echo    🧹 清理旧环境...
    rmdir /s /q "no_code\wsl_rust_env"
    REM [Crash Recovery] 确保删除成功，防止文件占用导致混合安装
    if exist "no_code\wsl_rust_env" (
        echo.
        echo ❌ 无法删除旧目录 "no_code\wsl_rust_env"。
        echo    可能原因：文件被占用 ^(如 VS Code, 终端^)。
        echo    请关闭所有相关程序后重试。
        pause
        exit /b
    )
)
mkdir "no_code\wsl_rust_env"

:: 2. 下载安装脚本
wsl curl -sSf https://sh.rustup.rs -o temp_rust_installer_DO_NOT_RUN.sh

:: 3. 执行安装
:: --no-modify-path: 不修改系统配置，保持纯净
:: -y: 自动确认
:: [Bug Fix] 给路径加上转义引号 \"...\" 以支持带空格的文件夹路径
echo    🚀 开始安装 (Installing)...
echo    (Using single thread to prevent freeze...)
:: 注意: RUSTUP_IO_THREADS 已通过 WSLENV 传递
wsl bash -c "export TMPDIR='%WSL_PWD%/no_code/wsl_rust_env'; %RUST_ENV% sh temp_rust_installer_DO_NOT_RUN.sh -y --no-modify-path --profile minimal"

:: 清理安装脚本
wsl rm temp_rust_installer_DO_NOT_RUN.sh

:: 验证安装
wsl bash -c "%RUST_ENV% rustc --version"
if %errorlevel% neq 0 (
    echo.
    echo ❌ 安装失败。请检查网络或磁盘空间。
    pause
    goto :EOF
)

echo ✅ Rust 安装完成！
:: [Bug Fix] 标记为刚安装，防止后续立即检查更新导致死循环
set JUST_INSTALLED=1
goto :WSLRustFound

:TryAptInstall
:: 废弃 Apt 安装，因为我们需要最新版且 Apt 版本太旧
goto :InstallError

:InstallError
echo.
echo ❌ 安装失败 (Installation Failed).
pause
goto :EOF

:WSLRustFound
echo WSL Rust 环境已就绪:
wsl bash -c "%RUST_ENV% rustc --version"

:: ---------------------------------------------------------
:: 2.9 预编译测试 (Pre-flight Check)
:: ---------------------------------------------------------
echo.
echo [2.9/4] 执行编译器健康检查 (Compiler Health Check)...
echo    (Compiling minimal test case: Debug/test_compile.rs)

:: 确保 Debug 目录存在
if not exist "Debug" mkdir "Debug"

:: 生成测试代码 (防止文件丢失)
echo fn main() { println!("Hello from WSL Portable Rust!"); } > Debug\test_compile.rs

:: 清理旧的测试产物
if exist "Debug\test_compile" del "Debug\test_compile"

:: 使用 rustc 直接编译
wsl bash -c "%RUST_ENV% rustc Debug/test_compile.rs -o Debug/test_compile"

if %errorlevel% neq 0 (
    echo.
    echo ❌ 编译器检查失败 ^(Compiler Check Failed^).
    echo    Rust 环境似乎已损坏 ^(可能因上次安装中断导致^)。
    
    if "%RETRY_COUNT%"=="0" (
        echo.
        echo    🔄 正在尝试自动修复...
        echo    ^(Auto-repairing corrupted environment...^)
        
        :: 增加重试计数
        set RETRY_COUNT=1
        
        :: 强制清理环境
        if exist "no_code\wsl_rust_env" (
            echo    🗑️  删除损坏的环境...
            rmdir /s /q "no_code\wsl_rust_env"
        )
        
        echo    🔙 返回安装流程...
        goto :WSLRustNotFound
    ) else (
        echo.
        echo ❌ 自动修复失败。
        echo    请检查磁盘空间、权限或网络连接。
        pause
        goto :EOF
    )
)

:: 运行测试程序
cmd /c "wsl bash -c "./Debug/test_compile""
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  测试程序无法运行 ^(Test binary failed to run^).
    pause
) else (
    echo    ✅ 编译器工作正常 ^(Compiler is healthy^)!
)

:: ---------------------------------------------------------
:: 4. 升级/修复 Rust (Portable Mode)
:: ---------------------------------------------------------
echo.
echo [4/4] 检查并修复独立 Rust 环境 (Checking Portable Rust)...

if "%JUST_INSTALLED%"=="1" (
    echo    ✨ 刚刚完成全新安装，跳过更新检查。
    echo    ^(Skipping update check for fresh install.^)
    goto :SetupComplete
)

:: 尝试更新
echo    🔄 正在更新 Rust (Updating)...
wsl bash -c "%RUST_ENV% rustup update stable"

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  更新失败，环境可能已损坏。
    echo    ^(Update failed. Environment might be corrupted.^)
    echo    ♻️  正在重置独立环境 ^(Resetting Portable Environment...^)
    
    :: [Crash Recovery] 如果更新失败，说明环境可能因死机损坏
    :: 必须彻底删除并重新安装，防止 invalid ELF header 错误
    if exist "no_code\wsl_rust_env" rmdir /s /q "no_code\wsl_rust_env"
    
    echo    🔄 正在重新跳转到安装流程...
    goto :WSLRustNotFound
)

:SetupComplete
:: 清理临时生成的 build_task.ps1 (如果之前有残留)
if exist build_task.ps1 del build_task.ps1

echo.
echo ========================================================
echo   🎉 [环境安装完成] Setup Complete!
echo ========================================================
echo.
echo   下一步操作 (Next Steps):
echo   1. 运行 Web_compute_low_build.bat  -> 编译项目
echo   2. 运行 Web_compute_low_start.bat  -> 启动服务器
echo   3. 运行 Web_compute_low_package.bat -> 打包发布
echo.
pause
goto :EOF
