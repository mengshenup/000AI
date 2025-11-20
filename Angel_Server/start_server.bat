@echo off
cd /d "%~dp0"
chcp 65001 >nul

title Angel Server (Backend - 8000)
color 0b

echo ==========================================
echo      Angel 后端服务器 (Proactor 启动器)
echo ==========================================
echo.

:: === 1. 环境准备 ===
set PYTHONDONTWRITEBYTECODE=1
set PYTHONPATH=%~dp0

:: === 2. 清理进程 ===
echo [1/2] 清理旧进程...
taskkill /f /im python.exe /t >nul 2>&1
timeout /t 1 /nobreak >nul

:: === 3. 启动 ===
echo [2/2] 正在通过 run.py 启动...
echo.
echo [信息] 后端运行在: http://localhost:8000
echo [状态] 热更新已开启 (支持修改代码自动重启)
echo.

:: 🟢 注意：这里改为运行 run.py
python run.py

:: === 4. 错误处理 ===
if %errorlevel% == 0 goto :success
goto :error

:error
color 0c
echo.
echo [ERROR] 启动失败！
echo 请检查 run.py 是否存在。
goto :end

:success
echo.
echo [STOP] 服务器已关闭。

:end
echo.
pause