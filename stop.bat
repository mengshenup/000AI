@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
REM ==========================================
# 🛑 Angel 系统停止器 (强力版)
# ==========================================

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.WindowTitle = "Angel System Stopper"

Write-Host "`n========================================" -ForegroundColor Red
Write-Host " 🛑 Angel 系统停止器" -ForegroundColor Red
Write-Host "========================================`n" -ForegroundColor Red

# 1. 关闭服务窗口
Write-Host "🧹 步骤 1: 关闭服务窗口..." -ForegroundColor Yellow

$keywords = @("Web_compute_low", "Web_compute_high", "Agent_angel_server", "Rust Low", "Rust High", "Python Worker", "Port 3000", "Port 8000", "Port 9000")

Get-Process cmd, powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | ForEach-Object {
    try {
        $title = $_.MainWindowTitle
        foreach ($kw in $keywords) {
            if ($title -like "*$kw*") {
                Write-Host "  🔪 关闭: $title" -ForegroundColor DarkYellow
                $_ | Stop-Process -Force -ErrorAction SilentlyContinue
                break
            }
        }
    } catch { }
}

Start-Sleep -Seconds 1

# 2. 清理端口
Write-Host "`n🧹 步骤 2: 清理端口..." -ForegroundColor Yellow

@(3000, 8000, 8001, 9000) | ForEach-Object {
    $port = $_
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($tcp) {
        $pids = $tcp.OwningProcess | Select-Object -Unique
        foreach ($id in $pids) {
            if ($id -and $id -ne 0) {
                Write-Host "  🔪 杀死进程 $id (端口 $port)" -ForegroundColor Yellow
                Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
            }
        }
        Write-Host "  ✅ 端口 $port 已清理" -ForegroundColor Green
    } else {
        Write-Host "  ⚪ 端口 $port 未占用" -ForegroundColor DarkGray
    }
}

# 3. 清理 WSL 内部残留进程
# 🧱 [2025-12-17] 修复: stop.bat 后 Python Worker 无法启动，因为 WSL 内部进程未清理
Write-Host "`n🧹 步骤 3: 清理 WSL 内部残留进程..." -ForegroundColor Yellow

$wslAvailable = Get-Command wsl -ErrorAction SilentlyContinue
if ($wslAvailable) {
    try {
        # 杀死 Python Worker 相关进程
        wsl bash -c "pkill -f 'python3.*Main.py' 2>/dev/null" 2>$null
        wsl bash -c "pkill -f 'uvicorn' 2>/dev/null" 2>$null
        Write-Host "  ✅ Python 进程已清理" -ForegroundColor Green
        
        # 杀死所有 Rust 相关进程 (agent_angel_server, web_compute_low, web_compute_high)
        wsl bash -c "pkill -f 'agent_angel_server' 2>/dev/null" 2>$null
        wsl bash -c "pkill -f 'web_compute_low' 2>/dev/null" 2>$null
        wsl bash -c "pkill -f 'web_compute_high' 2>/dev/null" 2>$null
        wsl bash -c "pkill -f 'cargo.*run' 2>/dev/null" 2>$null
        Write-Host "  ✅ Rust 进程已清理" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️ WSL 清理失败 (可忽略)" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  ⚪ WSL 未安装，跳过" -ForegroundColor DarkGray
}

Start-Sleep -Seconds 1

# 4. 清理 RocksDB LOCK 文件
Write-Host "`n🧹 步骤 4: 清理 RocksDB LOCK 文件..." -ForegroundColor Yellow

$lockFiles = @(
    "Web_compute_high\angel_rocksdb\LOCK",
    "Agent_angel_server\data\rocksdb\LOCK"
)

foreach ($lockFile in $lockFiles) {
    $fullPath = Join-Path $PSScriptRoot $lockFile
    if (Test-Path $fullPath) {
        try {
            Remove-Item $fullPath -Force -ErrorAction Stop
            Write-Host "  ✅ 已删除: $lockFile" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️ 无法删除: $lockFile (可能仍被占用)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚪ 不存在: $lockFile" -ForegroundColor DarkGray
    }
}

# 5. 最终检查
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 📊 最终状态" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allClear = $true
@(3000, 8000, 8001, 9000) | ForEach-Object {
    $tcp = Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue
    if ($tcp) {
        Write-Host "⚠️ 端口 $_ 仍被占用" -ForegroundColor Yellow
        $allClear = $false
    } else {
        Write-Host "✅ 端口 $_ 已释放" -ForegroundColor Green
    }
}

if ($allClear) {
    Write-Host "`n🎉 所有服务已停止！" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ 部分端口仍被占用，可能需要手动清理" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "按回车键退出"
