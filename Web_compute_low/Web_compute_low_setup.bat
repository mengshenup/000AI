@echo off
setlocal
chcp 65001 >nul
goto :MainMenu

:MainMenu
cls
echo ========================================================
echo   Angel Client Setup (Web_compute_low)
echo   v2.2 (Crash Recovery & Memory Fix)
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
    echo    (Please ensure WSL is enabled.)
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
    echo    可能的原因 (Possible Reasons):
    echo    1. 您刚刚安装了 WSL 功能，但还没有【重启电脑】。
    echo       (You need to RESTART your computer.)
    echo    2. Windows Server 需要手动启用功能。
    echo       (Windows Server might need manual feature enablement.)
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
echo [1/3] 进入 Linux/WSL 构建流程...
echo    (Entering Linux/WSL build process...)

:: 检查 WSL 内的 Rust 环境
echo.
echo [2/3] 正在检查 WSL 内的 Rust 环境...
:: 使用 cmd /c 防止检测命令崩溃脚本
cmd /c "wsl cargo --version >nul 2>&1"
if %errorlevel% equ 0 goto :WSLRustFound

:WSLRustNotFound
echo ❌ WSL 内未检测到 Rust 环境。
echo    (Rust not found in WSL.)
echo.
echo    正在尝试自动安装 Rust...
echo    (Installing Rust...)
echo.

:: 尝试重启 WSL 实例
wsl --terminate Ubuntu >nul 2>&1

echo    正在下载并安装... (Downloading and Installing...)

:: 分步执行，避免管道符 | 导致 CMD 解析崩溃
echo    [1/2] Downloading installer...
cmd /c "wsl curl -sSf https://sh.rustup.rs -o rustup-init.sh"
if %errorlevel% neq 0 goto :InstallError

echo    [2/2] Running installer (Minimal Profile)...
echo    (Using minimal profile to save memory...)
cmd /c "wsl sh rustup-init.sh -y --profile minimal"
if %errorlevel% neq 0 goto :TryAptInstall

:: 清理
cmd /c "wsl rm rustup-init.sh"

echo ✅ Rust 安装完成！
goto :WSLRustFound

:TryAptInstall
echo.
echo ⚠️  Rustup 安装因内存不足失败。
echo    正在尝试备用方案: 使用系统包管理器安装 (System Package Manager)...
echo.

:: 尝试重启实例清理内存
wsl --terminate Ubuntu >nul 2>&1

:: [Crash Recovery] 清理可能存在的锁文件
echo    [0/2] Cleaning up lock files...
cmd /c "wsl -u root rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock"
cmd /c "wsl -u root dpkg --configure -a"

:: 使用 root 权限安装，无需密码
echo    [1/2] Updating apt...
cmd /c "wsl -u root apt-get update"
echo    [2/2] Installing cargo...
cmd /c "wsl -u root apt-get install -y cargo"

if %errorlevel% neq 0 goto :InstallError

echo ✅ Rust (System) 安装完成！
goto :WSLRustFound

:InstallError
echo.
echo ❌ 安装失败 (Installation Failed).
echo.
echo    可能的原因:
echo    1. 网络问题 (Network issue).
echo    2. 内存不足 (Memory issue).
echo.
echo    👉 建议: 请尝试重新运行此脚本。
pause
goto :EOF

:WSLRustFound
echo WSL Rust 环境已就绪:
cmd /c "wsl cargo --version"

:: 2.5 安装依赖 (防止缺少 OpenSSL 导致编译失败)
echo.
echo [2.5/3] 安装构建依赖 (Installing dependencies)...
echo    (build-essential, pkg-config, libssl-dev)
echo    正在更新软件源...
cmd /c "wsl -u root apt-get update >nul 2>&1"
echo    正在安装库文件...
cmd /c "wsl -u root apt-get install -y build-essential pkg-config libssl-dev >nul 2>&1"

:: 编译项目 (Linux Target)
echo.
echo [3/3] 正在 WSL 中编译项目 (Linux)...
echo    (Compiling project in WSL...)
echo.

:: 强制清理 (应对死机导致的构建缓存损坏)
echo    🧹 正在清理旧的构建缓存 (Cleaning old build artifacts)...
cmd /c "wsl cargo clean >nul 2>&1"

echo    🚀 开始编译 (Building)... 
echo    (这可能需要几分钟，日志保存在 build.log)
echo.

:: 使用 cmd /c 隔离执行，并重定向日志防止控制台崩溃
cmd /c "wsl cargo build --bin server > build.log 2>&1"

if %errorlevel% neq 0 (
    echo.
    echo ❌ WSL 编译失败 (Compilation Failed).
    echo.
    echo    === 错误日志 (Last 20 lines) ===
    powershell -Command "if (Test-Path build.log) { Get-Content build.log -Tail 20 } else { echo 'No log file found.' }"
    echo    ================================
    echo.
    echo    可能的原因:
    echo    1. 内存不足 (Memory Limit).
    echo    2. 依赖缺失 (Dependencies).
    echo.
    pause
    goto :EOF
)

:: 4. 验证编译结果
cmd /c "wsl test -f target/debug/server"
if %errorlevel% neq 0 (
    echo.
    echo 错误: 未找到编译后的文件 (Binary not found).
    echo    虽然编译命令未报错，但文件似乎没有生成。
    pause
    goto :EOF
)

echo.
echo ========================================================
echo   🎉 [Linux] 配置与编译完成！
echo   请使用 Web_compute_low_start.bat 启动。
echo ========================================================
pause
goto :EOF
