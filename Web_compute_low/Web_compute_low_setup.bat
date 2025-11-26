@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
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
:: 严格验证: 同时检查 cargo 和 rustc，防止环境损坏导致编译死机
cmd /c "wsl cargo --version >nul 2>&1"
set CARGO_EXIST=%errorlevel%
cmd /c "wsl rustc --version >nul 2>&1"
set RUSTC_EXIST=%errorlevel%

if %CARGO_EXIST% equ 0 if %RUSTC_EXIST% equ 0 goto :WSLRustFound

echo ❌ WSL 内未检测到 Rust 环境或环境已损坏 (Corrupted or Missing).
echo    (Cargo: %CARGO_EXIST%, Rustc: %RUSTC_EXIST%)
echo.
echo    🧹 正在清理残留文件 (Cleaning up leftovers)...
:: 无论是否存在，都尝试清理，确保安装环境纯净
cmd /c "wsl rm -rf ~/.rustup/toolchains/stable-*"
cmd /c "wsl rm -rf ~/.rustup/toolchains/*-linux-gnu"
cmd /c "wsl rm -rf ~/.cargo/bin"

echo    正在尝试自动安装 Rust...
echo    (Installing Rust...)
echo.

:: 尝试重启 WSL 实例
wsl --terminate Ubuntu >nul 2>&1

echo    正在下载并安装... (Downloading and Installing...)

:: 分步执行，避免管道符 | 导致 CMD 解析崩溃
echo    [1/2] Downloading installer...
:: 使用更清晰的临时文件名，避免误触
cmd /c "wsl curl -sSf https://sh.rustup.rs -o temp_rust_installer_DO_NOT_RUN.sh"
if %errorlevel% neq 0 goto :InstallError

echo    [2/2] Running installer (Minimal Profile)...
echo    (Using minimal profile to save memory...)
cmd /c "wsl sh temp_rust_installer_DO_NOT_RUN.sh -y --profile minimal"
if %errorlevel% neq 0 goto :TryAptInstall

:: 清理
cmd /c "wsl rm temp_rust_installer_DO_NOT_RUN.sh"
:: 清理旧的残留文件 (如果有)
if exist "rustup-init.sh" del "rustup-init.sh"

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

:: 生成临时 PowerShell 编译脚本 (通用)
echo $ErrorActionPreference = "Stop" > build_task.ps1
echo $logOut = "build.log" >> build_task.ps1
echo $logErr = "build.err" >> build_task.ps1
echo Write-Host "🚀 [PowerShell] Starting Build Process..." -ForegroundColor Cyan >> build_task.ps1
echo if (Test-Path $logOut) { Remove-Item $logOut } >> build_task.ps1
echo if (Test-Path $logErr) { Remove-Item $logErr } >> build_task.ps1
echo try { >> build_task.ps1
echo     # 使用 Invoke-Expression 和 Tee-Object 实现实时输出 + 日志记录 >> build_task.ps1
echo     # 2^>^&1 将错误流合并到输出流，确保所有信息都被捕获 >> build_task.ps1
echo     $cmd = "wsl bash -c 'source $HOME/.cargo/env 2>/dev/null; export CARGO_BUILD_JOBS=2; cargo build --bin server'" >> build_task.ps1
echo     Invoke-Expression $cmd 2>&1 | Tee-Object -FilePath $logOut >> build_task.ps1
echo     if ($LASTEXITCODE -ne 0) { throw "Exit code $LASTEXITCODE" } >> build_task.ps1
echo } catch { >> build_task.ps1
echo     Write-Host "❌ Failed to start WSL process: $_" -ForegroundColor Red; exit 1 >> build_task.ps1
echo } >> build_task.ps1
echo if (Test-Path $logErr) { Add-Content -Path $logOut -Value (Get-Content $logErr); Remove-Item $logErr } >> build_task.ps1
echo if ($process.ExitCode -ne 0) { >> build_task.ps1
echo     Write-Host "`n❌ Build Failed with Exit Code $($process.ExitCode)" -ForegroundColor Red >> build_task.ps1
echo     if (Test-Path $logOut) { Write-Host "`n=== Error Log (Last 20 Lines) ===" -ForegroundColor Yellow; Get-Content $logOut -Tail 20; Write-Host "================================" -ForegroundColor Yellow } >> build_task.ps1
echo     exit 1 >> build_task.ps1
echo } >> build_task.ps1
echo Write-Host "`n✅ Build Successful!" -ForegroundColor Green; exit 0 >> build_task.ps1

:: ---------------------------------------------------------
:: 2.9 预编译测试 (Pre-flight Check)
:: ---------------------------------------------------------
echo.
echo [2.9/3] 执行编译器健康检查 (Compiler Health Check)...
echo    (Compiling minimal test case: Debug/test_compile.rs)

:: 清理旧的测试产物
if exist "Debug\test_compile" del "Debug\test_compile"

:: 使用 rustc 直接编译，不依赖 cargo，快速验证工具链核心
:: 即使源码有错，rustc 也会报错退出，而不会导致死机 (因为是单文件编译)
cmd /c "wsl rustc Debug/test_compile.rs -o Debug/test_compile"

if %errorlevel% neq 0 (
    echo.
    echo ❌ 编译器检查失败 (Compiler Check Failed).
    echo    Rust 环境似乎仍然不稳定，或者测试代码有误。
    echo    (Rust environment seems unstable.)
    pause
    goto :EOF
)

:: 运行测试程序
cmd /c "wsl ./Debug/test_compile"
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  测试程序无法运行 (Test binary failed to run).
    pause
) else (
    echo    ✅ 编译器工作正常 (Compiler is healthy)!
)

:: ---------------------------------------------------------
:: 尝试 1: 快速构建 (Fast Build)
:: ---------------------------------------------------------
echo.
echo [3/3] 正在 WSL 中编译项目 (Linux)...
echo    (Compiling project in WSL...)
echo.
echo    🚀 尝试快速构建 (Attempting Fast Build)...

powershell -ExecutionPolicy Bypass -File "build_task.ps1"
if %errorlevel% equ 0 goto :BuildSuccess

:: ---------------------------------------------------------
:: 尝试 2: 修复并重试 (Repair & Retry)
:: ---------------------------------------------------------
echo.
echo ⚠️  快速构建失败，正在尝试自动修复环境...
echo    (Fast build failed. Attempting auto-repair...)
echo.

:: 1. 安装依赖
echo    [Fix 1/3] 检查并安装依赖 (Installing dependencies)...
cmd /c "wsl -u root apt-get update >nul 2>&1"
cmd /c "wsl -u root apt-get install -y build-essential pkg-config libssl-dev >nul 2>&1"

:: 2. 清理缓存
echo    [Fix 2/3] 清理构建缓存 (Cleaning target)...
cmd /c "wsl cargo clean >nul 2>&1"

:: 3. 重置 Lockfile (解决版本冲突)
echo    [Fix 3/4] 重置 Cargo.lock (Resetting lockfile)...
if exist "Cargo.lock" del "Cargo.lock"

:: 4. 升级 Rust (用户要求最新版)
echo    [Fix 4/4] 升级 Rust 到最新版 (Upgrading Rust to latest)...

:: [Critical Fix] 强制删除损坏的工具链 (Fixing 'invalid ELF header')
:: 之前死机导致文件损坏，必须物理删除，不能只靠覆盖
echo    🧹 正在清除损坏的 Rust 文件 (Deleting corrupted toolchain)...
cmd /c "wsl rm -rf ~/.rustup/toolchains/stable-*"
cmd /c "wsl rm -rf ~/.rustup/toolchains/*-linux-gnu"

:: 4.1 卸载旧版 (apt)
echo    (Removing old apt version...)
cmd /c "wsl -u root apt-get remove -y cargo rustc >nul 2>&1"
cmd /c "wsl -u root apt-get autoremove -y >nul 2>&1"

:: 4.2 尝试安装 rustup
echo    (Installing rustup...)
:: 尝试通过 apt 安装 rustup (如果源里有)
cmd /c "wsl -u root apt-get install -y rustup >nul 2>&1"

:: 检查 rustup 是否可用
cmd /c "wsl rustup --version >nul 2>&1"
if %errorlevel% equ 0 (
    echo    (Rustup installed via apt. Installing stable toolchain...)
    echo    (Forcing reinstall to fix 'invalid ELF header' errors...)
    echo    (Using Safe-Mode Concurrency: 2 Threads)
    
    :: 使用 2 个线程，既不慢也不卡死
    cmd /c "wsl bash -c 'export RUSTUP_IO_THREADS=2; rustup toolchain install stable --profile minimal --force'"
    cmd /c "wsl rustup default stable"
) else (
    echo    (Apt rustup not found. Retrying script installer...)
    echo    (Optimizing for Windows Server WSL1 environment...)
    
    :: 释放内存
    wsl --terminate Ubuntu >nul 2>&1
    
    :: 下载安装脚本
    cmd /c "wsl curl -sSf https://sh.rustup.rs -o temp_rust_installer_DO_NOT_RUN.sh"
    
    :: 计算当前目录的 WSL 路径 (例如 /mnt/c/000AI/...)
    for /f "delims=" %%i in ('wsl wslpath -a .') do set "WSL_PWD=%%i"
    
    :: 创建临时目录 (使用 Windows 磁盘而非 WSL 内存盘)
    if not exist "wsl_tmp" mkdir "wsl_tmp"
    
    echo    (Installing with TMPDIR on Windows drive to prevent RAM overflow...)
    :: 关键配置:
    :: 1. TMPDIR: 指向 Windows 目录，避免 WSL1 内存文件系统溢出
    :: 2. RUSTUP_IO_THREADS=1: 下载时强制单线程
    :: 3. RUSTUP_INIT_SKIP_PATH_CHECK=yes: 跳过路径检查，减少交互
    :: 4. 无需 --profile minimal，因为我们手动指定组件
    cmd /c "wsl bash -c 'export TMPDIR=%WSL_PWD%/wsl_tmp; export RUSTUP_IO_THREADS=1; sh temp_rust_installer_DO_NOT_RUN.sh -y --default-toolchain none'"
    
    :: 手动安装 stable 工具链 (更可控)
    echo    (Installing stable toolchain manually...)
    cmd /c "wsl bash -c 'export TMPDIR=%WSL_PWD%/wsl_tmp; export RUSTUP_IO_THREADS=1; source $HOME/.cargo/env; rustup toolchain install stable --profile minimal'"
    cmd /c "wsl bash -c 'source $HOME/.cargo/env; rustup default stable'"
    
    :: 清理
    if exist "wsl_tmp" rmdir /s /q "wsl_tmp"
    cmd /c "wsl rm temp_rust_installer_DO_NOT_RUN.sh"
)

:: 4.3 验证版本
echo    (Verifying Rust version...)
:: 确保 cargo 在路径中 (如果是新安装的)
cmd /c "wsl bash -c 'source $HOME/.cargo/env 2>/dev/null; cargo --version'"

echo.
echo    🔄 正在重试编译 (Retrying Build)...
powershell -ExecutionPolicy Bypass -File "build_task.ps1"
set PS_EXIT_CODE=%errorlevel%

:: 清理脚本
if exist build_task.ps1 del build_task.ps1

if %PS_EXIT_CODE% neq 0 (
    echo.
    echo ❌ 最终编译失败 (Final Build Failed).
    echo.
    echo    请检查上方日志。
    echo    如果问题依旧，请尝试重启电脑或检查网络。
    pause
    goto :EOF
)

:BuildSuccess
if exist build_task.ps1 del build_task.ps1
    echo [Batch] Build script returned error.
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
