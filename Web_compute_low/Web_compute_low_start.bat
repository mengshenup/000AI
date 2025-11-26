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
:: 优先检查是否有 Windows 编译产物 (target/debug/server.exe)
if exist "target\debug\server.exe" (
    echo [模式] 检测到 Windows 原生程序，正在启动...
    cargo run --bin server
    goto :EndLoop
)

:: 否则尝试 WSL 模式
echo [模式] 未检测到 Windows 程序，尝试 WSL 模式...
wsl bash -c "lsof -t -i:5500 | xargs -r kill -9" >nul 2>&1
wsl cargo run --bin server

:EndLoop
echo.
echo [警告] 程序已停止。
echo [提示] 按回车键重启...
pause
goto :Start
