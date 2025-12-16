@echo off
REM ==========================================================================
REM   文件功能 : 服务器停止脚本
REM   逻辑摘要 : 查找并强制结束占用 8000 端口的进程。
REM   易懂解释 : 关灯睡觉！
REM   未来扩展 : 支持停止多个端口 (8001, 8002)。
REM   当前状态 : 活跃 (更新: 2025-12-06)
REM   Agent_angel_server/Agent_angel_server_stop.bat 踩坑记录 :
REM     1. [2025-12-04] [已修复] [乱码]: CMD 默认编码非 UTF-8。 -> 使用 chcp 65001。
REM ==========================================================================

chcp 65001 >nul REM  设置编码为 UTF-8
echo [停止] 正在停止 Angel Agent Server (端口 8000)... REM  输出停止提示

REM  查找并清理端口占用
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do ( REM  遍历占用端口的进程
    echo [清理] PID: %%a REM  输出 PID
    tasklist /fi "pid eq %%a" REM  列出进程详情
    taskkill /f /pid %%a >nul 2>&1 REM  强制终止进程
)
echo [完成] 已停止。 REM  输出完成提示