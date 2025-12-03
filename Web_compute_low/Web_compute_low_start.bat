@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
REM ==========================================
# 🚀 Angel Web Low 启动器 (PowerShell 版)
# ==========================================

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.WindowTitle = "Angel Web Low (5500)"

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

# 尝试激活虚拟环境 (从 Agent_angel_server 借用)
$VenvPath = Join-Path $PWD.Path "..\.venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) {
    Write-Host "🐍 正在激活虚拟环境..." -ForegroundColor Cyan
    . $VenvPath
}

while ($true) {
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host "🚀 正在启动 Web_compute_low..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Magenta

    Kill-Port 5500

    # 尝试使用 Cargo 启动
    if (Get-Command cargo -ErrorAction SilentlyContinue) {
        try {
            Write-Host "尝试使用 Cargo 运行..." -ForegroundColor Cyan
            # 检查 Cargo.toml 是否存在
            if (Test-Path "Cargo.toml") {
                 cargo run --bin simple_server
            } else {
                Write-Host "⚠️ [提示] 未找到 Cargo.toml，跳过 Rust 模式。" -ForegroundColor Yellow
                # Fallback to Python inside the loop if Cargo fails/missing
                if (Get-Command python -ErrorAction SilentlyContinue) {
                    Write-Host "⚠️ 降级使用 Python HTTP Server..." -ForegroundColor Cyan
                    python -m http.server 5500
                }
            }
        } catch {
            Write-Host "❌ Cargo 运行失败。" -ForegroundColor Red
        }
    } elseif (Get-Command python -ErrorAction SilentlyContinue) {
        # Direct Python fallback if no Cargo
        Write-Host "⚠️ 降级使用 Python HTTP Server..." -ForegroundColor Cyan
        python -m http.server 5500
    } else {
        Write-Host "❌ 严重错误：未找到 Python 环境，无法启动服务器！" -ForegroundColor Red
        Write-Host "请安装 Python 或 Rust (Cargo)。"
    }

    Write-Host "`n🛑 服务器已停止。" -ForegroundColor Yellow
    Write-Host "👉 按回车键重启服务器 (或直接关闭窗口)..." -ForegroundColor Cyan
    Read-Host
}
