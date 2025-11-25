@echo off
chcp 65001
echo ========================================================
echo  🎉 Angel Server Memory Initialization Tool
echo ========================================================
echo.
echo  🎨 说明:
echo     此脚本用于在【开发/构建环境】下初始化服务器记忆库。
echo     它会扫描 Web_compute_low 目录，生成应用列表，并更新到 Memorybank。
echo     同时会自动注入 .env 中的 API Key 到 admin 账号。
echo.
echo  ⚠️ 注意:
echo     请确保当前环境可以访问 Web_compute_low 目录。
echo     此操作是增量更新，不会删除现有的用户数据。
echo.
echo ========================================================
echo.

:: 检查 Python 环境
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到 Python 环境，请先安装 Python。
    pause
    exit /b
)

:: 执行初始化脚本
echo 🚀 正在执行初始化脚本...
python Debug\memory_init.py

if %errorlevel% neq 0 (
    echo.
    echo ❌ 初始化失败！请检查错误日志。
) else (
    echo.
    echo ✨ 初始化成功！
)

echo.
pause
