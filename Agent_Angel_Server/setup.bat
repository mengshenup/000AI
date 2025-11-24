@echo off
cd /d "%~dp0"
chcp 65001 >nul
title Angel 环境安装向导
color 0b

:: 🔧 优化控制台体验
powershell -Command "&{$c=[Console];$m=$c::In.GetMode();$m=$m -band -not 0x0040;$c::In.SetMode($m);$r=$c::BufferHeight;if($r -lt 3000){$c::BufferHeight=3000}}" >nul 2>&1

echo ==========================================
echo      Angel 环境安装向导 (Windows Server 适配版)
echo ==========================================
echo.

:: 1. 检查 Python
echo [1/4] 正在检查 Python 环境...
python --version >nul 2>&1
if errorlevel 1 goto :python_missing
echo [成功] 检测到 Python。
echo.

:: 2. 激活/创建虚拟环境
echo [2/4] 正在配置虚拟环境...
if not exist "..\.venv" (
    echo [信息] 正在创建新的虚拟环境...
    python -m venv ..\.venv
)
call "..\.venv\Scripts\activate.bat"
if errorlevel 1 goto :venv_error
echo [成功] 虚拟环境已激活。
echo.

:: 3. 升级 PIP 并安装依赖
echo [3/4] 正在安装依赖库 (使用清华镜像)...
python -m pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
if errorlevel 1 goto :install_error
echo [成功] 依赖库安装完毕。
echo.

:: 4. 安装浏览器驱动
echo [4/4] 正在安装浏览器驱动...
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
echo [信息] 正在下载 Chromium...
playwright install chromium
if errorlevel 1 goto :browser_error

goto :success

:python_missing
color 0c
echo.
echo [错误] 未找到 Python！
echo 请访问 python.org 下载并安装 Python。
pause
exit /b 1

:venv_error
color 0c
echo.
echo [错误] 虚拟环境激活失败！
pause
exit /b 1

:install_error
color 0c
echo.
echo [错误] 依赖安装失败！请检查网络连接。
pause
exit /b 1

:browser_error
color 0c
echo.
echo [错误] 浏览器驱动安装失败！
pause
exit /b 1

:success
color 0a
echo.
echo ==========================================
echo      🎉 安装全部完成！
echo ==========================================
echo 现在您可以运行 start_server.bat 启动服务器了。
pause

echo.
echo ==========================================
echo [SUCCESS] Setup Finished!
echo Everything is ready.
echo ==========================================
echo.
echo Press any key to exit...
pause