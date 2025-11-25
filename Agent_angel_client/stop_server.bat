@echo off
cd /d "%~dp0"
chcp 65001 >nul
title Stop Angel Server
color 0c

echo ==========================================
echo      🛑 停止 Angel 服务器 (强制清理)
echo ==========================================
echo.

echo [1/2] 正在终止所有 Python 进程...
taskkill /F /IM python.exe /T

echo [2/2] 正在清理可能残留的浏览器进程...
:: 尝试关闭无头浏览器进程 (匹配常见的自动化特征)
taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq data:,*" /T >nul 2>&1
taskkill /F /IM msedge.exe /FI "WINDOWTITLE eq data:,*" /T >nul 2>&1
:: 补充：尝试清理可能残留的 Playwright 进程
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo ✅ 服务器已停止，相关进程已清理。
echo.
pause
