@echo off
:: =================================
::  🎉 停止服务器脚本 (无参数)
::
::  🎨 代码用途：
::     查找并强制结束占用 9000 端口的进程，从而停止 Angel Web High Server。
::
::  💡 易懂解释：
::     管家下班啦！🌙 关灯（停止服务），回家休息。
:: =================================

chcp 65001 >nul
echo [停止] 正在停止 Angel Web High (端口 9000)...
:: 🔍 查找并清理端口占用
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":9000"') do (
    echo [清理] PID: %%a
    tasklist /fi "pid eq %%a"
    :: 🔪 强制结束进程
    taskkill /f /pid %%a >nul 2>&1
)
echo [完成] 已停止。
