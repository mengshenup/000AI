@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

:: ============================================================================
::  🚨 维护者必读：构建脚本踩坑记录 (Build Script Pitfalls)
:: ============================================================================
::  警告：本脚本负责在 Windows Server + WSL1 环境下编译 Rust 项目。
::  与 Setup 脚本不同，这里更关注编译过程、文件系统交互和产物处理。
::
::  [坑 01] 目标目录缺失 (Missing Output Dirs)
::  ❌ 现象：Linux `cp` 命令不会自动创建父目录，导致 "No such file or directory"。
::  ✅ 对策：构建命令中必须包含 `mkdir -p Debug Ops`。
::  👉 状态：已在 $buildCmd 变量中实现。
::
::  [坑 02] 文件锁冲突 (Binary Locking)
::  ❌ 现象：如果 simple_server 正在运行，覆盖文件会报 "Text file busy" 且失败。
::  ✅ 对策：脚本无法强制杀进程(权限/逻辑复杂)，建议用户手动停止，或依赖 Start 脚本的清理。
::  👉 状态：仅在文档中提示，未强制集成 taskkill (防止误杀)。
::
::  [坑 03] 环境变量易失性 (Env Volatility)
::  ❌ 现象：`wsl bash -c` 是独立的 Shell 进程。Setup 脚本设置的 env 这里读不到。
::  ✅ 对策：必须在本脚本中重新计算并注入 RUSTUP_HOME/CARGO_HOME。
::  👉 状态：已在脚本头部 "Portable Mode Config" 区域实现。
::
::  [坑 04] PowerShell 转义BUG (Escaping BUG)
::  ❌ 现象：Batch 传给 PowerShell 再传给 Bash 再传给 Cargo... 引号会消失或报错。
::  ✅ 对策：不要直接在 Batch 里写复杂命令。生成一个临时 .ps1 文件来处理逻辑。
::  👉 状态：已通过 `echo ... > build_task.ps1` 实现。
::
::  [坑 05] 增量编译伪死机 (Incremental Slowdown)
::  ❌ 现象：NTFS 上的 target 目录文件极多，WSL1 扫描变慢，看起来像卡死。
::  ✅ 对策：这是正常现象。只要 CPU 在动就别关。
::  👉 状态：已知限制，无解 (除非换 WSL2，但 Server 不支持)。
::
::  [坑 06] 依赖库链接失败 (Linking Failed)
::  ❌ 现象：编译时报 `openssl-sys` 或 `pkg-config` 错误。
::  ✅ 对策：这是 Setup 脚本的责任。Build 脚本假设环境已就绪。
::  👉 状态：如果报错，提示用户运行 Setup。
::
::  [坑 07] 路径空格 (Spaces in Path)
::  ❌ 现象：项目路径含空格导致 `cargo` 命令被截断。
::  ✅ 对策：$envCmd 中的路径必须用单引号包裹。
::  👉 状态：已在 RUST_ENV 定义中实现。
::
::  [坑 08] 幽灵退出码 (Ghost Exit Code)
::  ❌ 现象：PowerShell 有时会忽略子进程的错误码。
::  ✅ 对策：在 PS 脚本中显式检查 `$LASTEXITCODE` 并抛出 exit 1。
::  👉 状态：已在 build_task.ps1 生成逻辑中实现。
::
::  [坑 09] 伪静态链接 (Glibc Version)
::  ❌ 现象：编译出的程序在其他 Linux 发行版跑不起来 (version `GLIBC_2.xx` not found)。
::  ✅ 对策：WSL Ubuntu 的 glibc 版本较新。发布时需注意目标系统兼容性。
::  👉 状态：架构限制，需知晓。
::
::  [坑 10] 缓存锁 (Cache Lock)
::  ❌ 现象：`Blocking waiting for file lock on package cache`。
::  ✅ 对策：通常是上一次 Ctrl+C 强退导致的。需手动删除 portable 目录下的锁文件。
::  👉 状态：需人工干预。
:: ============================================================================

echo ========================================================
echo   🦀 Angel Web Low - Build Script (Linux/WSL)
echo   构建脚本：编译源码并归位
echo ========================================================

:: [Portable Mode Config]
:: 必须重新加载环境配置，因为这是个独立的脚本
for /f "delims=" %%i in ('wsl wslpath -a .') do set "WSL_PWD=%%i"
set "RUST_DIR=%WSL_PWD%/no_code/wsl_rust_env"

:: [Critical Fix] 使用 WSLENV 传递路径，避免转义问题
set "RUSTUP_HOME=%RUST_DIR%/rustup"
set "CARGO_HOME=%RUST_DIR%/cargo"
set "WSLENV=RUSTUP_HOME/p:CARGO_HOME/p"

:: [Critical Fix] 仅设置 PATH，使用双引号
set "RUST_ENV=export PATH=\"$CARGO_HOME/bin:$PATH\";"

echo [1/2] 正在准备构建环境...
echo    (Using Portable Rust: %RUST_DIR%)

:: 生成 PowerShell 构建脚本
echo $ErrorActionPreference = "Stop" > build_task.ps1
:: [Critical Fix] 使用单引号包裹 RUST_ENV，防止 PowerShell 解析双引号
echo $envCmd = '%RUST_ENV%' >> build_task.ps1
echo Write-Host "🚀 Compiling binaries..." -ForegroundColor Cyan >> build_task.ps1

:: ---------------------------------------------------------
:: 核心构建命令
:: ---------------------------------------------------------
:: 1. cargo build: 编译 simple_server 和 apps_list
:: 2. cp: 将编译好的文件复制到源码目录
:: [Config] 设置 CARGO_TARGET_DIR 到 no_code/target
:: 注意：虽然 .cargo/config.toml 已经配置了，但为了保险起见（防止用户删了它），这里依然显式设置环境变量
echo $buildCmd = "export CARGO_TARGET_DIR=no_code/target && mkdir -p Debug Operator && cargo build --bin simple_server --bin apps_list && cp -f no_code/target/debug/simple_server ./Debug/simple_server && cp -f no_code/target/debug/apps_list ./Operator/apps_list" >> build_task.ps1

echo $fullCmd = "wsl bash -c '$envCmd $buildCmd'" >> build_task.ps1
echo Invoke-Expression $fullCmd >> build_task.ps1
echo if ($LASTEXITCODE -ne 0) { exit 1 } >> build_task.ps1
echo Write-Host "`n✅ Build & Copy Successful!" -ForegroundColor Green >> build_task.ps1

echo.
echo [2/2] 开始编译...
powershell -ExecutionPolicy Bypass -File "build_task.ps1"
if %errorlevel% neq 0 (
    echo.
    echo ❌ 构建失败 ^(Build Failed^).
    echo    请确保您已经运行过 Web_compute_low_setup.bat 安装了环境。
    del build_task.ps1
    pause
    exit /b
)

del build_task.ps1
echo.
echo ========================================================
echo   🎉 构建完成！
echo   文件已生成并归位:
echo   - Debug/simple_server
echo   - Operator/apps_list
echo ========================================================
pause