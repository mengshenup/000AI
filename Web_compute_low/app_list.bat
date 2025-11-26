@echo off
chcp 65001
echo ========================================================
echo  🚚 Angel App Sync Tool (Client Side)
echo ========================================================
echo.
echo  🎨 说明:
echo     此脚本用于将本地 (Web_compute_low) 的应用列表
echo     推送到远程服务器 (Web_compute_high)。
echo     适用于分布式部署环境。
echo.
echo ========================================================
echo.

:: 检查环境并执行

:: 1. 优先尝试 Rust 版本 (高性能)
where cargo >nul 2>&1
if %errorlevel% equ 0 (
    echo 🦀 检测到 Rust (Cargo)，使用 Rust 版本...
    cargo run --bin apps_list --release
    goto :End
)

:: 2. 尝试 Node.js 版本
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo 🟢 检测到 Node.js，使用 JS 版本...
    node Ops\app_sync.js
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        echo 🔵 未检测到 Node.js，使用 Python 版本...
        python Ops\app_sync.py
:End
echo.
pause
