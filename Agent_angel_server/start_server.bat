@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Angel Agent Server (Agent - 8000)
color 0b

echo [启动] 正在启动 Angel Agent Server (端口 8000)...

:: 检查端口 8000
:check_port
netstat -aon | findstr ":8000" >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do (
        echo [清理] 端口 8000 被占用，PID: %%a
        tasklist /fi "pid eq %%a"
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 1 >nul
    goto check_port
) else (
    echo [状态] 端口 8000 未被占用。
)

if exist "..\.venv\Scripts\activate.bat" call "..\.venv\Scripts\activate.bat"

set PYTHONPATH=%~dp0
python Brain/main.py
if %errorlevel% neq 0 (
    echo [错误] Agent 服务异常退出。
    pause
)
