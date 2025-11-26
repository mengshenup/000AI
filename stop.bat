@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Angel System Stopper
color 0c

:Start
cls
echo ========================================================
echo  🛑 Angel System Stopper
echo ========================================================
echo.
echo [信息] 正在停止 Angel 系统...

echo [1/3] 正在停止 Web_compute_low (端口 5500)...
call Web_compute_low\Web_compute_low_stop.bat

echo [2/3] 正在停止 Web_compute_high (端口 9000)...
call Web_compute_high\Web_compute_high_stop.bat

echo [3/3] 正在停止 Agent_angel_server (端口 8000)...
call Agent_angel_server\Agent_angel_server_stop.bat

echo.
echo [完成] 所有服务已停止。
echo.
echo [提示] 按回车键可以重新执行停止操作 (强制清理)...
pause
goto :Start
