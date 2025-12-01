@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
REM ==========================================
# 🚀 Angel 系统总启动器 (模块化版)
# ==========================================

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.WindowTitle = "Angel System Launcher"
$root = $PWD.Path

Write-Host "🚀 正在启动模块化服务..." -ForegroundColor Cyan

# --- 1. 启动 Web_compute_low ---
$lowScript = Join-Path $root "Web_compute_low\Web_compute_low_start.bat"
if (Test-Path $lowScript) {
    Write-Host "正在启动 Web_compute_low..." -ForegroundColor Green
    # 移除 -WindowStyle Minimized 以保持窗口可见
    Start-Process $lowScript
} else {
    Write-Host "❌ 缺失文件: $lowScript" -ForegroundColor Red
}

# --- 2. 启动 Web_compute_high ---
$highScript = Join-Path $root "Web_compute_high\Web_compute_high_start.bat"
if (Test-Path $highScript) {
    Write-Host "正在启动 Web_compute_high..." -ForegroundColor Green
    Start-Process $highScript
} else {
    Write-Host "❌ 缺失文件: $highScript" -ForegroundColor Red
}

# --- 3. 启动 Agent_angel_server ---
$agentScript = Join-Path $root "Agent_angel_server\Agent_angel_server_start.bat"
if (Test-Path $agentScript) {
    Write-Host "正在启动 Agent_angel_server..." -ForegroundColor Green
    Start-Process $agentScript
} else {
    Write-Host "❌ 缺失文件: $agentScript" -ForegroundColor Red
}

# --- 4. 打开浏览器 ---
Write-Host "`n🌐 等待服务预热..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# --- 5. 检查服务状态 ---
Write-Host "`n🔍 正在检查服务状态..." -ForegroundColor Cyan

function Check-Service ($port, $name) {
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($tcp) {
        Write-Host "✅ [成功] $name 已启动 (端口 $port)" -ForegroundColor Green
    } else {
        Write-Host "❌ [失败] $name 未启动 (端口 $port) - 请检查对应窗口报错" -ForegroundColor Red
    }
}

Check-Service 5500 "Web_compute_low"
Check-Service 9000 "Web_compute_high"
Check-Service 8000 "Agent_angel_server"

Write-Host "`n✅ 正在打开浏览器: http://localhost:5500" -ForegroundColor Green
Start-Process "http://localhost:5500"

Write-Host "`n🎉 启动流程结束！" -ForegroundColor Magenta
Write-Host "按任意键退出启动器..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

