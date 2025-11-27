@echo off
REM ==========================================================================
REM    File: Web_compute_low Environment Setup Script
REM    Logic: Auto-detect WSL, install Rust, configure dev environment
REM    Desc: Fully automated installer for Rust in WSL.
REM    Note: Supports non-interactive mode (NONINTERACTIVE=1)
REM    History:
REM       [2025-11-27] [PauseBlock]: Replaced pause with timeout in non-interactive mode
REM       [2025-11-27] [SyntaxError]: Fixed unescaped brackets in if-blocks
REM       [2025-11-27] [EmojiCrash]: Removed Emojis causing parser errors
REM       [2025-11-27] [InstallFail]: Added log capture and error checking
REM       [2025-11-27] [DistroInstall]: Fixed blocking Start-Process call
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
echo   v2.3 (Ultra-Safe Mode Enabled)
echo ========================================================
echo.
echo   1. Start/Continue Setup
echo   2. [Reset/Fix] Ubuntu (Reset/Fix Ubuntu)
echo      - Select this if password setup failed or install stuck!
echo.
if "%NONINTERACTIVE%"=="1" (
    echo [Auto] Non-Interactive Mode detected. Defaulting to Option 1.
    set choice=1
) else (
    set /p choice="Please select (Input 1 or 2): "
)
if "%choice%"=="2" goto :FactoryReset
goto :CheckEnv

:FactoryReset
echo.
echo [Trash] Uninstalling old Ubuntu instance...
echo    (Unregistering Ubuntu...)
call %WSL_CMD% --unregister Ubuntu

echo [Trash] Cleaning local Rust environment...
if exist "no_code\wsl_rust_env" rmdir /s /q "no_code\wsl_rust_env"

echo.
echo [OK] Cleanup complete! You can now reinstall.
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
echo [0/3] Checking system resources...

for /f "tokens=2 delims==" %%a in ('wmic OS get FreePhysicalMemory /value') do set FreeMem=%%a
set /a FreeMemMB=%FreeMem%/1024
echo    Available Memory: %FreeMemMB% MB

if %FreeMemMB% LSS 1500 (
    echo    [WARN] Low Memory ^(^<1.5GB^)! Enabling Ultra-Safe Mode.
    set SAFE_MODE=1
    set "RUSTUP_IO_THREADS=1"
    set "CARGO_BUILD_JOBS=1"
    set "WSLENV=RUSTUP_IO_THREADS/p:CARGO_BUILD_JOBS/p"
) else (
    echo    [OK] Memory sufficient.
    set SAFE_MODE=0
    set "RUSTUP_IO_THREADS=1"
    set "WSLENV=RUSTUP_IO_THREADS/p"
)

wmic os get caption | findstr /i "Server" >nul
if %errorlevel% neq 0 goto :NotServer
echo [WARN] Windows Server detected.
echo    Please ensure WSL is enabled.
:NotServer
echo [Debug] Checking WSL status...
call %WSL_CMD% --status >nul 2>&1
if %errorlevel% neq 0 goto :WSLNotFound

:: [Integrity Check] Verify WSL Core (Skipped wsl --list as it fails with no distro)
:: %WSL_CMD% --list >nul 2>&1

call %WSL_CMD% echo check >nul 2>&1
if %errorlevel% neq 0 goto :DistroNotFound

echo [OK] Environment Check Passed (WSL Linux Mode).
goto :WSLModeTarget

:WSLBroken
echo.
echo [Error] WSL Core Broken.
echo    (Unable to list distributions.)
echo.
echo    [Auto] Attempting auto-fix (Running wsl --update)...
call %WSL_CMD% --update
if %errorlevel% neq 0 (
    echo.
    echo [Error] Auto-fix failed.
    echo    Please run in PowerShell (Admin):
    echo      dism.exe /online /cleanup-image /restorehealth
    echo      sfc /scannow
    echo.
    if "%NONINTERACTIVE%"=="1" ( timeout /t 5 >nul ) else ( pause )
    exit /b 1
)
echo [OK] Fix attempt complete. Please restart script.
if "%NONINTERACTIVE%"=="1" ( timeout /t 3 >nul ) else ( pause )
exit /b

:WSLNotFound
echo [Error] WSL not found (Windows Subsystem for Linux).
echo.
echo    Attempting to auto-install WSL...
echo    (Installing WSL...)
echo.
echo    Requires Admin privileges.
echo    (Requires Admin privileges.)
echo.

powershell -Command "Start-Process '%WSL_CMD%' -ArgumentList '--install' -Verb RunAs -Wait"

echo.
echo [Info] Please follow the prompts.
echo    (Please follow the prompts.)
echo.
echo    After installation, please [RESTART COMPUTER] and run again.
echo    (Please RESTART your computer after installation.)
if "%NONINTERACTIVE%"=="1" ( timeout /t 5 >nul ) else ( pause )
exit /b

:DistroNotFound
echo [Error] No default Linux distro found.
echo.
echo    [Compat] Setting WSL default version to 1...
echo    (Setting WSL default version to 1 for compatibility...)
call %WSL_CMD% --set-default-version 1 >nul 2>&1

echo.
echo    ========================================================
echo    [Installation Guide]
echo    ========================================================
echo    A black Ubuntu window will pop up.
echo    Please follow these steps:
echo.
echo    1. When you see "Enter new UNIX username":
echo       Type: admin  (and press Enter)
echo.
echo    2. When you see "New password":
echo       Type: 0      (Note: It will be invisible!)
echo       Press Enter
echo.
echo    3. When you see "Retype new password":
echo       Type: 0
echo       Press Enter
echo.
echo    (Linux security requires manual password entry)
echo    ========================================================
echo.
echo    [Known Issues / 常见问题]
echo    If you see "password updated successfully" but then an error:
echo    "Create process failed" or "Broken pipe"...
echo    Please ignore it! Installation is likely successful.
echo    Close the popup window and press any key here to continue.
echo.
echo    Ready? Press any key to start installation...
if "%NONINTERACTIVE%"=="1" (
    timeout /t 3 >nul
) else (
    pause >nul
)

if "%NONINTERACTIVE%"=="1" (
    echo [Auto] Attempting non-interactive install (Ubuntu)...
    call %WSL_CMD% --install -d Ubuntu
) else (
    powershell -Command "Start-Process cmd -ArgumentList '/k %WSL_CMD% --install -d Ubuntu' -Verb RunAs -Wait"
)

echo.
echo [Info] After the window closes, press any key to continue...
if "%NONINTERACTIVE%"=="1" (
    timeout /t 5 >nul
) else (
    pause
)

call %WSL_CMD% -d Ubuntu echo check >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [Error] Still cannot connect to Ubuntu.
    echo.
    echo    This might be because the installation stuck or environment issues.
    echo.
    echo    - Suggest selecting "2. Reset/Fix Ubuntu" in main menu
    echo       to delete and reinstall.
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
echo [Info] If installation succeeded, press any key to continue...
echo    (If installation is complete, press any key to continue...)
if "%NONINTERACTIVE%"=="1" (
    timeout /t 3 >nul
) else (
    pause
)

call %WSL_CMD% echo check >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [Error] Still cannot connect to Linux distro.
    echo.
    echo    Possible Reasons:
    echo    1. You just installed WSL but haven't [RESTARTED COMPUTER].
    echo       (You need to RESTART your computer.)
    echo    2. Windows Server might need manual feature enablement.
    echo       (Windows Server might need manual feature enablement.)
    echo.
    echo    Please try running this manually to see errors:
    echo    %WSL_CMD% --install -d Ubuntu
    echo.
    echo    Then restart computer.
    if "%NONINTERACTIVE%"=="1" (
        exit /b 1
    ) else (
        pause
    )
    exit /b
)
goto :WSLMode

:WSLModeTarget
echo [Debug] Arrived at WSLModeTarget.
echo.
echo [1/4] Entering Linux/WSL build process...
echo    (Entering Linux/WSL build process...)

echo.
echo [1.1/4] Checking Dependencies...
echo    (Installing build-essential, pkg-config, libssl-dev...)

echo    [Clean] Cleaning package locks...
call %WSL_CMD% -u root rm /var/lib/apt/lists/lock >nul 2>&1
call %WSL_CMD% -u root rm /var/cache/apt/archives/lock >nul 2>&1
call %WSL_CMD% -u root rm /var/lib/dpkg/lock* >nul 2>&1
call %WSL_CMD% -u root dpkg --configure -a >nul 2>&1
call %WSL_CMD% -u root apt-get update >nul 2>&1

echo    [Install] Installing/Updating compiler toolchain...

if "%SAFE_MODE%"=="1" (
    echo    [Ultra-Safe Mode] Installing step-by-step...
    echo       (Installing dependencies one by one...)
    
    echo       ...Step 1: Update (Log: setup_apt_update.log)
    start /b /low /wait cmd /c "%WSL_CMD% -u root apt-get update <nul > setup_apt_update.log 2>&1"
    timeout /t 3 >nul

    echo       ...Step 2: Install build-essential (Log: setup_apt_gcc.log)
    start /b /low /wait cmd /c "%WSL_CMD% -u root apt-get install -y build-essential <nul > setup_apt_gcc.log 2>&1"
    timeout /t 5 >nul

    echo       ...Step 3: Install pkg-config (Log: setup_apt_pkg.log)
    start /b /low /wait cmd /c "%WSL_CMD% -u root apt-get install -y pkg-config <nul > setup_apt_pkg.log 2>&1"
    timeout /t 3 >nul

    echo       ...Step 4: Install libssl-dev (Log: setup_apt_ssl.log)
    start /b /low /wait cmd /c "%WSL_CMD% -u root apt-get install -y libssl-dev <nul > setup_apt_ssl.log 2>&1"
    timeout /t 3 >nul
) else (
    %WSL_CMD% -u root apt-get install -y build-essential pkg-config libssl-dev >nul 2>&1
)

echo    [Verify] Verifying components...
%WSL_CMD% bash -c "cc --version >/dev/null 2>&1 && pkg-config --version >/dev/null 2>&1"

cmd /c "%WSL_CMD% bash -c "pkg-config --exists openssl || pkg-config --exists libssl""
if %errorlevel% neq 0 (
    echo    [Warn] OpenSSL check failed, attempting fix...
    cmd /c "%WSL_CMD% -u root apt-get install -y --reinstall libssl-dev pkg-config"
)

if %errorlevel% neq 0 (
    echo.
    echo [Error] Missing Dependencies.
    echo    GCC or pkg-config not installed correctly. Likely network or lock issue.
    echo.
    echo    Attempting force fix...
    echo    (Attempting force fix...)
    
    cmd /c "%WSL_CMD% -u root dpkg --configure -a"
    cmd /c "%WSL_CMD% -u root apt-get update"
    cmd /c "%WSL_CMD% -u root apt-get install -y --fix-missing build-essential pkg-config libssl-dev"
    
    cmd /c "%WSL_CMD% bash -c "cc --version >nul 2>&1""
    if %errorlevel% neq 0 (
        echo.
        echo [Error] Fix failed. Cannot install compiler.
        echo    Check network, or try manually:
        echo    %WSL_CMD% -u root apt-get install build-essential pkg-config libssl-dev
        if "%NONINTERACTIVE%"=="1" (
            exit /b 1
        ) else (
            pause
        )
        exit /b
    )
)

echo [OK] Dependency check complete.

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
echo [Error] Portable Rust not found or corrupted.
echo    (Portable Rust not found or corrupted.)
echo.
echo    Installing to project dir...
echo    (Prevents system freeze)
echo.

if exist "no_code\wsl_rust_env" (
    echo    [Clean] Cleaning old environment...
    rmdir /s /q "no_code\wsl_rust_env"
    if exist "no_code\wsl_rust_env" (
        echo.
        echo [Error] Cannot delete "no_code\wsl_rust_env".
        echo    Reason: File in use (VS Code, Terminal?).
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

echo    [Check] Pre-flight checks...
call %WSL_CMD% ping -c 1 8.8.8.8 >nul 2>&1
if %errorlevel% neq 0 echo    [WARN] Network unreachable (Ping 8.8.8.8 failed).

echo    [Download] Downloading installer...
call %WSL_CMD% curl -sSf https://sh.rustup.rs -o temp_rust_installer_DO_NOT_RUN.sh
if %errorlevel% neq 0 (
    echo.
    echo [Error] Install failed. Check network or disk space.
    echo    (Download Failed. Check network/disk.)
    if "%NONINTERACTIVE%"=="1" ( exit /b 1 ) else ( pause )
    exit /b
)

:: [Integrity Check] Verify download integrity
call %WSL_CMD% bash -c "if [ $(wc -c < temp_rust_installer_DO_NOT_RUN.sh) -lt 10000 ]; then exit 1; fi"
if %errorlevel% neq 0 (
    echo.
    echo [Error] Download Corrupted.
    echo    File too small (<10KB), likely network interruption.
    echo    Cleaning up and exiting...
    call %WSL_CMD% rm temp_rust_installer_DO_NOT_RUN.sh
    if "%NONINTERACTIVE%"=="1" (
        exit /b 1
    ) else (
        pause
    )
    exit /b
)

echo    [Install] Starting installation...
echo    (Using single thread to prevent freeze...)

:: [Fix] Ensure log directory exists
if not exist "Debug" mkdir "Debug"

if "%SAFE_MODE%"=="1" (
    echo    [Ultra-Safe Mode] Running installation with low priority...
    echo       (Log: Debug\setup_rust_install.log^)
    
    REM [Fix] Generate a temporary shell script to avoid Batch quoting hell
    echo export TMPDIR='/tmp' > install_rust_task.sh
    echo %RUST_ENV_CLEAN% sh temp_rust_installer_DO_NOT_RUN.sh -y --no-modify-path --profile minimal >> install_rust_task.sh
    
    REM [Fix] Convert CRLF to LF for WSL
    call %WSL_CMD% sed -i 's/\r$//' install_rust_task.sh

    start /b /low /wait cmd /c "%WSL_CMD% bash install_rust_task.sh > Debug\setup_rust_install.log 2>&1"
    
    REM Cleanup temp script
    timeout /t 1 >nul
    if exist install_rust_task.sh del install_rust_task.sh
) else (
    echo    [Log] Logging installation to Debug\setup_rust_install.log ...
    call %WSL_CMD% bash -c "export TMPDIR='/tmp'; %RUST_ENV% sh temp_rust_installer_DO_NOT_RUN.sh -y --no-modify-path --profile minimal" > Debug\setup_rust_install.log 2>&1
)

if %errorlevel% neq 0 (
    echo.
    echo [Error] Install failed. Check network or disk space.
    echo    (Installer Script Failed. Check network/disk.)
    echo    Showing last 10 lines of log:
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
    echo [Error] Verification Failed.
    echo    Installer succeeded but rustc cannot run.
    echo    Check Debug\setup_rust_install.log for details.
    if "%NONINTERACTIVE%"=="1" (
        exit /b 1
    ) else (
        pause
    )
    goto :EOF
)

echo [OK] Rust installation complete!
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
    echo    Rust environment seems corrupted (maybe interrupted install).
    
    if "%RETRY_COUNT%"=="0" (
        echo.
        echo    [Auto] Auto-repairing corrupted environment...
        echo    (Auto-repairing corrupted environment...)
        
        set RETRY_COUNT=1
        
        if exist "no_code\wsl_rust_env" (
            echo    [Clean] Deleting corrupted environment...
            rmdir /s /q "no_code\wsl_rust_env"
        )
        
        echo    [Back] Returning to install flow...
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

cmd /c "%WSL_CMD% bash -c "./Debug/test_compile""
if %errorlevel% neq 0 (
    echo.
    echo [Warn] Test binary failed to run.
    if "%NONINTERACTIVE%"=="1" (
        echo [Auto] Skipping pause on error.
    ) else (
        pause
    )
) else (
    echo    [OK] Compiler is healthy!
)

echo.
echo [4/4] Checking Portable Rust...

if "%JUST_INSTALLED%"=="1" (
    echo    [Info] Fresh install, skipping update check.
    echo    (Skipping update check for fresh install.)
    goto :SetupComplete
)

echo    [Update] Updating Rust...
call %WSL_CMD% bash -c "%RUST_ENV% rustup update stable"

if %errorlevel% neq 0 (
    echo.
    echo [Warn] Update failed. Environment might be corrupted.
    echo    (Update failed. Environment might be corrupted.)
    echo    [Reset] Resetting Portable Environment...
    
    if exist "no_code\wsl_rust_env" rmdir /s /q "no_code\wsl_rust_env"
    
    echo    [Back] Returning to install flow...
    goto :WSLRustNotFound
)

:: ============================================================================
:: 5. Build Project
:: ============================================================================
echo [Build] Building Project...
echo    (Building Project...)
echo.

if not exist "no_code\target" mkdir "no_code\target"

echo    [Cargo] Running cargo build...
echo    (This may take a while for the first time...)

if "%SAFE_MODE%"=="1" (
    echo    [Ultra-Safe Mode] Building with low priority...
    start /b /low /wait cmd /c "%WSL_CMD% bash -c '%RUST_ENV% cargo build --manifest-path Cargo.toml --target-dir no_code/target' > Debug\setup_build.log 2>&1"
) else (
    call %WSL_CMD% bash -c "%RUST_ENV% cargo build --manifest-path Cargo.toml --target-dir no_code/target"
)

if %errorlevel% neq 0 (
    echo.
    echo [Error] Build Failed.
    echo    (Build Failed.)
    echo    Check Debug\setup_build.log for details.
    if "%NONINTERACTIVE%"=="1" ( exit /b 1 ) else ( pause )
    exit /b
)

echo.
echo [Success] Setup Complete!
echo    (Setup Complete!)
echo.
echo    You can now run 'Web_compute_low_start.bat'.
echo.

:SetupComplete
if exist build_task.ps1 del build_task.ps1

:: [Garbage Collection] Auto-clean logs
if exist setup_apt_update.log (
    if not exist "Debug\Trash\AutoClean" mkdir "Debug\Trash\AutoClean"
    move setup_*.log "Debug\Trash\AutoClean\" >nul 2>&1
    echo    [Clean] Archived install logs to Debug\Trash\AutoClean
)

echo.
echo ========================================================
echo   [Setup Complete]
echo ========================================================
echo.
echo   Next Steps:
echo   1. Run Web_compute_low_build.bat  -> Build Project
echo   2. Run Web_compute_low_start.bat  -> Start Server
echo   3. Run Web_compute_low_package.bat -> Package for Release
echo.
if "%NONINTERACTIVE%"=="1" (
    timeout /t 3 >nul
) else (
    pause
)
goto :EOF
