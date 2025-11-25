@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Angel System Stopper
color 0c

echo [信息] 正在停止 Angel 系统...

echo [1/3] 正在停止 Web_compute_low (端口 5500)...
call Web_compute_low\stop_server.bat

echo [2/3] 正在停止 Web_compute_high (端口 9000)...
call Web_compute_high\stop_server.bat

echo [3/3] 正在停止 Agent_angel_server (端口 8000)...
call Agent_angel_server\stop_server.bat

echo.
echo [完成] 所有服务已停止。
pause
