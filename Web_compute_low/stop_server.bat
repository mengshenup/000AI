@echo off
chcp 65001 >nul
echo [停止] 正在停止 Angel Web Low (端口 5500)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5500"') do (
    echo [清理] PID: %%a
    tasklist /fi "pid eq %%a"
    taskkill /f /pid %%a >nul 2>&1
)
echo [完成] 已停止。
