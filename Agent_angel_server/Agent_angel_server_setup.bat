@echo off
:: =================================
::  🎉 环境安装脚本 (无参数)
::
::  🎨 代码用途：
::     激活虚拟环境并安装 requirements.txt 中列出的 Python 依赖包。
::
::  💡 易懂解释：
::     给 Angel 买新衣服！👗 看看清单上缺什么（依赖包），统统买回来穿上！
:: =================================

:: 📂 切换到当前目录
cd /d "%~dp0"
echo [INFO] Agent_angel_server: Installing dependencies...

:: 🐍 激活虚拟环境
if exist "..\.venv\Scripts\activate.bat" call "..\.venv\Scripts\activate.bat"

:: 📦 安装依赖
pip install -r requirements.txt
echo [INFO] Installation complete.
pause
