@echo off
:: =================================
::  🎉 启动服务器脚本 (无参数)
::
::  🎨 代码用途：
::     初始化环境，清理端口占用，并启动 Angel Agent Server (Python)。
::
::  💡 易懂解释：
::     起床啦！☀️ 先把床铺整理好（清理端口），然后叫醒 Angel（运行 Python），
::     开始新的一天！
:: =================================

chcp 65001 >nul
:: 📂 切换到当前脚本所在目录
cd /d "%~dp0"
:: 🏷️ 设置窗口标题
title Angel Agent Server (Agent - 8000)
:: 🎨 设置控制台颜色 (浅蓝色)
color 0b

echo [启动] 正在启动 Angel Agent Server (端口 8000)...

:: 检查端口 8000
:check_port
:: 🔍 查找占用 8000 端口的进程
netstat -aon | findstr ":8000" >nul
if %errorlevel% equ 0 (
    :: 🔄 如果端口被占用，循环清理
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do (
        echo [清理] 端口 8000 被占用，PID: %%a
        tasklist /fi "pid eq %%a"
        :: 🔪 强制结束进程
        taskkill /f /pid %%a >nul 2>&1
    )
    :: ⏱️ 等待 1 秒
    timeout /t 1 >nul
    goto check_port
) else (
    echo [状态] 端口 8000 未被占用。
)

:: 🐍 激活 Python 虚拟环境
if exist "..\.venv\Scripts\activate.bat" call "..\.venv\Scripts\activate.bat"

:: 🌍 设置 PYTHONPATH 为当前目录
set PYTHONPATH=%~dp0
:: 🚀 启动主程序
python Brain/main.py
if %errorlevel% neq 0 (
    echo [错误] Agent 服务异常退出。
    pause
)
