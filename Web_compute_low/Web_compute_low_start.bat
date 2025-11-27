@echo off
:: =================================
::  🎉 启动服务器脚本 (Linux/WSL)
::
::  🎨 代码用途：
::     通过 WSL 启动 Rust 编译的 Linux 二进制文件。
::
::  💡 易懂解释：
::     启动引擎！🚀 在 Linux 世界里跑起来！
:: =================================

chcp 65001 >nul
cd /d "%~dp0"
title Angel Web Low (Linux/WSL)
color 0a

:Start
echo.
echo [启动] 正在启动 Web_compute_low (端口 5500)...

:: 1. 清理 Windows 侧端口占用
netstat -aon | findstr ":5500" >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5500"') do (
        echo [清理] Windows 端口 5500 被占用，PID: %%a
        taskkill /f /pid %%a >nul 2>&1
    )
)

:: 2. 智能判断启动模式
:: 优先检查是否有 Windows 编译产物 (no_code/target/debug/server.exe)
if exist "no_code\target\debug\server.exe" (
    echo [模式] 检测到 Windows 原生程序，正在启动...
    set CARGO_TARGET_DIR=no_code/target
    cargo run --bin server
    goto :EndLoop
)

:: 否则尝试 WSL 模式
echo [模式] 未检测到 Windows 程序，尝试 WSL 模式...

:: [Portable Mode Support]
:: 计算路径并设置环境变量，确保能找到我们刚安装的 Rust
for /f "delims=" %%i in ('wsl wslpath -a .') do set "WSL_PWD=%%i"
set "RUST_DIR=%WSL_PWD%/no_code/wsl_rust_env"
set "RUSTUP_HOME=%RUST_DIR%/rustup"
set "CARGO_HOME=%RUST_DIR%/cargo"
:: [Bug Fix] 给路径加上单引号，防止路径中包含空格导致报错
set "RUST_ENV=export RUSTUP_HOME='%RUSTUP_HOME%'; export CARGO_HOME='%CARGO_HOME%'; export PATH='%CARGO_HOME%/bin':$PATH;"

:: 清理端口
wsl bash -c "lsof -t -i:5500 | xargs -r kill -9" >nul 2>&1

:: 启动服务器
echo [启动] Running in WSL (Portable Env)...
echo    Target: Debug/simple_server

:: [Pre-flight Check] 检查文件是否存在
wsl bash -c "[ -f ./Debug/simple_server ]"
if %errorlevel% neq 0 (
    echo.
    echo ❌ 启动失败：找不到服务器程序。
    echo    (Binary 'Debug/simple_server' not found)
    echo.
    echo    👉 请先运行 [Web_compute_low_build.bat] 进行编译！
    echo       (Please run build script first!)
    echo.
    pause
    goto :EndLoop
)

cmd /c "wsl bash -c '%RUST_ENV% ./Debug/simple_server'"

:EndLoop
echo.
echo [警告] 程序已停止。
echo [提示] 按回车键重启...
pause
goto :Start
