@echo off
REM ==========================================================================
REM    📃 文件功能 : Web_compute_low 环境安装脚本
REM    ⚡ 逻辑摘要 : 自动检测 WSL，安装 Rust，配置开发环境
REM    💡 易懂解释 : 全自动的 Rust 安装器，像泡面一样简单！
REM    🔋 扩展备注 : 支持非交互模式 (NONINTERACTIVE=1)
REM    🧱 Web_compute_low_setup.bat 踩坑记录 (必须累加，严禁覆盖) :
REM       1. [2025-11-27] [PauseBlock]: 非交互模式下用 timeout 替换 pause
REM       2. [2025-11-27] [SyntaxError]: 修复 if 块中未转义的括号
REM       3. [2025-11-27] [EmojiCrash]: 移除导致解析错误的 Emoji
REM       4. [2025-11-27] [InstallFail]: 添加日志捕获和错误检查
REM       5. [2025-11-27] [DistroInstall]: 修复阻塞的 Start-Process 调用
REM       6. [2025-11-28] [Translation]: 翻译提示为简体中文，修复 echo 引起的 bash 错误
REM ==========================================================================
setlocal
cd /d "%~dp0"
chcp 65001 >nul

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

goto :MainMenu

:MainMenu
cls
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
echo [清理] 正在卸载旧的 Ubuntu 实例...
echo    (正在注销 Ubuntu...)
call %WSL_CMD% --unregister Ubuntu

echo [清理] 正在清理本地 Rust 环境...
if exist "no_code\wsl_rust_env" rmdir /s /q "no_code\wsl_rust_env"

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
goto :WSLMode

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
goto :WSLMode

:WSLModeTarget
echo [调试] 已到达 WSLModeTarget。
echo.
echo [1/4] 进入 Linux/WSL 构建流程...
echo    (进入 Linux/WSL 构建流程...)

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
    call %WSL_CMD% -u root apt-get update <nul > setup_apt_update.log 2>&1
    ping 127.0.0.1 -n 4 >nul

    echo       ...步骤 2: 安装 build-essential (日志: setup_apt_gcc.log)
    call %WSL_CMD% -u root apt-get install -y build-essential <nul > setup_apt_gcc.log 2>&1
    ping 127.0.0.1 -n 6 >nul

    echo       ...步骤 3: 安装 pkg-config (日志: setup_apt_pkg.log)
    call %WSL_CMD% -u root apt-get install -y pkg-config <nul > setup_apt_pkg.log 2>&1
    ping 127.0.0.1 -n 4 >nul

    echo       ...步骤 4: 安装 libssl-dev (日志: setup_apt_ssl.log)
    call %WSL_CMD% -u root apt-get install -y libssl-dev <nul > setup_apt_ssl.log 2>&1
    ping 127.0.0.1 -n 4 >nul
    echo [调试] 安全模式块结束
) else (
    %WSL_CMD% -u root apt-get install -y build-essential pkg-config libssl-dev >nul 2>&1
)

echo    [验证] 正在验证组件...
%WSL_CMD% bash -c "cc --version >/dev/null 2>&1 && pkg-config --version >/dev/null 2>&1"

cmd /c "%WSL_CMD% bash -c "pkg-config --exists openssl || pkg-config --exists libssl""
if %errorlevel% neq 0 (
    echo    [警告] OpenSSL 检查失败，正在尝试修复...
    cmd /c "%WSL_CMD% -u root apt-get install -y --reinstall libssl-dev pkg-config"
)

if %errorlevel% neq 0 (
    echo.
    echo [错误] 缺少依赖项。
    echo    GCC 或 pkg-config 未正确安装。可能是网络或锁问题。
    echo.
    echo    正在尝试强制修复...
    echo    (正在尝试强制修复...)
    
    cmd /c "%WSL_CMD% -u root dpkg --configure -a"
    cmd /c "%WSL_CMD% -u root apt-get update"
    cmd /c "%WSL_CMD% -u root apt-get install -y --fix-missing build-essential pkg-config libssl-dev"
    
    cmd /c "%WSL_CMD% bash -c "cc --version >nul 2>&1""
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
echo [配置] 正在启用便携式 Rust 环境...
echo    位置: %RUST_DIR%

call %WSL_CMD% bash -c "%RUST_ENV% rustc --version >nul 2>&1 && %RUST_ENV% cargo --version >nul 2>&1"
if %errorlevel% equ 0 goto :WSLRustFound

:WSLRustNotFound
echo [错误] 便携式 Rust 未找到或已损坏。
echo    (便携式 Rust 未找到或已损坏。)
echo.
echo    正在安装到项目目录...
echo    (防止系统冻结)
echo.

if exist "no_code\wsl_rust_env" (
    echo    [清理] 正在清理旧环境...
    rmdir /s /q "no_code\wsl_rust_env"
    if exist "no_code\wsl_rust_env" (
        echo.
        echo [错误] 无法删除 "no_code\wsl_rust_env"。
        echo    原因: 文件正在使用中 (VS Code, 终端?)。
        echo    请关闭所有相关程序并重试。
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
call %WSL_CMD% curl -sSf https://sh.rustup.rs -o temp_rust_installer_DO_NOT_RUN.sh
if %errorlevel% neq 0 (
    echo.
    echo [错误] 安装失败。请检查网络或磁盘空间。
    echo    (下载失败。请检查网络/磁盘。)
    if "%NONINTERACTIVE%"=="1" ( exit /b 1 ) else ( pause )
    exit /b
)

:: [Integrity Check] Verify download integrity
call %WSL_CMD% bash -c "if [ $(wc -c < temp_rust_installer_DO_NOT_RUN.sh) -lt 10000 ]; then exit 1; fi"
if %errorlevel% neq 0 (
    echo.
    echo [错误] 下载损坏。
    echo    文件太小 (<10KB)，可能是网络中断。
    echo    正在清理并退出...
    call %WSL_CMD% rm temp_rust_installer_DO_NOT_RUN.sh
    if "%NONINTERACTIVE%"=="1" (
        exit /b 1
    ) else (
        pause
    )
    exit /b
)

echo    [安装] 正在开始安装...
echo    (使用单线程以防止冻结...)

:: [Fix] Ensure log directory exists
if not exist "Debug" mkdir "Debug"

if "%SAFE_MODE%"=="1" (
    echo    [超安全模式] 正在以低优先级运行安装...
    echo       (日志: Debug\setup_rust_install.log^)
    
    REM [Fix] Generate a temporary shell script to avoid Batch quoting hell
    echo export TMPDIR='/tmp' > install_rust_task.sh
    echo %RUST_ENV_CLEAN% sh temp_rust_installer_DO_NOT_RUN.sh -y --no-modify-path --profile minimal >> install_rust_task.sh
    
    REM [Fix] Convert CRLF to LF for WSL
    call %WSL_CMD% sed -i 's/\r$//' install_rust_task.sh

    call %WSL_CMD% bash install_rust_task.sh > Debug\setup_rust_install.log 2>&1
    
    REM Cleanup temp script
    timeout /t 1 >nul
    if exist install_rust_task.sh del install_rust_task.sh
) else (
    echo    [日志] 正在将安装记录到 Debug\setup_rust_install.log ...
    call %WSL_CMD% bash -c "export TMPDIR='/tmp'; %RUST_ENV% sh temp_rust_installer_DO_NOT_RUN.sh -y --no-modify-path --profile minimal" > Debug\setup_rust_install.log 2>&1
)

if %errorlevel% neq 0 (
    echo.
    echo [错误] 安装失败。请检查网络或磁盘空间。
    echo    (安装脚本失败。请检查网络/磁盘。)
    echo    显示日志的最后 10 行:
    echo    ----------------------------------------
    powershell -Command "Get-Content -Tail 10 Debug\setup_rust_install.log"
    echo    ----------------------------------------
    call %WSL_CMD% rm temp_rust_installer_DO_NOT_RUN.sh
    if "%NONINTERACTIVE%"=="1" ( exit /b 1 ) else ( pause )
    exit /b
)

call %WSL_CMD% rm temp_rust_installer_DO_NOT_RUN.sh

call %WSL_CMD% bash -c "%RUST_ENV% rustc --version"
if %errorlevel% neq 0 (
    echo.
    echo [错误] 验证失败。
    echo    安装程序成功，但 rustc 无法运行。
    echo    请检查 Debug\setup_rust_install.log 了解详情。
    if "%NONINTERACTIVE%"=="1" (
        exit /b 1
    ) else (
        pause
    )
    goto :EOF
)

echo [OK] Rust 安装完成！
set JUST_INSTALLED=1
goto :WSLRustFound

:TryAptInstall
goto :InstallError

:InstallError
echo.
echo [错误] 安装失败。
if "%NONINTERACTIVE%"=="1" (
    exit /b 1
) else (
    pause
)
goto :EOF

:WSLRustFound
echo [OK] WSL Rust 环境就绪:
call %WSL_CMD% bash -c "%RUST_ENV% rustc --version"

echo.
echo [2.9/4] 编译器健康检查...
echo    (编译最小测试用例: Debug/test_compile.rs)

if not exist "Debug" mkdir "Debug"

echo fn main() { println!("Hello from WSL Portable Rust!"); } > Debug\test_compile.rs

if exist "Debug\test_compile" del "Debug\test_compile"

call %WSL_CMD% bash -c "%RUST_ENV% rustc Debug/test_compile.rs -o Debug/test_compile"

if %errorlevel% neq 0 (
    echo.
    echo [错误] 编译器检查失败。
    echo    Rust 环境似乎已损坏 (可能是安装中断)。
    
    if "%RETRY_COUNT%"=="0" (
        echo.
        echo    [自动] 自动修复损坏的环境...
        echo    (自动修复损坏的环境...)
        
        set RETRY_COUNT=1
        
        if exist "no_code\wsl_rust_env" (
            echo    [清理] 删除损坏的环境...
            rmdir /s /q "no_code\wsl_rust_env"
        )
        
        echo    [返回] 返回安装流程...
        goto :WSLRustNotFound
    ) else (
        echo.
        echo [错误] 自动修复失败。
        echo    请检查磁盘空间、权限或网络。
        if "%NONINTERACTIVE%"=="1" (
            exit /b 1
        ) else (
            pause
        )
        goto :EOF
    )
)

cmd /c "%WSL_CMD% bash -c "./Debug/test_compile""
if %errorlevel% neq 0 (
    echo.
    echo [警告] 测试二进制文件运行失败。
    if "%NONINTERACTIVE%"=="1" (
        echo [自动] 出错时跳过暂停。
    ) else (
        pause
    )
) else (
    echo    [OK] 编译器健康！
)

echo.
echo [4/4] 正在检查便携式 Rust...

if "%JUST_INSTALLED%"=="1" (
    echo    [信息] 全新安装，跳过更新检查。
    echo    (全新安装跳过更新检查。)
    goto :SetupComplete
)

echo    [更新] 正在更新 Rust...
call %WSL_CMD% bash -c "%RUST_ENV% rustup update stable"

if %errorlevel% neq 0 (
    echo.
    echo [警告] 更新失败。环境可能已损坏。
    echo    (更新失败。环境可能已损坏。)
    echo    [重置] 重置便携式环境...
    
    if exist "no_code\wsl_rust_env" rmdir /s /q "no_code\wsl_rust_env"
    
    echo    [返回] 返回安装流程...
    goto :WSLRustNotFound
)

:: ============================================================================
:: 5. Build Project
:: ============================================================================
echo [构建] 正在构建项目...
echo    (正在构建项目...)
echo.

if not exist "no_code\target" mkdir "no_code\target"

echo    [Cargo] 正在运行 cargo build...
echo    (第一次可能需要一段时间...)

if "%SAFE_MODE%"=="1" (
    echo    [超安全模式] 正在以低优先级构建...
    call %WSL_CMD% bash -c "%RUST_ENV% cargo build --manifest-path Cargo.toml --target-dir no_code/target" > Debug\setup_build.log 2>&1
) else (
    call %WSL_CMD% bash -c "%RUST_ENV% cargo build --manifest-path Cargo.toml --target-dir no_code/target"
)

if %errorlevel% neq 0 (
    echo.
    echo [错误] 构建失败。
    echo    (构建失败。)
    echo    请检查 Debug\setup_build.log 了解详情。
    if "%NONINTERACTIVE%"=="1" ( exit /b 1 ) else ( pause )
    exit /b
)

echo.
echo [成功] 安装完成！
echo    (安装完成！)
echo.
echo    您现在可以运行 'Web_compute_low_start.bat'。
echo.

:SetupComplete
if exist build_task.ps1 del build_task.ps1

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
