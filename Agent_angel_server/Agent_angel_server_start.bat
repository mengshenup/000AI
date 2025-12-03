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
    Write-Host "🔍 正在检查端口 $port..." -ForegroundColor Cyan
    $maxRetries = 5
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if (-not $tcp) {
            Write-Host "✅ 端口 $port 空闲。" -ForegroundColor Green
            return
        }

        Write-Host "⚠️ [清理] 端口 $port 被占用 (尝试 $($retryCount + 1)/$maxRetries)..." -ForegroundColor Yellow
        $pids = $tcp.OwningProcess | Select-Object -Unique
        foreach ($id in $pids) { 
            try {
                Stop-Process -Id $id -Force -ErrorAction Stop
                Write-Host "   - 已终止进程 PID: $id" -ForegroundColor DarkGray
            } catch {
                Write-Host "   - 无法终止 PID $id : $_" -ForegroundColor Red
            }
        }
        
        Start-Sleep -Seconds 1
        $retryCount++
    }
    
    Write-Host "❌ 警告: 无法完全清理端口 $port，启动可能会失败。" -ForegroundColor Red
}

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
} else {
    Write-Host "⚠️ 未找到 requirements.txt，可能导致运行错误。" -ForegroundColor Yellow
}

$env:PYTHONPATH = $PWD.Path

while ($true) {
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host "🚀 正在启动 Agent_angel_server..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Magenta

    Kill-Port 8000

    if (Test-Path 'Brain/run.py') {
        python Brain/run.py
    } elseif (Test-Path 'Brain/main.py') {
        Write-Host "⚠️ 未找到 Brain/run.py，降级使用 Brain/main.py" -ForegroundColor Yellow
        python Brain/main.py
    } else {
        Write-Host "❌ 错误：找不到启动文件！" -ForegroundColor Red
    }

    Write-Host "`n🛑 服务器已停止。" -ForegroundColor Yellow
    Write-Host "👉 按回车键重启服务器 (或直接关闭窗口)..." -ForegroundColor Cyan
    Read-Host
}
