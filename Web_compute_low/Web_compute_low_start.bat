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
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($tcp) {
        Write-Host "正在清理端口 $port..." -ForegroundColor Yellow
        $pids = $tcp.OwningProcess | Select-Object -Unique
        foreach ($id in $pids) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
    }
}

Kill-Port 5500

Write-Host "🚀 正在启动 Web_compute_low..." -ForegroundColor Green

# 尝试使用 Cargo 启动
if (Get-Command cargo -ErrorAction SilentlyContinue) {
    try {
        Write-Host "尝试使用 Cargo 运行..." -ForegroundColor Cyan
        # 检查 Cargo.toml 是否存在
        if (Test-Path "Cargo.toml") {
             cargo run --bin simple_server
             # 如果 cargo run 正常退出（通常不会，除非出错），暂停
             Write-Host "Cargo 运行结束。" -ForegroundColor Yellow
             Read-Host "按回车键退出..."
             exit
        } else {
            Write-Host "⚠️ [提示] 未找到 Cargo.toml，跳过 Rust 模式。" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Cargo 运行失败。" -ForegroundColor Red
    }
}

# 降级使用 Python 启动
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "⚠️ 降级使用 Python HTTP Server..." -ForegroundColor Cyan
    python -m http.server 5500
    Write-Host "Python Server 已停止。" -ForegroundColor Yellow
    Read-Host "按回车键退出..."
} else {
    Write-Host "❌ 严重错误：未找到 Python 环境，无法启动服务器！" -ForegroundColor Red
    Write-Host "请安装 Python 或 Rust (Cargo)。"
    Read-Host "按回车键退出..."
}
