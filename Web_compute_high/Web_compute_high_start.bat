@echo off
:: =================================
::  🎉 启动服务器脚本 (无参数)
::
::  🎨 代码用途：
::     初始化环境，清理端口占用，并启动 Angel Web High Server (Python)。
::
::  💡 易懂解释：
::     管家上班啦！☀️ 先把办公室打扫干净（清理端口），然后开始工作（运行 Python）！
:: =================================

chcp 65001 >nul
cd /d "%~dp0"
title Angel Web High (Backend - 9000)
color 0d

:Start
echo.
echo [启动] 正在启动 Angel Web High (端口 9000)...

:: 检查端口 9000
:CheckPort
netstat -aon | findstr ":9000" >nul
if %errorlevel% equ 0 goto :PortOccupied
goto :RunServer

:PortOccupied
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":9000"') do (
    echo [清理] 端口 9000 被占用，PID: %%a
    tasklist /fi "pid eq %%a"
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 >nul
goto :CheckPort

:RunServer
echo [状态] 端口 9000 就绪。

:: 🚀 启动主程序 (循环模式)
python server.py

echo.
echo [警告] 服务器已停止。
echo [提示] 按回车键重启服务器...
pause
goto :Start
