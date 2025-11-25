@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Angel Web Low (Frontend - 5500)
color 0a

echo [启动] 正在启动 Angel Web Low (端口 5500)...

:: 检查端口 5500
:check_port
netstat -aon | findstr ":5500" >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5500"') do (
        echo [清理] 端口 5500 被占用，PID: %%a
        tasklist /fi "pid eq %%a"
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 1 >nul
    goto check_port
) else (
    echo [状态] 端口 5500 未被占用。
)

if exist "..\.venv\Scripts\activate.bat" call "..\.venv\Scripts\activate.bat"

python -m http.server 5500
if %errorlevel% neq 0 (
    echo [错误] 无法启动 HTTP 服务器 (端口 5500)。
    pause
)
