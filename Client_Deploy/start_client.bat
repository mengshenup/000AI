@echo off
cd /d "%~dp0"
chcp 65001 >nul
title Angel Client Launcher

echo ==========================================
echo      [启动] Angel 客户端 (用户模式)
echo ==========================================
echo.

:: === 1. 启动本地智能体 (Agent Angel Client) ===
echo [1/3] 正在启动本地智能体 (Port 8000)...
:: 使用 start 启动新窗口运行 Python 脚本
:: 注意：我们需要指向 Web_compute_low 下的启动脚本
start "Angel Agent Client" cmd /k "python ..\Web_compute_low\start_agent.py"

:: === 2. 启动前端界面 (Web Compute Low) ===
echo [2/3] 正在启动前端服务 (Port 5500)...
:: 必须切换到 Web_compute_low 目录，否则 http.server 会服务错误的目录
cd ..\Web_compute_low

:: === 3. 自动打开浏览器 ===
echo [3/3] 正在自动打开浏览器...
start http://localhost:5500

:: 启动 HTTP 服务器
python -m http.server 5500

pause
