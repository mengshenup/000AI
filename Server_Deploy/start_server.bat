@echo off
cd /d "%~dp0"
chcp 65001 >nul
title Angel Server Launcher (Full Stack)

echo ==========================================
echo      [启动] Angel 服务器 (全栈模式)
echo ==========================================
echo.
echo 正在启动所有组件...
echo.

:: === 1. 启动 Agent Angel Client (Port 8000) ===
echo [1/4] 启动 Agent Client (本地智能体)...
start "Angel Agent Client" cmd /k "python ..\Web_compute_low\start_agent.py"

:: === 2. 启动 Web Compute High (Port 8080) ===
echo [2/4] 启动 Web Server (云端 Web 服务)...
start "Angel Web Server" cmd /k "python ..\Web_compute_high\server.py"

:: === 3. 启动 Agent Angel Server (Port 8081) ===
echo [3/4] 启动 Agent Server (云端智能体编排)...
start "Angel Agent Server" cmd /k "python ..\Agent_angel_server\server.py"

:: === 4. 启动 Web Compute Low (Frontend Port 5500) ===
echo [4/4] 启动前端服务...
cd ..\Web_compute_low
start http://localhost:5500
python -m http.server 5500

pause
