@echo off
REM ---------------------------------------------------
REM 服务器专用启动脚本 - 终极完美版
REM ---------------------------------------------------

cd /d "%~dp0"
REM 切换到 UTF-8 编码
chcp 65001 >nul

REM ==========================================
REM 1. 【防中断】直接通过注册表禁用快速编辑模式
REM ==========================================
REM 这一行非常稳，完全绕过 PowerShell 语法报错的坑
reg add HKEY_CURRENT_USER\Console /v QuickEdit /t REG_DWORD /d 0 /f >nul

REM ==========================================
REM 2. 【生成启动器】解决乱码的关键
REM ==========================================
REM 我们把 PowerShell 逻辑写入临时文件
REM 注意：这里写入的是 UTF-8 格式的文本

echo $host.UI.RawUI.WindowTitle = 'Sing-box Server - Protected Mode'; > launch.ps1
echo [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; >> launch.ps1
echo Write-Host '=========================================' -ForegroundColor Green; >> launch.ps1
echo Write-Host ' Server is starting... 🚀 ' -ForegroundColor Cyan; >> launch.ps1
echo Write-Host ' [提示] 防中断模式已激活 (点击窗口不卡死)' -ForegroundColor Yellow; >> launch.ps1
echo Write-Host ' [提示] 中文乱码已修复 (强制 UTF-8 读取)' -ForegroundColor Yellow; >> launch.ps1
echo Write-Host '=========================================' -ForegroundColor Green; >> launch.ps1
echo try { ./sing-box.exe run -c config.json } catch { Write-Error $_ } >> launch.ps1

REM ==========================================
REM 3. 【执行】强制用 UTF-8 格式读取并运行
REM ==========================================
REM 下面这行是核心：Get-Content ... -Encoding UTF8
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content launch.ps1 -Encoding UTF8 | Invoke-Expression"

REM 清理现场
del launch.ps1

REM 暂停
pause