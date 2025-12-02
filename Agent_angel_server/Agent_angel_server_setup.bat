@echo off
:: =================================
::  🎉 环境安装脚本 (无参数)
::
::  🎨 代码用途：
::     直接调用指定的 Python 3.14 安装 requirements.txt 中的依赖包。
::
::  💡 易懂解释：
::     给 Angel 买新衣服！👗 看看清单上缺什么（依赖包），统统买回来穿上！
:: =================================

:: 📂 切换到当前目录
cd /d "%~dp0"
echo [信息] Agent_angel_server: 正在准备安装...

:: 2. ✨ 设置你的 Python 3.14 绝对路径
:: (就是这个路径，我们用变量 PYTHON_EXE 存起来)
set "PYTHON_EXE=C:\Users\Administrator\AppData\Local\Python\pythoncore-3.14-64\python.exe"

:: -------------------------------------------------------------
:: 📦 步骤1: 安装依赖
:: (这里我们召唤 PowerShell 姐姐来执行 pip，防止 CMD 老爷爷记性不好截断路径)
:: -------------------------------------------------------------
echo [信息] 正在调用 PowerShell 安装依赖库...
powershell -Command "& '%PYTHON_EXE%' -m pip install -r requirements.txt"

echo [信息] 库安装已完成。

:: -------------------------------------------------------------
:: 4. 🎭 步骤2: Playwright 浏览器安装
:: (同样召唤 PowerShell 姐姐来下载浏览器内核)
:: -------------------------------------------------------------
echo.
echo 第2步: 正在安装 Playwright 浏览器……
powershell -Command "& '%PYTHON_EXE%' -m playwright install"

echo.
echo [信息] 100%% 全部安装已完成。
pause