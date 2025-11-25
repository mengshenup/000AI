@echo off
cd /d "%~dp0"
chcp 65001 >nul
title Angel System Launcher
color 0b

echo ==========================================
echo      🚀 正在启动 Angel 全系统 (智能版)
echo ==========================================
echo.

:: 1. 启动服务端 (大脑)
echo [1/2] 正在启动大脑 (Server)...
echo        - 路径: Agent_angel_server\start_server.bat
echo        - 端口: 8000
start "Angel Server" cmd /c "cd /d Agent_angel_server && call start_server.bat"

:: 2. 智能等待服务端就绪 (动态检测端口)
echo.
echo [等待] 正在监测大脑脑波 (端口 8000)...
set retries=0

:check_loop
:: 使用 PowerShell 尝试连接端口 8000，如果连接成功返回 0，失败返回 1
powershell -Command "$tcp = New-Object System.Net.Sockets.TcpClient; try { $tcp.Connect('localhost', 8000); $tcp.Close(); exit 0 } catch { exit 1 }" >nul 2>&1

if %errorlevel% equ 0 (
    echo.
    echo [成功] 大脑已完全苏醒！(耗时约 %retries% 秒)
    goto :start_client
)

:: 计数并重试
set /a retries+=1
if %retries% geq 60 (
    echo.
    echo [警告] 大脑启动超时 (60秒)，尝试强制启动躯体...
    goto :start_client
)

:: 显示进度条效果 (每秒打印一个点)
<nul set /p=.
timeout /t 1 /nobreak >nul
goto :check_loop

:start_client
:: 3. 启动客户端 (躯体)
echo.
echo [2/2] 正在启动躯体 (Client)...
echo        - 路径: Web_compute_low\start_client.bat
echo        - 端口: 5500
start "Angel Client" cmd /c "cd /d Web_compute_low && call start_client.bat"

echo.
echo ==========================================
echo      ✅ 全系统启动指令已发送！
echo ==========================================
echo.
echo [提示]
echo 1. 请检查弹出的两个黑色窗口是否正常运行。
echo 2. 浏览器应该会自动打开 http://localhost:5500
echo.
echo 这个窗口将在 5 秒后自动关闭...
timeout /t 5 >nul
exit
