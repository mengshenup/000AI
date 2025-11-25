@echo off
chcp 65001 >nul
echo [停止] 正在停止 Angel Web High (端口 9000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":9000"') do (
    echo [清理] PID: %%a
    tasklist /fi "pid eq %%a"
    taskkill /f /pid %%a >nul 2>&1
)
echo [完成] 已停止。
