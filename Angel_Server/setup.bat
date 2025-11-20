@echo off
cd /d "%~dp0"

:: === ANGEL SETUP UTILITY (Compatibility Mode) ===

echo [DEBUG] 1. Script Started.
echo [DEBUG] Auto-installing components...
echo.

:: 1. Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python NOT found!
    echo Please install Python from python.org.
    pause
    exit
)
echo [OK] Python found.
echo.

:: 2. Upgrade PIP
echo [DEBUG] 2. Upgrading PIP (Installer)...
python -m pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple
echo [INFO] PIP upgrade attempt finished.
echo.

:: 3. Install Libraries
echo [DEBUG] 3. Installing AI Libraries...
echo [INFO] Using Tsinghua Mirror...
pip install --user fastapi uvicorn playwright -i https://pypi.tuna.tsinghua.edu.cn/simple

if errorlevel 1 (
    echo.
    echo [ERROR] Install failed. Check internet.
    pause
    exit
)
echo [OK] Libraries installed.
echo.

:: 4. Install Browsers
echo [DEBUG] 4. Installing Browsers...
echo [INFO] Using NPM Mirror...
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/

echo [ACTION] Downloading Chromium...
playwright install chromium

echo.
echo ==========================================
echo [SUCCESS] Setup Finished!
echo Everything is ready.
echo ==========================================
echo.
echo Press any key to exit...
pause