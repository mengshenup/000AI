@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
REM ==========================================
# 🚀 Angel Agent Server 启动器 (PowerShell 版)
# ==========================================

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.WindowTitle = "Angel Agent Server (8000)"

function Kill-Port ($port) {
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($tcp) {
        Write-Host "正在清理端口 $port..." -ForegroundColor Yellow
        $pids = $tcp.OwningProcess | Select-Object -Unique
        foreach ($id in $pids) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
    }
}

Kill-Port 8000

Write-Host "🚀 正在启动 Agent_angel_server..." -ForegroundColor Green

# 尝试激活虚拟环境
$VenvPath = Join-Path $PWD.Path "..\.venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) {
    Write-Host "🐍 正在激活虚拟环境..." -ForegroundColor Cyan
    . $VenvPath
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 严重错误：未找到 Python 环境！" -ForegroundColor Red
    Read-Host "按回车键退出..."
    exit
}

if (Test-Path 'requirements.txt') {
    Write-Host "⚡ [提示] 跳过依赖自动安装 (首次运行请手动执行 pip install -r requirements.txt)" -ForegroundColor Gray
    # pip install -r requirements.txt
} else {
    Write-Host "⚠️ 未找到 requirements.txt，可能导致运行错误。" -ForegroundColor Yellow
}

$env:PYTHONPATH = $PWD.Path
if (Test-Path 'Brain/main.py') {
    python Brain/main.py
    Write-Host "程序已退出。" -ForegroundColor Yellow
    Read-Host "按回车键退出..."
} else {
    Write-Host "❌ 错误：找不到 Brain/main.py 文件！" -ForegroundColor Red
    Read-Host "按回车键退出..."
}
