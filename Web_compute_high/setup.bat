@echo off
cd /d "%~dp0"
echo [INFO] Web_compute_high: Installing dependencies...

if exist "..\.venv\Scripts\activate.bat" call "..\.venv\Scripts\activate.bat"

pip install -r requirements.txt
echo [INFO] Installation complete.
pause
