@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Angel System Launcher
color 0f

echo [信息] 正在启动 Angel 系统...
echo [信息] 正在检查端口占用情况...

:: ==========================================
:: 1. 清理端口 5500 (Web Low)
:: ==========================================
:check_5500
netstat -aon | findstr ":5500" >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5500"') do (
        echo [清理] 端口 5500 被占用，PID: %%a
        tasklist /fi "pid eq %%a"
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 1 >nul
    goto check_5500
) else (
    echo [状态] 端口 5500 未被占用。
)

:: ==========================================
:: 2. 清理端口 9000 (Web High)
:: ==========================================
:check_9000
netstat -aon | findstr ":9000" >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":9000"') do (
        echo [清理] 端口 9000 被占用，PID: %%a
        tasklist /fi "pid eq %%a"
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 1 >nul
    goto check_9000
) else (
    echo [状态] 端口 9000 未被占用。
)

:: ==========================================
:: 3. 清理端口 8000 (Agent)
:: ==========================================
:check_8000
netstat -aon | findstr ":8000" >nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do (
        echo [清理] 端口 8000 被占用，PID: %%a
        tasklist /fi "pid eq %%a"
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 1 >nul
    goto check_8000
) else (
    echo [状态] 端口 8000 未被占用。
)

echo.
echo [信息] 端口清理完毕，开始启动服务...
echo.

:: 1. 启动 Web_compute_low
echo [1/3] 正在启动 Web_compute_low (端口 5500)...
start "Angel Web Low" /min cmd /k "Web_compute_low\start_server.bat"

:wait_5500
timeout /t 2 >nul
netstat -an | find "5500" >nul
if %errorlevel% neq 0 (
    echo    ...等待 Web_compute_low 就绪...
    goto wait_5500
)
echo [成功] Web_compute_low 已启动。

:: 2. 启动 Web_compute_high
echo [2/3] 正在启动 Web_compute_high (端口 9000)...
start "Angel Web High" /min cmd /k "Web_compute_high\start_server.bat"

:wait_9000
timeout /t 2 >nul
netstat -an | find "9000" >nul
if %errorlevel% neq 0 (
    echo    ...等待 Web_compute_high 就绪...
    goto wait_9000
)
echo [成功] Web_compute_high 已启动。

:: 3. 启动 Agent_angel_server
echo [3/3] 正在启动 Agent_angel_server (端口 8000)...
start "Angel Agent Server" /min cmd /k "Agent_angel_server\start_server.bat"

:wait_8000
timeout /t 2 >nul
netstat -an | find "8000" >nul
if %errorlevel% neq 0 (
    echo    ...等待 Agent_angel_server 就绪...
    goto wait_8000
)
echo [成功] Agent_angel_server 已启动。

echo.
echo [完成] 所有服务已启动。正在打开浏览器...
start http://localhost:5500

timeout /t 3 >nul
exit
