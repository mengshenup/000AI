@echo off
chcp 65001 >nul
setlocal

echo ========================================================
echo  🕵️‍♂️ Angel Server 调试启动脚本
echo ========================================================

:: 1. 切换到脚本所在目录
cd /d "%~dp0"

:: 2. 检查虚拟环境是否存在
if not exist "..\.venv\Scripts\activate.bat" (
    echo ❌ 错误: 未找到虚拟环境，请检查 ..\.venv 是否存在。
    pause
    exit /b 1
)

:: 3. 激活虚拟环境
echo 🔌 正在激活 Python 虚拟环境...
call ..\.venv\Scripts\activate.bat

:: 3.5. 自动清理旧进程 (防止端口冲突)
echo 🧹 正在检查并清理占用 8000 端口的旧进程...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    echo 🔪 发现旧进程 (PID: %%a)，正在强制结束...
    taskkill /f /pid %%a >nul 2>&1
)
echo ✅ 端口清理完毕。

:: 4. 启动调试脚本
echo 🚀 正在启动调试器 (debug_run.py)...
echo --------------------------------------------------------
python debug_run.py

:: 5. 退出处理
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 调试器异常退出，错误代码: %ERRORLEVEL%
    echo 💡 请将上方的错误信息复制给 Agent 进行分析。
) else (
    echo.
    echo ✅ 调试会话结束。
)

pause