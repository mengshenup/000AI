@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Angel System Launcher
color 0f

:Start
cls
echo ========================================================
echo  🚀 Angel System Launcher
echo ========================================================
echo.
echo [信息] 正在检查端口占用情况...

:: ==========================================
:: 1. 清理端口 5500 (Web Low)
:: ==========================================
:Check5500
netstat -aon | findstr ":5500" >nul
if %errorlevel% equ 0 goto :Clean5500
goto :Check9000

:Clean5500
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5500"') do (
    echo [清理] 端口 5500 被占用，PID: %%a
    tasklist /fi "pid eq %%a"
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 >nul
goto :Check5500

:: ==========================================
:: 2. 清理端口 9000 (Web High)
:: ==========================================
:Check9000
netstat -aon | findstr ":9000" >nul
if %errorlevel% equ 0 goto :Clean9000
goto :Check8000

:Clean9000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":9000"') do (
    echo [清理] 端口 9000 被占用，PID: %%a
    tasklist /fi "pid eq %%a"
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 >nul
goto :Check9000

:: ==========================================
:: 3. 清理端口 8000 (Agent)
:: ==========================================
:Check8000
netstat -aon | findstr ":8000" >nul
if %errorlevel% equ 0 goto :Clean8000
goto :LaunchServices

:Clean8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do (
    echo [清理] 端口 8000 被占用，PID: %%a
    tasklist /fi "pid eq %%a"
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 >nul
goto :Check8000

:LaunchServices
echo.
echo [信息] 端口清理完毕，开始启动服务...
echo.

:: 1. 启动 Web_compute_low
echo [1/3] 正在启动 Web_compute_low (端口 5500)...
start "Angel Web Low" /min cmd /k "Web_compute_low\Web_compute_low_start.bat"

:Wait5500
timeout /t 2 >nul
netstat -an | find "5500" >nul
if %errorlevel% neq 0 (
    echo    ...等待 Web_compute_low 就绪...
    goto :Wait5500
)
echo [成功] Web_compute_low 已启动。

:: 2. 启动 Web_compute_high
echo [2/3] 正在启动 Web_compute_high (端口 9000)...
start "Angel Web High" /min cmd /k "Web_compute_high\Web_compute_high_start.bat"

:Wait9000
timeout /t 2 >nul
netstat -an | find "9000" >nul
if %errorlevel% neq 0 (
    echo    ...等待 Web_compute_high 就绪...
    goto :Wait9000
)
echo [成功] Web_compute_high 已启动。

:: 3. 启动 Agent_angel_server
echo [3/3] 正在启动 Agent_angel_server (端口 8000)...
start "Angel Agent Server" /min cmd /k "Agent_angel_server\Agent_angel_server_start.bat"

:Wait8000
timeout /t 2 >nul
netstat -an | find "8000" >nul
if %errorlevel% neq 0 (
    echo    ...等待 Agent_angel_server 就绪...
    goto :Wait8000
)
echo [成功] Agent_angel_server 已启动。

echo.
echo ========================================================
echo  🎉 所有服务启动完成！
echo ========================================================
echo.
echo [提示] 按回车键可以重新扫描并重启所有服务...
pause
goto :Start
)
echo [成功] Agent_angel_server 已启动。

echo.
echo [完成] 所有服务已启动。正在打开浏览器...
start http://localhost:5500

timeout /t 3 >nul
exit
