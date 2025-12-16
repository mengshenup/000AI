@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
REM ==========================================
# 🚀 Agent_angel_server 启动器 (WSL2 + Patchright)
# 端口: 8000 (Rust Core), 8001 (Python Worker)
# 环境: WSL2 + Rust + Python + Patchright
# ==========================================

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.WindowTitle = "Agent_angel_server (Ports 8000, 8001)"

# 错误日志路径
$errorLogPath = $env:ERROR_LOG_PATH
if (-not $errorLogPath) {
    $errorLogPath = "..\logs\Agent_angel_server.log"
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
        Write-Host " �  Agent_angel_server 启动中" -ForegroundColor Cyan
    } else {
        Write-Host " 🔄 Agent_angel_server 重启中 (第 $restartCount 次)" -ForegroundColor Cyan
    }
    Write-Host " 🦀 Rust Core (Port 8000)" -ForegroundColor Cyan
    Write-Host " 🐍 Python Worker (Port 8001)" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-Log "Agent_angel_server 启动脚本开始执行"
    Write-Host "📂 工作目录: $wslPath" -ForegroundColor DarkGray

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

    # 3. 检查 Python
    $pythonCheck = wsl bash -c "cd '$wslPath' && which python3 2>/dev/null"
    if (-not $pythonCheck) {
        Write-Log "Python3 未安装" $true
        Write-Host "❌ 错误: Python3 未安装" -ForegroundColor Red
        Read-Host "`n按回车键重试..."
        $restartCount++
        continue
    }
    Write-Host "✅ Python3 已就绪" -ForegroundColor Green

    # 4. 清理端口和 WSL 进程 (唯一的清理逻辑)
    Write-Host "`n🧹 清理端口..." -ForegroundColor Cyan
    
    # 清理端口 8000
    $tcp8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($tcp8000) {
        $pids = $tcp8000.OwningProcess | Select-Object -Unique
        foreach ($id in $pids) {
            Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
            Write-Host "  🧹 已终止 Windows 进程 (PID: $id, 端口 8000)" -ForegroundColor DarkGray
        }
    }
    
    # 清理端口 8001
    $tcp8001 = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
    if ($tcp8001) {
        $pids = $tcp8001.OwningProcess | Select-Object -Unique
        foreach ($id in $pids) {
            Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
            Write-Host "  🧹 已终止 Windows 进程 (PID: $id, 端口 8001)" -ForegroundColor DarkGray
        }
    }
    
    # 清理 WSL 内部进程
    wsl bash -c "pkill -f 'python3.*Main.py' 2>/dev/null; pkill -f 'uvicorn' 2>/dev/null" 2>$null
    wsl bash -c "pkill -f 'agent_angel_server' 2>/dev/null" 2>$null
    Write-Host "  ✅ 端口 8000, 8001 已清理" -ForegroundColor Green

    # 5. 启动 Python Worker (独立窗口)
    Write-Host "`n🐍 正在启动 Python Worker (Port 8001)..." -ForegroundColor Green
    Write-Host "💡 提示: Python Worker 将在独立窗口运行" -ForegroundColor DarkGray
    Start-Process -FilePath "start_python_worker.bat" -WindowStyle Normal

    # 等待 Python Worker 启动
    Write-Host "⏳ 等待 Python Worker 启动..." -ForegroundColor Yellow
    $pythonRunning = $false
    $maxWait = 15
    $waited = 0

    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2
        
        $tcp = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
        if ($tcp) {
            $pythonRunning = $true
            break
        }
        
        $wslCheck = wsl bash -c "ss -tuln 2>/dev/null | grep ':8001 '" 2>$null
        if ($wslCheck) {
            $pythonRunning = $true
            break
        }
        
        Write-Host "  ⏳ 已等待 $waited 秒..." -ForegroundColor DarkGray
    }

    if ($pythonRunning) {
        Write-Host "✅ Python Worker 已启动" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 警告: Python Worker 可能未成功启动" -ForegroundColor Yellow
    }

    # 6. 启动 Rust Core
    Write-Host "`n🦀 正在启动 Rust Core (Port 8000)..." -ForegroundColor Green
    Write-Host "💡 提示: 首次启动需要编译依赖，可能需要几分钟" -ForegroundColor DarkGray
    Write-Host "💡 提示: 按 Ctrl+C 停止服务`n" -ForegroundColor DarkGray

    Write-Log "开始启动 Rust Core"

    try {
        Write-Host "🚀 启动 Rust Core..." -ForegroundColor Green
        
        $output = wsl bash -c "cd '$wslPath' && ~/.cargo/bin/cargo run --bin agent_angel_server 2>&1"
        
        if ($output) {
            Add-Content -Path $errorLogPath -Value "`n=== Rust Core 输出 ===" -ErrorAction SilentlyContinue
            Add-Content -Path $errorLogPath -Value $output -ErrorAction SilentlyContinue
            Write-Host $output
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Rust Core 异常退出 (退出码: $LASTEXITCODE)" $true
            Write-Host "`n⚠️ Rust Core 异常退出 (退出码: $LASTEXITCODE)" -ForegroundColor Yellow
        } else {
            Write-Log "Rust Core 已正常停止"
            Write-Host "`n✅ Rust Core 已正常停止" -ForegroundColor Green
        }
    } catch {
        Write-Log "Rust Core 崩溃: $_" $true
        Write-Host "`n❌ Rust Core 崩溃: $_" -ForegroundColor Red
    }
    
    # 🔄 重启提示
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "💡 提示: Python Worker 仍在后台运行" -ForegroundColor Yellow
    Write-Host "💡 错误日志: $errorLogPath" -ForegroundColor DarkGray
    Write-Host "`n🔄 按回车键重新启动，按 Q 退出..." -ForegroundColor Yellow
    
    $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    if ($key.Character -eq 'q' -or $key.Character -eq 'Q') {
        Write-Host "`n👋 再见！请手动关闭 Python Worker 窗口" -ForegroundColor Cyan
        break
    }
    
    $restartCount++
}
