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

:: === 2. 预清理 ===
call :clean_up

:: === 3. 启动 ===
:start_loop
echo [2/2] 正在通过 Brain/main.py 启动...
echo.
echo [信息] 后端运行在: http://localhost:8000
echo [状态] 热更新已开启 (支持修改代码自动重启)
echo.

:: 打印当前 BAT 文件的 PID
for /f "usebackq tokens=*" %%i in (`powershell -command "(Get-CimInstance Win32_Process -Filter \"ProcessId = $PID\").ParentProcessId"`) do set BAT_PID=%%i
echo [DEBUG] 当前 BAT 脚本 PID: %BAT_PID%

:: 🟢 启动主程序
python Brain/main.py

:: === 4. 错误处理与自动重启 ===
if %errorlevel% neq 0 (
    color 0e
    echo.
    echo ==========================================
    echo [警告] 服务器进程已停止！
    echo ==========================================
    echo 可能原因：
    echo 1. 调试脚本 (debug_start.bat) 抢占了端口。
    echo 2. 代码报错或热更新失败。
    echo 3. 您手动停止了服务器。
    echo.
    echo [操作] 按任意键执行【强力清理】并重启...
    pause >nul
    
    color 0b
    cls
    echo [重启] 正在执行强力清理...
    call :clean_up
    goto :start_loop
)

goto :success

:: ==========================================
::  🧹 清理函数 (端口 + 僵尸浏览器)
:: ==========================================
:clean_up
echo [清理] 正在扫描端口 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    echo     - 发现占用进程 PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

echo [清理] 正在清除僵尸浏览器 (Playwright/Node)...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq data:,*" /T >nul 2>&1
taskkill /F /IM msedge.exe /FI "WINDOWTITLE eq data:,*" /T >nul 2>&1
echo [完成] 环境已净化。
exit /b 0

:error
color 0c
echo.
echo [错误] 启动失败！
goto :end

:success
echo.
echo [停止] 服务器已正常关闭。

:end
echo.
pause