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
cd /d "%~dp0"
title Angel Agent Server (Agent - 8000)
color 0b

:Start
echo.
echo [启动] 正在启动 Angel Agent Server (端口 8000)...

:: 检查端口 8000
:CheckPort
netstat -aon | findstr ":8000" >nul
if %errorlevel% equ 0 goto :PortOccupied
goto :CheckEnv

:PortOccupied
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do (
    echo [清理] 端口 8000 被占用，PID: %%a
    tasklist /fi "pid eq %%a"
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 >nul
goto :CheckPort

:CheckEnv
echo [环境] 正在检查依赖库 (requirements.txt)...
pip install -r requirements.txt
if %errorlevel% neq 0 goto :InstallFail
goto :RunServer

:InstallFail
echo [警告] 依赖安装失败，尝试继续启动...
goto :RunServer

:RunServer
echo [状态] 端口 8000 就绪。
echo [启动] 正在运行 Brain/main.py ...

:: 🌍 设置 PYTHONPATH 为当前目录
set PYTHONPATH=%~dp0

:: 🚀 启动主程序 (循环模式)
python Brain/main.py

echo.
echo [警告] Agent 服务已停止。
echo [提示] 按回车键重启服务...
pause
goto :Start
    pause
)
