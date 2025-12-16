@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
REM ==========================================
# 🚀 Web_compute_high 启动器 (高性能计算服务器)
# 端口: 9000
# 环境: WSL2 + Rust + Axum + RocksDB
# ==========================================

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.WindowTitle = "Web_compute_high (Port 9000)"

# 错误日志路径
$errorLogPath = $env:ERROR_LOG_PATH
if (-not $errorLogPath) {
    $errorLogPath = ".\logs\Web_compute_high.log"
}

# 确保日志目录存在
$logDir = Split-Path $errorLogPath -Parent
if ($logDir -and -not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# 记录日志函数
function Write-Log ($message, $isError = $false) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $prefix = if ($isError) { "ERROR:" } else { "INFO:" }
    $logMessage = "[$timestamp] $prefix $message"
    Add-Content -Path $errorLogPath -Value $logMessage -ErrorAction SilentlyContinue
    Write-Host $message -ForegroundColor $(if($isError){'Red'}else{'White'})
}

# 转换 Windows 路径为 WSL 路径
$currentPath = (Get-Location).Path
$drive = $currentPath.Substring(0,1).ToLower()
$wslPath = "/mnt/$drive" + $currentPath.Substring(2).Replace("\", "/")

# 🔄 主循环 (回车重启)
$restartCount = 0

while ($true) {
    # 清空旧日志 (每次重启都清空)
    if (Test-Path $errorLogPath) {
        Remove-Item $errorLogPath -Force -ErrorAction SilentlyContinue
    }

    Write-Host "`n========================================" -ForegroundColor Cyan
    if ($restartCount -eq 0) {
        Write-Host " 🚀 Web_compute_high 启动中" -ForegroundColor Cyan
    } else {
        Write-Host " 🔄 Web_compute_high 重启中 (第 $restartCount 次)" -ForegroundColor Cyan
    }
    Write-Host " ⚡ 高性能计算服务器 (Port 9000)" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-Log "Web_compute_high 启动脚本开始执行"

    # 1. 检测 WSL2
    if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
        Write-Log "未检测到 WSL2" $true
        Write-Host "❌ 错误: 未检测到 WSL2" -ForegroundColor Red
        Read-Host "`n按回车键重试..."
        $restartCount++
        continue
    }
    Write-Host "✅ WSL2 已就绪" -ForegroundColor Green

    # 2. 检查 Cargo
    $cargoCheck = wsl bash -c "test -f ~/.cargo/bin/cargo && echo 'exists' || echo 'not found'"
    if ($cargoCheck -notlike "*exists*") {
        Write-Log "Cargo 未安装" $true
        Write-Host "❌ 错误: Cargo 未安装" -ForegroundColor Red
        Read-Host "`n按回车键重试..."
        $restartCount++
        continue
    }
    Write-Host "✅ Cargo 已就绪" -ForegroundColor Green

    # 3. 检查项目目录
    if (-not (Test-Path "Web_compute_high\Cargo.toml")) {
        Write-Log "找不到 Web_compute_high 项目目录" $true
        Write-Host "❌ 错误: 找不到 Web_compute_high 项目" -ForegroundColor Red
        Read-Host "`n按回车键重试..."
        $restartCount++
        continue
    }
    Write-Host "✅ 项目目录已找到" -ForegroundColor Green

    # 4. 清理端口和 WSL 进程 (唯一的清理逻辑)
    Write-Host "`n🧹 清理端口 9000..." -ForegroundColor Cyan
    $tcp = Get-NetTCPConnection -LocalPort 9000 -ErrorAction SilentlyContinue
    if ($tcp) {
        $pids = $tcp.OwningProcess | Select-Object -Unique
        foreach ($id in $pids) {
            Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
            Write-Host "  🧹 已终止 Windows 进程 (PID: $id)" -ForegroundColor DarkGray
        }
    }
    wsl bash -c "pkill -f 'web_compute_high' 2>/dev/null" 2>$null
    Write-Host "  ✅ 端口 9000 已清理" -ForegroundColor Green

    # 5. 启动服务
    Write-Host "`n🔨 正在编译和启动服务..." -ForegroundColor Yellow
    Write-Host "💡 提示: 首次启动需要编译依赖 (包括 RocksDB)，可能需要 5-10 分钟" -ForegroundColor DarkGray
    Write-Host "💡 提示: 按 Ctrl+C 停止服务`n" -ForegroundColor DarkGray

    Write-Log "WSL 路径: $wslPath/Web_compute_high"

    try {
        Write-Host "🚀 启动服务..." -ForegroundColor Green
        
        $output = wsl bash -c "cd '$wslPath/Web_compute_high' && ~/.cargo/bin/cargo run --bin web_compute_high_server 2>&1"
        
        if ($output) {
            Add-Content -Path $errorLogPath -Value "`n=== Cargo 输出 ===" -ErrorAction SilentlyContinue
            Add-Content -Path $errorLogPath -Value $output -ErrorAction SilentlyContinue
            Write-Host $output
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "服务异常退出 (退出码: $LASTEXITCODE)" $true
            Write-Host "`n⚠️ 服务异常退出 (退出码: $LASTEXITCODE)" -ForegroundColor Yellow
        } else {
            Write-Log "服务已正常停止"
            Write-Host "`n✅ 服务已正常停止" -ForegroundColor Green
        }
    } catch {
        Write-Log "服务崩溃: $_" $true
        Write-Host "`n❌ 服务崩溃: $_" -ForegroundColor Red
    }
    
    # 🔄 重启提示
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "💡 错误日志: $errorLogPath" -ForegroundColor DarkGray
    Write-Host "`n🔄 按回车键重新启动，按 Q 退出..." -ForegroundColor Yellow
    
    $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    if ($key.Character -eq 'q' -or $key.Character -eq 'Q') {
        Write-Host "`n👋 再见！" -ForegroundColor Cyan
        break
    }
    
    $restartCount++
}
