@echo off
cd /d "%~dp0"
chcp 65001 >nul
title Angel Client (GPU 强制模式)
color 0b

echo ==========================================
echo      [启动] Angel 前端 (GPU 强制模式)
echo ==========================================
echo.
echo [提示] 此脚本将尝试强制开启 Edge 浏览器的 GPU 加速。
echo        如果之前小天使无法显示，请尝试使用此方式启动。
echo.
echo [警告] 这将关闭所有已打开的 Edge 浏览器窗口！
echo        请确保您已保存所有工作。
echo.
pause

echo.
echo [1/3] 正在关闭 Edge 浏览器...
taskkill /F /IM msedge.exe /T >nul 2>&1

echo.
echo [2/3] 正在启动 Edge (强制开启 WebGL)...
:: 启动 Edge 并带上强制开启 GPU 的参数
start msedge --ignore-gpu-blocklist --enable-webgl --enable-unsafe-swiftshader --enable-gpu-rasterization --enable-zero-copy http://localhost:5500

echo.
echo [3/3] 正在挂载静态文件服务...
echo.

:: 尝试激活虚拟环境 (如果存在)
if exist "..\.venv\Scripts\activate.bat" (
    call "..\.venv\Scripts\activate.bat"
)

python -m http.server 5500
pause
