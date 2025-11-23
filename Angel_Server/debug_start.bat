@echo off
cd /d "%~dp0"
chcp 65001 >nul
setlocal

echo ========================================================
echo  Angel Server 调试启动脚本
echo ========================================================

:: 1. 环境准备
set PYTHONPATH=%~dp0
:: 🔧 优化控制台体验 (防挂起/防乱码)
powershell -Command "&{$c=[Console];$m=$c::In.GetMode();$m=$m -band -not 0x0040;$c::In.SetMode($m);$r=$c::BufferHeight;if($r -lt 3000){$c::BufferHeight=3000}}" >nul 2>&1

:: 2. 检查虚拟环境是否存在
if not exist "..\.venv\Scripts\activate.bat" goto :venv_error

:: 3. 激活虚拟环境
echo [信息] 正在激活 Python 虚拟环境...
call "..\.venv\Scripts\activate.bat"
if %errorlevel% neq 0 goto :venv_error

:: 3.5. 自动清理旧进程 (防止端口冲突)
echo [信息] 正在检查并清理占用 8000 端口的旧进程...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    for /f "tokens=1" %%b in ('tasklist /nh /fi "pid eq %%a"') do (
        echo [清理] 发现旧进程 PID: %%a    %%b
    )
    taskkill /f /pid %%a >nul 2>&1
)
echo [完成] 端口清理完毕。

:: 4. 启动调试脚本
echo [启动] 正在启动调试器 (debug_run.py)...
echo --------------------------------------------------------
python debug_run.py

:: 5. 退出处理
if %ERRORLEVEL% NEQ 0 goto :error
goto :success

:venv_error
echo.
echo [错误] 未找到虚拟环境，请检查 ..\.venv 是否存在。
goto :end

:error
echo.
echo [错误] 调试器异常退出，错误代码: %ERRORLEVEL%
echo [提示] 请将上方的错误信息复制给 Agent 进行分析。
goto :end

:success
echo.
echo [成功] 调试会话结束。

:end
pause