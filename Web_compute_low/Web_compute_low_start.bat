@echo off
:: =================================
::  🎉 启动服务器脚本 (无参数)
::
::  🎨 代码用途：
::     初始化环境，清理端口占用，并使用 Python 内置的 http.server 启动静态文件服务。
::
::  💡 易懂解释：
::     打开大门！🚪 欢迎光临 Angel 的家（前端页面）！
:: =================================

chcp 65001 >nul
cd /d "%~dp0"
title Angel Web Low (Frontend - 5500)
color 0a

:Start
echo.
echo [启动] 正在启动 Angel Web Low (端口 5500)...

:: 检查端口 5500
:CheckPort
netstat -aon | findstr ":5500" >nul
if %errorlevel% equ 0 goto :PortOccupied
goto :RunServer

:PortOccupied
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5500"') do (
    echo [清理] 端口 5500 被占用，PID: %%a
    tasklist /fi "pid eq %%a"
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 >nul
goto :CheckPort

:RunServer
echo [状态] 端口 5500 就绪。

:: 🚀 启动静态文件服务器 (循环模式)
python -m http.server 5500

echo.
echo [警告] 服务器已停止。
echo [提示] 按回车键重启服务器...
pause
goto :Start
