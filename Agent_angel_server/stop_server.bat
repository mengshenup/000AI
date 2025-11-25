@echo off
:: =================================
::  🎉 停止服务器脚本 (无参数)
::
::  🎨 代码用途：
::     查找并强制结束占用 8000 端口的进程，从而停止 Angel Agent Server。
::
::  💡 易懂解释：
::     睡觉时间到！🌙 关灯（停止服务），让 Angel 休息一下。
:: =================================

chcp 65001 >nul
echo [停止] 正在停止 Angel Agent Server (端口 8000)...
:: 🔍 查找并清理端口占用
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do (
    echo [清理] PID: %%a
    tasklist /fi "pid eq %%a"
    :: 🔪 强制结束进程
    taskkill /f /pid %%a >nul 2>&1
)
echo [完成] 已停止。
