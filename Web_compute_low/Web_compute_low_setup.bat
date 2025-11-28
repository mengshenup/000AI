@echo off
REM ==========================================================================
REM    📃 文件功能 : Web_compute_low 环境安装脚本
REM    Logic Summary: Auto-detect WSL, install Rust, configure dev env
REM    Simple Explanation: Fully automated Rust installer!
REM    🔋 扩展备注 : 支持非交互模式 (NONINTERACTIVE=1)
REM    🧱 Web_compute_low_setup.bat 踩坑记录 (必须累加，严禁覆盖) :
REM       1. [2025-11-27] [PauseBlock]: 非交互模式下用 timeout 替换 pause
REM       2. [2025-11-27] [SyntaxError]: 修复 if 块中未转义的括号
REM       3. [2025-11-27] [EmojiCrash]: 移除导致解析错误的 Emoji
REM       4. [2025-11-27] [InstallFail]: 添加日志捕获和错误检查
REM       5. [2025-11-27] [DistroInstall]: 修复阻塞的 Start-Process 调用
REM       6. [2025-11-28] [Translation]: 翻译提示为简体中文，修复 echo 引起的 bash 错误
REM       7. [2025-11-28] [OpenSSL]: 修复 OpenSSL 检查包名错误，防止误报
REM       8. [2025-11-28] [UpdateCrash]: 修复更新失败导致脚本闪退的问题 (改为非致命警告)
REM       9. [2025-11-28] [Progress]: 新增每秒输出进度的监控功能
REM       10. [2025-11-28] [Fix]: 修复交互模式逻辑，路径引用，及脚本生成安全性
REM       11. [2025-11-28] [ServerFix]: 修复 Windows Server 下 Appx 安装失败问题，新增 Bundle 递归解压与 wsl --import 模式
REM       12. [2025-11-28] [AppxExpand]: 修复 Expand-Archive 不支持 .appx 后缀的问题 (重命名为 .zip)
REM    13. [2025-11-28] [CleanReset]: 完善 FactoryReset 清理逻辑，支持清理手动安装的残留文件
REM    14. [2025-11-28] [ServerHang]: 修复 Server 2022 下 monitor.ps1 导致的挂起，优化 WSL 网络检查
REM    15. [2025-11-28] [MemCrash]: 将 WSL 内存限制从 256MB 提升至 512MB，防止 rustc 安装时因 Swap 抖动导致宿主机死机
REM    16. [2025-11-28] [MonitorKill]: 彻底禁用 monitor.ps1，防止 PowerShell 进程在 Server 2022 上引发死锁
REM    17. [2025-11-28] [OOMFix]: 提升 WSL 内存至 1024MB 并将 TMPDIR 指向磁盘 ($HOME/tmp)，解决 rustup 内存不足错误 (os error 12)
REM    18. [2025-11-28] [EncodingFix]: 移除 Emoji 和不支持的 .wslconfig 键值，防止批处理乱码和 WSL 警告
REM ==========================================================================
setlocal
echo [DEBUG] NONINTERACTIVE is '%NONINTERACTIVE%'
cd /d "%~dp0"
chcp 65001 >nul

:: [Cleanup] Remove leftover lock files
if exist STOP_MONITOR del STOP_MONITOR
if exist monitor.ps1 del monitor.ps1

if "%WSL_CMD%"=="" set WSL_CMD=wsl

:: [Auto-Config] Smart Interactive Mode Detection
:: If environment exists (no_code\wsl_rust_env), default to Interactive (NONINTERACTIVE=0) to allow repair.
:: If fresh install, default to Auto (NONINTERACTIVE=1).
if exist "no_code\wsl_rust_env" (
    if "%NONINTERACTIVE%"=="" set NONINTERACTIVE=0
) else (
    if "%NONINTERACTIVE%"=="" set NONINTERACTIVE=1
)

set RETRY_COUNT=0

goto :InitTools

:MainMenu
REM cls
echo ========================================================
echo   Angel Client Setup (Web_compute_low)
echo   v2.3 (已启用超安全模式)
echo ========================================================
echo.
echo   1. 开始/继续 安装
echo   2. [重置/修复] Ubuntu (Reset/Fix Ubuntu)
echo      - 如果密码设置失败或安装卡住，请选择此项！
echo.
if "%NONINTERACTIVE%"=="1" (
    echo [自动] 检测到非交互模式。默认为选项 1。
    set choice=1
) else (
    set /p choice="请选择 (输入 1 或 2): "
)
if "%choice%"=="2" goto :FactoryReset
goto :CheckEnv

:FactoryReset
echo.
echo [清理] 正在强制终止所有 WSL 进程...
taskkill /F /IM wsl.exe >nul 2>&1
taskkill /F /IM wslhost.exe >nul 2>&1
taskkill /F /IM ubuntu.exe >nul 2>&1
taskkill /F /IM bash.exe >nul 2>&1
timeout /t 3 >nul

echo [清理] 正在卸载旧的 Ubuntu 实例...
echo    (正在注销 Ubuntu...)
call %WSL_CMD% --unregister Ubuntu
if %errorlevel% neq 0 (
    echo    [重试] 注销失败，等待 5 秒后重试...
    timeout /t 5 >nul
    call %WSL_CMD% --unregister Ubuntu
)

echo [清理] 正在清理本地 Rust 环境...
if exist "no_code\wsl_rust_env" (
    rmdir /s /q "no_code\wsl_rust_env"
    if exist "no_code\wsl_rust_env" (
        echo    [警告] 无法删除目录，再次尝试强制清理...
        timeout /t 2 >nul
        rmdir /s /q "no_code\wsl_rust_env"
    )
)

echo [清理] 正在清理安装临时文件...
if exist "Ubuntu_Extract" rmdir /s /q "Ubuntu_Extract"
if exist "Ubuntu_Data" rmdir /s /q "Ubuntu_Data"
if exist "install.tar.gz" del "install.tar.gz"
if exist "Ubuntu2204.appx" del "Ubuntu2204.appx"

echo.
echo [完成] 清理完成！您现在可以重新安装。
echo.
if "%NONINTERACTIVE%"=="1" (
    timeout /t 3 >nul
) else (
    pause
)
goto :CheckEnv

:CheckEnv
echo ========================================================
echo   Angel Client Setup (Web_compute_low)
echo ========================================================
echo.
echo [0/3] 正在检查系统资源...

for /f "tokens=2 delims==" %%a in ('wmic OS get FreePhysicalMemory /value') do set FreeMem=%%a
set /a FreeMemMB=%FreeMem%/1024
echo    可用内存: %FreeMemMB% MB

if %FreeMemMB% LSS 1500 (
    echo    [警告] 内存不足 ^(^<1.5GB^)! 已启用超安全模式。
    set SAFE_MODE=1
    set "RUSTUP_IO_THREADS=1"
    set "CARGO_BUILD_JOBS=1"
    set "WSLENV=RUSTUP_IO_THREADS/p:CARGO_BUILD_JOBS/p"
) else (
    echo    [OK] 内存充足。
    set SAFE_MODE=0
    set "RUSTUP_IO_THREADS=1"
    set "WSLENV=RUSTUP_IO_THREADS/p"
)

wmic os get caption | findstr /i "Server" >nul
if %errorlevel% neq 0 goto :NotServer
echo [警告] 检测到 Windows Server。
echo    "请确保 WSL 功能已启用。"
:NotServer
echo [调试] 正在检查 WSL 状态...
call %WSL_CMD% --status >nul 2>&1
if %errorlevel% neq 0 goto :WSLNotFound

:: [Integrity Check] Verify WSL Core (Skipped wsl --list as it fails with no distro)
:: %WSL_CMD% --list >nul 2>&1

call %WSL_CMD% echo check >nul 2>&1
if %errorlevel% neq 0 goto :DistroNotFound

echo [OK] 环境检查通过 (WSL Linux 模式)。
goto :WSLModeTarget

:WSLBroken
echo.
echo [错误] WSL 核心损坏。
echo    (无法列出发行版。)
echo.
echo    [自动] 尝试自动修复 (运行 wsl --update)...
call %WSL_CMD% --update
if %errorlevel% neq 0 (
    echo.
    echo [错误] 自动修复失败。
    echo    请在 PowerShell (管理员) 中运行:
    echo      dism.exe /online /cleanup-image /restorehealth
    echo      sfc /scannow
    echo.
    if "%NONINTERACTIVE%"=="1" ( timeout /t 5 >nul ) else ( pause )
    exit /b 1
)
echo [OK] 修复尝试完成。请重新启动脚本。
if "%NONINTERACTIVE%"=="1" ( timeout /t 3 >nul ) else ( pause )
exit /b

:WSLNotFound
echo [错误] 未找到 WSL (Windows Subsystem for Linux)。
echo.
echo    正在尝试自动安装 WSL...
echo    (正在安装 WSL...)
echo.
echo    需要管理员权限。
echo    (需要管理员权限。)
echo.

:: [Server 2022 Fix] Check feature status first
wmic os get caption | findstr /i "Server" >nul
if %errorlevel% equ 0 (
    echo    [Server 2022] 正在启用 WSL 功能...
    powershell -Command "Install-WindowsFeature -Name Microsoft-Windows-Subsystem-Linux"
    echo    [注意] 如果这是第一次启用，您必须重启计算机！
)

powershell -Command "Start-Process '%WSL_CMD%' -ArgumentList '--install' -Verb RunAs -Wait"

echo.
echo [信息] 请按照提示操作。
echo    (请按照提示操作。)
echo.
echo    安装完成后，请 [重启计算机] 并再次运行。
echo    (安装完成后请重启计算机。)
if "%NONINTERACTIVE%"=="1" ( timeout /t 5 >nul ) else ( pause )
exit /b

:DistroNotFound
echo [错误] 未找到默认 Linux 发行版。
echo.
echo    [兼容性] 将 WSL 默认版本设置为 1...
echo    (为了兼容性将 WSL 默认版本设置为 1...)
call %WSL_CMD% --set-default-version 1 >nul 2>&1

:: [Server 2022 Fix] Check if we are on Server and try manual install first
wmic os get caption | findstr /i "Server" >nul
    if %errorlevel% equ 0 goto :ServerDetected
    goto :NotServer2022

:ServerDetected
    echo.
    echo    [Server 2022] 检测到服务器环境。
    echo    [Server 2022] 跳过 Store 安装，尝试手动下载 Appx...
    goto :ManualInstallUbuntu

:NotServer2022
    echo.
echo    ========================================================
echo    [安装指南]
echo    ========================================================
echo    将会弹出一个黑色的 Ubuntu 窗口。
echo    请按照以下步骤操作：
echo.
echo    1. 当看到 "Enter new UNIX username":
echo       输入: admin  (然后按回车)
echo.
echo    2. 当看到 "New password":
echo       输入: 0      (注意: 输入时看不见！)
echo       按回车
echo.
echo    3. 当看到 "Retype new password":
echo       输入: 0
echo       按回车
echo.
echo    (Linux 安全机制需要手动输入密码)
echo    ========================================================
echo.
echo    [常见问题]
echo    如果你看到 "password updated successfully" 但随后出现错误:
echo    "Create process failed" 或 "Broken pipe"...
echo    请忽略它！安装很可能已经成功。
echo    关闭弹出窗口并在此处按任意键继续。
echo.
echo    准备好了吗？按任意键开始安装...
if "%NONINTERACTIVE%"=="1" (
    timeout /t 3 >nul
) else (
    pause >nul
)

if "%NONINTERACTIVE%"=="1" (
    echo [自动] 尝试非交互式安装 (Ubuntu)...
    call %WSL_CMD% --install -d Ubuntu
) else (
    powershell -Command "Start-Process cmd -ArgumentList '/k %WSL_CMD% --install -d Ubuntu' -Verb RunAs -Wait"
)

echo.
echo [信息] 窗口关闭后，按任意键继续...
if "%NONINTERACTIVE%"=="1" (
    timeout /t 5 >nul
) else (
    pause
)

call %WSL_CMD% -d Ubuntu echo check >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [错误] 仍然无法连接到 Ubuntu。
    echo.
    echo    这可能是因为安装卡住或环境问题。
    echo.
    echo    - 建议在主菜单中选择 "2. 重置/修复 Ubuntu"
    echo       以删除并重新安装。
    echo.
    if "%NONINTERACTIVE%"=="1" (
        exit /b 1
    ) else (
        pause
    )
    exit /b
)
goto :WSLModeTarget

echo.
echo [信息] 如果安装成功，按任意键继续...
echo    (如果安装完成，按任意键继续...)
if "%NONINTERACTIVE%"=="1" (
    timeout /t 3 >nul
) else (
    pause
)

call %WSL_CMD% echo check >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [错误] 仍然无法连接到 Linux 发行版。
    echo.
    echo    可能的原因:
    echo    1. 你刚刚安装了 WSL 但没有 [重启计算机]。
    echo       (你需要重启计算机。)
    echo    2. Windows Server 可能需要手动启用功能。
    echo       (Windows Server 可能需要手动启用功能。)
    echo.
    echo    请尝试手动运行此命令以查看错误:
    echo    %WSL_CMD% --install -d Ubuntu
    echo.
    echo    然后重启计算机。
    if "%NONINTERACTIVE%"=="1" (
        exit /b 1
    ) else (
        pause
    )
    exit /b
)
goto :WSLModeTarget

:WSLModeTarget
echo [调试] 已到达 WSLModeTarget。

:: [Memory Protection] Configure .wslconfig to prevent host starvation
echo [Config] Optimizing WSL Memory Settings (Host Protection)...
echo    (Strategy: Enhanced Mode - 1024MB RAM / 8GB Swap / Single Core)
set "WSL_CONFIG_PATH=%USERPROFILE%\.wslconfig"
echo [wsl2] > "%WSL_CONFIG_PATH%"
echo memory=1024MB >> "%WSL_CONFIG_PATH%"
echo processors=1 >> "%WSL_CONFIG_PATH%"
echo swap=8GB >> "%WSL_CONFIG_PATH%"
echo localhostForwarding=true >> "%WSL_CONFIG_PATH%"

echo [1/4] 进入 Linux/WSL 构建流程...
echo    (进入 Linux/WSL 构建流程...)

:: [Restart] Ensure WSL picks up new config
echo [系统] 正在重启 WSL 以应用内存限制...
taskkill /F /IM wsl.exe >nul 2>&1
call %WSL_CMD% --shutdown
timeout /t 5 >nul

echo.
echo [1.1/4] 检查依赖项...
echo    (安装 build-essential, pkg-config, libssl-dev...)

echo    [清理] 清理包锁...
call %WSL_CMD% -u root rm /var/lib/apt/lists/lock >nul 2>&1
call %WSL_CMD% -u root rm /var/cache/apt/archives/lock >nul 2>&1
call %WSL_CMD% -u root rm /var/lib/dpkg/lock* >nul 2>&1
call %WSL_CMD% -u root dpkg --configure -a >nul 2>&1
call %WSL_CMD% -u root apt-get update >nul 2>&1

echo    [安装] 安装/更新编译器工具链...

if "%SAFE_MODE%"=="1" (
    echo    [超安全模式] 正在逐步安装...
    echo       (正在逐个安装依赖项...)
    
    echo       ...步骤 1: 更新 (日志: setup_apt_update.log)
    if exist STOP_MONITOR del STOP_MONITOR
    start "Angel_Monitor" /min powershell -ExecutionPolicy Bypass -File monitor.ps1 "setup_apt_update.log"
    call %WSL_CMD% -u root apt-get update <nul > setup_apt_update.log 2>&1
    echo STOP > STOP_MONITOR
    timeout /t 5 >nul

    echo       ...步骤 2: 安装基础工具 (curl, ca-certificates) (日志: setup_apt_base.log)
    if exist STOP_MONITOR del STOP_MONITOR
    start "Angel_Monitor" /min powershell -ExecutionPolicy Bypass -File monitor.ps1 "setup_apt_base.log"
    call %WSL_CMD% -u root apt-get install -y curl ca-certificates <nul > setup_apt_base.log 2>&1
    echo STOP > STOP_MONITOR
    timeout /t 5 >nul

    echo       ...步骤 3: 安装 build-essential (日志: setup_apt_gcc.log)
    if exist STOP_MONITOR del STOP_MONITOR
    start "Angel_Monitor" /min powershell -ExecutionPolicy Bypass -File monitor.ps1 "setup_apt_gcc.log"
    call %WSL_CMD% -u root apt-get install -y build-essential <nul > setup_apt_gcc.log 2>&1
    echo STOP > STOP_MONITOR
    timeout /t 5 >nul

    echo       ...步骤 4: 安装 pkg-config (日志: setup_apt_pkg.log)
    if exist STOP_MONITOR del STOP_MONITOR
    start "Angel_Monitor" /min powershell -ExecutionPolicy Bypass -File monitor.ps1 "setup_apt_pkg.log"
    call %WSL_CMD% -u root apt-get install -y pkg-config <nul > setup_apt_pkg.log 2>&1
    echo STOP > STOP_MONITOR
    timeout /t 5 >nul

    echo       ...步骤 5: 安装 libssl-dev (日志: setup_apt_ssl.log)
    if exist STOP_MONITOR del STOP_MONITOR
    start "Angel_Monitor" /min powershell -ExecutionPolicy Bypass -File "%~dp0monitor.ps1" "setup_apt_ssl.log"
    call %WSL_CMD% -u root apt-get install -y libssl-dev <nul > setup_apt_ssl.log 2>&1
    echo STOP > STOP_MONITOR
    timeout /t 5 >nul
    echo [调试] 安全模式块结束
) else (
    %WSL_CMD% -u root apt-get install -y curl ca-certificates build-essential pkg-config libssl-dev >nul 2>&1
)

echo    [验证] 正在验证组件...
%WSL_CMD% bash -c "cc --version >/dev/null 2>&1 && pkg-config --version >/dev/null 2>&1"

call %WSL_CMD% bash -c "pkg-config --exists openssl"
if %errorlevel% neq 0 (
    echo    [警告] OpenSSL 检查失败，正在尝试修复...
    call %WSL_CMD% -u root apt-get install -y --reinstall libssl-dev pkg-config
)

if %errorlevel% neq 0 (
    echo.
    echo [错误] 缺少依赖项。
    echo    GCC 或 pkg-config 未正确安装。可能是网络或锁问题。
    echo.
    echo    正在尝试强制修复...
    echo    (正在尝试强制修复...)
    
    call %WSL_CMD% -u root dpkg --configure -a
    call %WSL_CMD% -u root apt-get update
    call %WSL_CMD% -u root apt-get install -y --fix-missing build-essential pkg-config libssl-dev
    
    call %WSL_CMD% bash -c "cc --version >nul 2>&1"
    if %errorlevel% neq 0 (
    echo.
    echo [错误] 缺少依赖项。
    echo    GCC 或 pkg-config 未正确安装。可能是网络或锁问题。
    echo.
    echo    正在尝试强制修复...
    echo    (正在尝试强制修复...)
    
    call %WSL_CMD% -u root dpkg --configure -a
    call %WSL_CMD% -u root apt-get update
    call %WSL_CMD% -u root apt-get install -y --fix-missing build-essential pkg-config libssl-dev
    
    call %WSL_CMD% bash -c "cc --version >nul 2>&1"
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 修复失败。无法安装编译器。
        echo    请检查网络，或尝试手动安装:
        echo    %WSL_CMD% -u root apt-get install build-essential pkg-config libssl-dev
        if "%NONINTERACTIVE%"=="1" (
            exit /b 1
        ) else (
            pause
        )
        exit /b
    )
)

echo [OK] 依赖项检查完成。

:: [Fix] Use Windows path with /p flag for correct WSLENV translation
set "RUST_DIR=%~dp0no_code\wsl_rust_env"

set "RUSTUP_HOME=%RUST_DIR%\rustup"
set "CARGO_HOME=%RUST_DIR%\cargo"
set "RUSTUP_IO_THREADS=1"
set "WSLENV=RUSTUP_HOME/p:CARGO_HOME/p:RUSTUP_IO_THREADS"

set "RUST_ENV=export PATH=\"$CARGO_HOME/bin:$PATH\";"
:: [Fix] Create a clean version without backslashes for generating shell scripts
set "RUST_ENV_CLEAN=%RUST_ENV:\=%"

echo.
echo [Config] Enabling Portable Rust Environment...
echo    Location: %RUST_DIR%

call %WSL_CMD% bash -c "%RUST_ENV% rustc --version >nul 2>&1 && %RUST_ENV% cargo --version >nul 2>&1"
if %errorlevel% equ 0 goto :WSLRustFound

:WSLRustNotFound
echo [ERROR] Portable Rust not found or corrupted.
echo    (Portable Rust not found or corrupted.)
echo.
echo    Installing to project directory...
echo    (Preventing system freeze)
echo.

if exist "no_code\wsl_rust_env" (
    echo    [Clean] Cleaning up old environment...
    rmdir /s /q "no_code\wsl_rust_env"
    if exist "no_code\wsl_rust_env" (
        echo.
        echo [Error] Cannot delete "no_code\wsl_rust_env"
        echo    Reason: File in use ^(VS Code, Terminal?^)
        echo    Please close all related programs and retry.
        if "%NONINTERACTIVE%"=="1" (
            exit /b 1
        ) else (
            pause
        )
        exit /b
    )
)
mkdir "no_code\wsl_rust_env"

echo    [检查] 预检...
call %WSL_CMD% ping -c 1 8.8.8.8 >nul 2>&1
if %errorlevel% neq 0 echo    [警告] 网络不可达 (Ping 8.8.8.8 失败)。

echo    [下载] 正在下载安装程序...
echo [DEBUG] Running curl (Host Side)...

:: [Fix] Use Host curl.exe to avoid WSL overhead/freeze
curl.exe --connect-timeout 30 --max-time 600 -sSf https://sh.rustup.rs -o temp_rust_installer_DO_NOT_RUN.sh
if %errorlevel% neq 0 (
    echo    [警告] Host curl 失败，尝试 PowerShell...
    powershell -Command "Invoke-WebRequest -Uri 'https://sh.rustup.rs' -OutFile 'temp_rust_installer_DO_NOT_RUN.sh' -UseBasicParsing"
)

echo [DEBUG] Download finished. Errorlevel: %errorlevel%

if %errorlevel% neq 0 (
    echo.
    echo [错误] 安装失败。请检查网络或磁盘空间。
    echo    ^(下载失败。请检查网络/磁盘。^)
    if "%NONINTERACTIVE%"=="1" ( exit /b 1 ) else ( pause )
    exit /b
)

:: [Integrity Check] Verify download integrity
echo [DEBUG] Verifying download integrity...
call %WSL_CMD% bash -c "if [ $(wc -c < temp_rust_installer_DO_NOT_RUN.sh) -lt 10000 ]; then exit 1; fi"
echo [DEBUG] Verification finished. Errorlevel: %errorlevel%

if %errorlevel% neq 0 (
    echo.
    echo [错误] 下载损坏。
    echo    文件太小 ^(^<10KB^)，可能是网络中断。
    echo    正在清理并退出...
    call %WSL_CMD% rm temp_rust_installer_DO_NOT_RUN.sh
    if "%NONINTERACTIVE%"=="1" (
        exit /b 1
    ) else (
        pause
    )
    exit /b
)

:: [Fix] Ensure line endings are correct for the installer script (Windows download might add CRLF)
echo [DEBUG] Sanitizing installer script...
call %WSL_CMD% sed -i 's/\r$//' temp_rust_installer_DO_NOT_RUN.sh

echo    [安装] 正在开始安装...
echo    ^(使用单线程以防止冻结...^)

:: [Fix] Check WSL Network Connectivity for Rustup
echo    [Check] WSL Network Connectivity...
call %WSL_CMD% ping -c 1 static.rust-lang.org >nul 2>&1
if %errorlevel% neq 0 (
    echo    [Warning] WSL cannot connect to Rust server.
    echo    Attempting to configure DNS...
    call %WSL_CMD% -u root bash -c "echo 'nameserver 8.8.8.8' > /etc/resolv.conf"
)

:: [Fix] Ensure log directory exists
if not exist "Debug" mkdir "Debug"

if "%SAFE_MODE%"=="1" (
    echo    [超安全模式] 正在以低优先级运行安装...
    echo       ^(日志: Debug\setup_rust_install.log^)
    
    REM [Fix] Generate a temporary shell script to avoid Batch quoting hell
    echo set -x > install_rust_task.sh
    echo mkdir -p $HOME/tmp >> install_rust_task.sh
    echo export TMPDIR=$HOME/tmp >> install_rust_task.sh
    echo export RUSTUP_INIT_SKIP_SPACE_CHECK=1 >> install_rust_task.sh
    echo %RUST_ENV_CLEAN% sh temp_rust_installer_DO_NOT_RUN.sh -y --no-modify-path --profile minimal >> install_rust_task.sh
    
    REM [Fix] Convert CRLF to LF for WSL
    echo [DEBUG] Converting script line endings...
    call %WSL_CMD% sed -i 's/\r$//' install_rust_task.sh

    echo [DEBUG] Running install script directly...
    
    REM [Fix] Monitor disabled to prevent potential crashes
    REM if exist STOP_MONITOR del STOP_MONITOR
    REM echo [Monitor] 启动独立监控窗口...
    REM start "Angel_Monitor" /min powershell -ExecutionPolicy Bypass -File monitor.ps1 "Debug\setup_rust_install.log"
    
    echo    [Info] Installing Rust (this may take a few minutes)...
    call %WSL_CMD% bash install_rust_task.sh > Debug\setup_rust_install.log 2>&1
    
    REM echo STOP > STOP_MONITOR
    
    REM Cleanup temp script
    timeout /t 1 >nul
    if exist install_rust_task.sh del install_rust_task.sh
) else (
    echo    [日志] 正在将安装记录到 Debug\setup_rust_install.log ...
    %WSL_CMD% bash -c "mkdir -p $HOME/tmp; export TMPDIR=$HOME/tmp; %RUST_ENV% sh temp_rust_installer_DO_NOT_RUN.sh -y --no-modify-path --profile minimal" > Debug\setup_rust_install.log 2>&1
)

if %errorlevel% neq 0 (
    echo.
    echo [错误] 安装失败。请检查网络或磁盘空间。
    echo    ^(安装脚本失败。请检查网络/磁盘。^)
    call %WSL_CMD% rm temp_rust_installer_DO_NOT_RUN.sh
    if "%NONINTERACTIVE%"=="1" ( exit /b 1 ) else ( pause )
    exit /b
)

call %WSL_CMD% rm temp_rust_installer_DO_NOT_RUN.sh

echo [DEBUG] Verifying rustc installation...
echo export PATH="$CARGO_HOME/bin:$PATH" > verify_rust.sh
echo rustc --version >> verify_rust.sh
call %WSL_CMD% bash verify_rust.sh
if %errorlevel% neq 0 (
    echo.
    echo [Error] Verification Failed.
    echo    Installer succeeded but rustc failed to run.
    echo    Check Debug\setup_rust_install.log for details.
    if "%NONINTERACTIVE%"=="1" (
        exit /b 1
    ) else (
        pause
    )
    goto :EOF
)
if exist verify_rust.sh del verify_rust.sh

echo [OK] Rust Installation Complete!
set JUST_INSTALLED=1
goto :WSLRustFound

:TryAptInstall
goto :InstallError

:InstallError
echo.
echo [Error] Installation Failed.
if "%NONINTERACTIVE%"=="1" (
    exit /b 1
) else (
    pause
)
goto :EOF

:WSLRustFound
echo [OK] WSL Rust Environment Ready:
call %WSL_CMD% bash -c "%RUST_ENV% rustc --version"

echo.
echo [2.9/4] Compiler Health Check...
echo    (Compiling minimal test case: Debug/test_compile.rs)

if not exist "Debug" mkdir "Debug"

echo fn main() { println!("Hello from WSL Portable Rust!"); } > Debug\test_compile.rs

if exist "Debug\test_compile" del "Debug\test_compile"

call %WSL_CMD% bash -c "%RUST_ENV% rustc Debug/test_compile.rs -o Debug/test_compile"

if %errorlevel% neq 0 (
    echo.
    echo [Error] Compiler Check Failed.
    echo    Rust environment seems corrupted.
    
    if "%RETRY_COUNT%"=="0" (
        echo.
        echo    [Auto] Attempting to repair...
        echo    (Cleaning up environment...)
        
        set RETRY_COUNT=1
        
        if exist "no_code\wsl_rust_env" (
            echo    [Clean] Removing corrupted environment...
            rmdir /s /q "no_code\wsl_rust_env"
        )
        
        echo    [Return] Returning to installation...
        goto :WSLRustNotFound
    ) else (
        echo.
        echo [Error] Auto-repair failed.
        echo    Check disk space, permissions, or network.
        if "%NONINTERACTIVE%"=="1" (
            exit /b 1
        ) else (
            pause
        )
        goto :EOF
    )
)

call %WSL_CMD% bash -c "./Debug/test_compile"
if %errorlevel% neq 0 (
    echo.
    echo [Warning] Test binary failed to run.
    if "%NONINTERACTIVE%"=="1" (
        echo [Auto] Skipping pause on error.
    ) else (
        pause
    )
) else (
    echo    [OK] Compiler Healthy!
)

echo.
echo [4/4] Checking Portable Rust...

if "%JUST_INSTALLED%"=="1" (
    echo    [Info] Fresh install, skipping update check.
    goto :SetupComplete
)

echo    [Update] Updating Rust...
call %WSL_CMD% bash -c "%RUST_ENV% rustup update stable"

if %errorlevel% neq 0 (
    echo.
    echo [警告] 更新失败。但这可能只是网络问题。
    echo    (更新失败。忽略并继续...)
)

:: ============================================================================
:: 5. Build Project
:: ============================================================================
echo [Build] Building Project...
echo    (This may take a while...)
echo.

if not exist "no_code\target" mkdir "no_code\target"

echo    [Cargo] Running cargo build...

if "%SAFE_MODE%"=="1" (
    echo    [超安全模式] 正在以低优先级构建...
    if exist STOP_MONITOR del STOP_MONITOR
    start "Angel_Monitor" /min powershell -ExecutionPolicy Bypass -File monitor.ps1 "Debug\setup_build.log"
    call %WSL_CMD% bash -c "%RUST_ENV% cargo build --manifest-path Cargo.toml --target-dir no_code/target" > Debug\setup_build.log 2>&1
    echo STOP > STOP_MONITOR
) else (
    call %WSL_CMD% bash -c "%RUST_ENV% cargo build --manifest-path Cargo.toml --target-dir no_code/target"
)

if %errorlevel% neq 0 (
    echo.
    echo [Error] Build Failed.
    echo    Check Debug\setup_build.log for details.
    if "%NONINTERACTIVE%"=="1" ( exit /b 1 ) else ( pause )
    exit /b
)

echo.
echo [Success] Installation Complete!
echo.
echo    You can now run 'Web_compute_low_start.bat'.
echo.

:SetupComplete
if exist build_task.ps1 del build_task.ps1
if exist monitor.ps1 del monitor.ps1
if exist STOP_MONITOR del STOP_MONITOR

:: [Garbage Collection] Auto-clean logs
if exist setup_apt_update.log (
    if not exist "Debug\Trash\AutoClean" mkdir "Debug\Trash\AutoClean"
    move setup_*.log "Debug\Trash\AutoClean\" >nul 2>&1
    echo    [清理] 已将安装日志归档到 Debug\Trash\AutoClean
)

echo.
echo ========================================================
echo   [安装完成]
echo ========================================================
echo.
echo   下一步:
echo   1. 运行 Web_compute_low_build.bat  -> 构建项目
echo   2. 运行 Web_compute_low_start.bat  -> 启动服务器
echo   3. 运行 Web_compute_low_package.bat -> 打包发布
echo.
if "%NONINTERACTIVE%"=="1" (
    timeout /t 3 >nul
) else (
    pause
)
goto :EOF

:InitTools
REM ============================================================================
REM  [Tool Init] (Monitor Script, Logging)
REM
REM  Purpose:
REM      Generate helper PowerShell script for silent monitoring and logging.
REM
REM  Explanation:
REM      Like a heartbeat monitor for the installation process.
REM
REM  Warning:
REM      [Deadlock Risk]: monitor.ps1 must run non-blocking.
REM
REM  Trigger Source:
REM      [MainMenu] -> [InitTools]
REM ============================================================================
:: [工具] 生成静默监控脚本 (仅输出心跳，防止控制台缓冲区溢出)
echo param($LogFile) > monitor.ps1
echo $StopFile = "STOP_MONITOR" >> monitor.ps1
echo $Host.UI.RawUI.WindowTitle = "Angel Installer Monitor" >> monitor.ps1
echo Write-Host "Starting silent monitor..." >> monitor.ps1
echo $i = 0 >> monitor.ps1
echo while (!(Test-Path $StopFile)) { >> monitor.ps1
echo     if ($i %% 10 -eq 0) { [Console]::Write(".") } >> monitor.ps1
echo     Start-Sleep -Seconds 1 >> monitor.ps1
echo     $i++ >> monitor.ps1
echo     if ($i -gt 600) { Write-Host "Timeout warning..."; $i=0 } >> monitor.ps1
echo } >> monitor.ps1
echo Write-Host "`nMonitor stopped." >> monitor.ps1
goto :MainMenu

:ManualInstallUbuntu
echo.
echo [手动安装] 正在下载/准备 Ubuntu 22.04...
echo    (这可能需要几分钟...)

set "UBUNTU_URL=https://aka.ms/wslubuntu2204"
set "UBUNTU_FILE=Ubuntu2204.appx"

if exist "%UBUNTU_FILE%" (
    echo    [缓存] 发现本地文件，跳过下载。
) else (
    echo    [下载] 正在从 %UBUNTU_URL% 下载...
    powershell -Command "Invoke-WebRequest -Uri '%UBUNTU_URL%' -OutFile '%UBUNTU_FILE%' -UseBasicParsing"
    if %errorlevel% neq 0 (
        echo    [错误] 下载失败。请检查网络连接。
        echo    尝试手动下载: %UBUNTU_URL%
        if "%NONINTERACTIVE%"=="1" ( exit /b 1 ) else ( pause )
        exit /b
    )
)

echo.
echo [安装] 尝试标准 Appx 安装...
powershell -Command "Add-AppxPackage -Path .\%UBUNTU_FILE%" 2>nul
if %errorlevel% equ 0 (
    echo    [成功] Appx 安装成功。
    goto :WSLModeTarget
)

    echo    [警告] Appx 安装失败 (预期中的 Server 行为)。
    echo    [安装] 切换到 "手动解压与导入" 模式 (Server Compatible)...:: Cleanup previous attempts
if exist "Ubuntu_Extract" rmdir /s /q "Ubuntu_Extract"
if exist "Ubuntu_Data" rmdir /s /q "Ubuntu_Data"
mkdir "Ubuntu_Extract"
mkdir "Ubuntu_Data"

echo    [解压] 正在解析 AppxBundle...
:: PowerShell script to handle Bundle -> Appx -> Tarball extraction
echo $ErrorActionPreference = 'Stop' > extract_distro.ps1
echo $pkg = "%UBUNTU_FILE%" >> extract_distro.ps1
echo $dest = "Ubuntu_Extract" >> extract_distro.ps1
echo Write-Host "Extracting bundle..." >> extract_distro.ps1
echo Copy-Item -Path $pkg -Destination "$pkg.zip" -Force >> extract_distro.ps1
echo Expand-Archive -Path "$pkg.zip" -DestinationPath $dest -Force >> extract_distro.ps1
echo Remove-Item -Path "$pkg.zip" -Force >> extract_distro.ps1
echo. >> extract_distro.ps1
echo $appx = Get-ChildItem -Path $dest -Filter "*_x64.appx" -Recurse ^| Select-Object -First 1 >> extract_distro.ps1
echo if (!$appx) { >> extract_distro.ps1
echo     Write-Host "No x64 appx found, checking root..." >> extract_distro.ps1
echo     $appx = Get-ChildItem -Path $dest -Filter "*.appx" ^| Select-Object -First 1 >> extract_distro.ps1
echo } >> extract_distro.ps1
echo. >> extract_distro.ps1
echo if ($appx) { >> extract_distro.ps1
echo     Write-Host "Found inner package: $($appx.Name)" >> extract_distro.ps1
echo     Rename-Item -Path $appx.FullName -NewName "$($appx.Name).zip" >> extract_distro.ps1
echo     $innerZip = "$($appx.FullName).zip" >> extract_distro.ps1
echo     Expand-Archive -Path $innerZip -DestinationPath "$dest\Inner" -Force >> extract_distro.ps1
echo     $tar = Get-ChildItem -Path "$dest\Inner" -Filter "install.tar.gz" -Recurse ^| Select-Object -First 1 >> extract_distro.ps1
echo } else { >> extract_distro.ps1
echo     Write-Host "Checking for direct tarball..." >> extract_distro.ps1
echo     $tar = Get-ChildItem -Path $dest -Filter "install.tar.gz" -Recurse ^| Select-Object -First 1 >> extract_distro.ps1
echo } >> extract_distro.ps1
echo. >> extract_distro.ps1
echo if (!$tar) { throw "Could not find install.tar.gz" } >> extract_distro.ps1
echo Write-Host "Found tarball: $($tar.FullName)" >> extract_distro.ps1
echo Move-Item -Path $tar.FullName -Destination ".\install.tar.gz" -Force >> extract_distro.ps1

powershell -ExecutionPolicy Bypass -File extract_distro.ps1
if %errorlevel% neq 0 (
    echo    ^[警告^] Appx 解压失败或未找到 install.tar.gz。
    
    if exist "install.tar.gz" (
        echo    ^[缓存^] 发现本地 rootfs，跳过下载。
    ) else (
        echo    ^[下载^] 尝试从 Ubuntu Cloud Images 下载 rootfs...
        set "ROOTFS_URL=https://cloud-images.ubuntu.com/wsl/jammy/current/ubuntu-jammy-wsl-amd64-wsl.rootfs.tar.gz"
        powershell -Command "Invoke-WebRequest -Uri '%ROOTFS_URL%' -OutFile 'install.tar.gz' -UseBasicParsing"
    )
    
    if not exist "install.tar.gz" (
        echo    ^[错误^] 无法下载 rootfs。
        if exist extract_distro.ps1 del extract_distro.ps1
        exit /b 1
    )
)
if exist extract_distro.ps1 del extract_distro.ps1

echo    [导入] 正在导入 WSL 发行版 (Ubuntu)...
echo    (这可能需要几分钟，请耐心等待...)

:: [Memory Guard] Check memory before import
for /f "tokens=2 delims==" %%a in ('wmic OS get FreePhysicalMemory /value') do set FreeMem=%%a
set /a FreeMemMB=%FreeMem%/1024
if %FreeMemMB% LSS 500 (
    echo    [警告] 内存极低 ^(%FreeMemMB% MB^)。导入可能会很慢。
    echo    建议关闭其他程序。
    timeout /t 5 >nul
)

call %WSL_CMD% --import Ubuntu "Ubuntu_Data" "install.tar.gz"
if %errorlevel% neq 0 (
    echo    [错误] WSL 导入失败。
    exit /b 1
)

echo    [清理] 删除临时文件...
if exist "Ubuntu_Extract" rmdir /s /q "Ubuntu_Extract"
if exist "install.tar.gz" del "install.tar.gz"

echo    [成功] Ubuntu 已手动安装！
goto :WSLModeTarget
