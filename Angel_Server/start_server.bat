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
:: 🔧 优化控制台体验 (防挂起/防乱码)
powershell -Command "&{$c=[Console];$m=$c::In.GetMode();$m=$m -band -not 0x0040;$c::In.SetMode($m);$r=$c::BufferHeight;if($r -lt 3000){$c::BufferHeight=3000}}" >nul 2>&1
set PYTHONIOENCODING=utf-8

:: === 2. 清理进程 ===
echo [1/2] 正在清理旧进程 (端口 8000)...
:: 智能清理：只杀占用 8000 端口的进程，而不是杀掉所有 python.exe
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    for /f "tokens=1" %%b in ('tasklist /nh /fi "pid eq %%a"') do (
        echo [清理] 发现旧进程 PID: %%a    %%b
    )
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: === 3. 启动 ===
:start_loop
echo [2/2] 正在通过 run.py 启动...
echo.
echo [信息] 后端运行在: http://localhost:8000
echo [状态] 热更新已开启 (支持修改代码自动重启)
echo.

:: 打印当前 BAT 文件的 PID (通过 PowerShell 获取父进程 ID)
for /f "usebackq tokens=*" %%i in (`powershell -command "(Get-CimInstance Win32_Process -Filter \"ProcessId = $PID\").ParentProcessId"`) do set BAT_PID=%%i
echo [DEBUG] 当前 BAT 脚本 (start_server.bat) 的 PID: %BAT_PID%

:: 🟢 注意：这里改为运行 run.py
python run.py

:: === 4. 错误处理与自动重启 ===
:: 如果是用户按 Ctrl+C (退出码通常非0)，或者被 debug 脚本杀掉 (退出码 1)
if %errorlevel% neq 0 (
    color 0e
    echo.
    echo ==========================================
    echo [警告] 服务器进程已停止！
    echo ==========================================
    echo 可能原因：
    echo 1. 您启动了调试模式 (debug_start.bat) 抢占了端口。
    echo 2. 程序发生崩溃或网络中断。
    echo 3. 您手动停止了服务器。
    echo.
    echo [操作] 按任意键重新启动服务器...
    pause >nul
    
    :: 重置颜色并清理端口，准备重启
    color 0b
    cls
    echo [重启] 正在重新初始化...
    :: 再次清理端口，防止残留
    for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
        for /f "tokens=1" %%b in ('tasklist /nh /fi "pid eq %%a"') do (
            echo [清理] 发现旧进程 PID: %%a    %%b
        )
        taskkill /f /pid %%a >nul 2>&1
    )
    goto :start_loop
)

goto :success

:error
color 0c
echo.
echo [错误] 启动失败！
echo 请检查 run.py 是否存在。
goto :end

:success
echo.
echo [停止] 服务器已正常关闭。
echo [STOP] 服务器已关闭。

:end
echo.
pause