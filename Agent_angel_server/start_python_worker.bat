@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
REM ==========================================
# 🐍 Python Worker 启动器
# 端口: 8001
# 环境: WSL2 + Python + Patchright
# ==========================================

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.WindowTitle = "Python Worker (Port 8001)"

# 错误日志路径
$errorLogPath = "..\logs\Python_Worker.log"

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

# 获取 WSL 路径
$currentDir = Get-Location
$drive = $currentDir.Drive.Name.ToLower()
$path = $currentDir.Path.Replace("$($currentDir.Drive.Name):\", "").Replace("\", "/")
$wslPath = "/mnt/$drive/$path"

# 🔄 主循环 (回车重启)
$restartCount = 0

while ($true) {
    # 清空旧日志 (每次重启都清空)
    if (Test-Path $errorLogPath) {
        Remove-Item $errorLogPath -Force -ErrorAction SilentlyContinue
    }

    Write-Host "`n========================================" -ForegroundColor Cyan
    if ($restartCount -eq 0) {
        Write-Host " 🐍 Python Worker 启动中" -ForegroundColor Cyan
    } else {
        Write-Host " 🔄 Python Worker 重启中 (第 $restartCount 次)" -ForegroundColor Cyan
    }
    Write-Host " 📦 AI 处理服务 (Port 8001)" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-Log "Python Worker 启动脚本开始执行"
    Write-Host "📂 工作目录: $wslPath" -ForegroundColor DarkGray

    # 1. 清理端口和 WSL 进程 (唯一的清理逻辑)
    Write-Host "`n🧹 清理端口 8001..." -ForegroundColor Cyan
    $tcp = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
    if ($tcp) {
        $pids = $tcp.OwningProcess | Select-Object -Unique
        foreach ($id in $pids) {
            Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
            Write-Host "  🧹 已终止 Windows 进程 (PID: $id)" -ForegroundColor DarkGray
        }
    }
    wsl bash -c "pkill -f 'python3.*Main.py' 2>/dev/null; pkill -f 'uvicorn' 2>/dev/null" 2>$null
    Write-Host "  ✅ 端口 8001 已清理" -ForegroundColor Green

    # 2. 启动服务
    Write-Host "`n💡 提示: 按 Ctrl+C 停止服务`n" -ForegroundColor DarkGray

    try {
        Write-Host "🚀 启动 Python Worker..." -ForegroundColor Green
        
        $output = wsl bash -c "cd '$wslPath' && python3 Brain/Main.py 2>&1"
        
        if ($output) {
            Add-Content -Path $errorLogPath -Value "`n=== Python 输出 ===" -ErrorAction SilentlyContinue
            Add-Content -Path $errorLogPath -Value $output -ErrorAction SilentlyContinue
            Write-Host $output
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Python Worker 异常退出 (退出码: $LASTEXITCODE)" $true
            Write-Host "`n⚠️ Python Worker 异常退出 (退出码: $LASTEXITCODE)" -ForegroundColor Yellow
        } else {
            Write-Log "Python Worker 已正常停止"
            Write-Host "`n✅ Python Worker 已正常停止" -ForegroundColor Green
        }
    } catch {
        Write-Log "Python Worker 崩溃: $_" $true
        Write-Host "`n❌ Python Worker 崩溃: $_" -ForegroundColor Red
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
