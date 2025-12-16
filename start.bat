@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
REM ==========================================
# 🚀 Angel 系统顺序启动器 (支持重启)
# 说明: 清理旧进程后重新启动，不会打开多余窗口
# ==========================================

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.WindowTitle = "Angel Sequential Launcher"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 🚀 Angel 顺序启动器 (支持重启)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 关闭旧的服务窗口
function Close-OldWindows {
    Write-Host "🧹 关闭旧服务窗口..." -ForegroundColor Yellow
    
    # 关闭标题包含特定关键字的cmd窗口
    $keywords = @("Web_compute_low", "Web_compute_high", "Agent_angel_server", "Rust Low", "Rust High", "Python Worker")
    
    $closed = 0
    Get-Process cmd -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $title = $_.MainWindowTitle
            foreach ($kw in $keywords) {
                if ($title -like "*$kw*") {
                    Write-Host "    🔪 关闭窗口: $title" -ForegroundColor DarkYellow
                    $_ | Stop-Process -Force -ErrorAction SilentlyContinue
                    $closed++
                    break
                }
            }
        } catch { }
    }
    
    # 也关闭powershell窗口
    Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | ForEach-Object {
        try {
            $title = $_.MainWindowTitle
            foreach ($kw in $keywords) {
                if ($title -like "*$kw*") {
                    Write-Host "    🔪 关闭窗口: $title" -ForegroundColor DarkYellow
                    $_ | Stop-Process -Force -ErrorAction SilentlyContinue
                    $closed++
                    break
                }
            }
        } catch { }
    }
    
    if ($closed -eq 0) {
        Write-Host "    ⚪ 没有旧窗口需要关闭" -ForegroundColor DarkGray
    }
}

# 清理端口函数 (强力版)
function Kill-Port ($port) {
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($tcp) {
        $pids = $tcp.OwningProcess | Select-Object -Unique
        foreach ($id in $pids) {
            if ($id -and $id -ne 0) {
                Write-Host "    🔪 杀死进程 $id (端口 $port)" -ForegroundColor Yellow
                Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# 等待端口启动函数
function Wait-ForPort ($port, $timeout) {
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($tcp) { return $true }
        
        # 检查 WSL2
        $wslCheck = wsl bash -c "ss -tuln 2>/dev/null | grep ':$port '" 2>$null
        if ($wslCheck) { return $true }
        
        Start-Sleep -Seconds 2
        $elapsed += 2
        if ($elapsed % 10 -eq 0) {
            Write-Host "    ⏳ 已等待 $elapsed 秒..." -ForegroundColor DarkGray
        }
    }
    return $false
}

# 0. 关闭旧窗口
Close-OldWindows

# 1. 清理端口和 WSL 内部进程
Write-Host "`n🧹 步骤 1: 清理端口和 WSL 进程..." -ForegroundColor Cyan

# 🧱 [2025-12-17] 修复: 先清理 WSL 内部所有残留进程
$wslAvailable = Get-Command wsl -ErrorAction SilentlyContinue
if ($wslAvailable) {
    Write-Host "  🧹 清理 WSL 内部进程..." -ForegroundColor Yellow
    wsl bash -c "pkill -f 'python3.*Main.py' 2>/dev/null" 2>$null
    wsl bash -c "pkill -f 'uvicorn' 2>/dev/null" 2>$null
    wsl bash -c "pkill -f 'web_compute_low' 2>/dev/null" 2>$null
    wsl bash -c "pkill -f 'web_compute_high' 2>/dev/null" 2>$null
    wsl bash -c "pkill -f 'agent_angel_server' 2>/dev/null" 2>$null
    wsl bash -c "pkill -f 'cargo.*run' 2>/dev/null" 2>$null
    Write-Host "  ✅ WSL 进程已清理" -ForegroundColor Green
}

# 清理 Windows 端口
@(3000, 8000, 8001, 9000) | ForEach-Object {
    Kill-Port $_
    Write-Host "  ✅ 端口 $_ 已清理" -ForegroundColor Green
}
Write-Host ""

# 2. 启动 Web_compute_low (3000)
Write-Host "🚀 步骤 2: 启动 Web_compute_low..." -ForegroundColor Cyan
Start-Process "start_rust_low_server.bat"
Write-Host "  ⏳ 等待端口 3000..." -ForegroundColor Yellow

if (Wait-ForPort 3000 60) {
    Write-Host "  ✅ Web_compute_low 已启动" -ForegroundColor Green
} else {
    Write-Host "  ❌ Web_compute_low 启动失败" -ForegroundColor Red
    Write-Host "`n❌ 关键服务失败，停止启动" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}
Write-Host ""

# 3. 启动 Agent_angel_server (8000, 8001)
Write-Host "🚀 步骤 3: 启动 Agent_angel_server..." -ForegroundColor Cyan
Start-Process "Agent_angel_server\Agent_angel_server_start.bat"
Write-Host "  ⏳ 等待端口 8001 (Python Worker)..." -ForegroundColor Yellow

if (Wait-ForPort 8001 30) {
    Write-Host "  ✅ Python Worker 已启动" -ForegroundColor Green
} else {
    Write-Host "  ❌ Python Worker 启动失败" -ForegroundColor Red
    Write-Host "`n❌ 关键服务失败，停止启动" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}

Write-Host "  ⏳ 等待端口 8000 (Rust Core)..." -ForegroundColor Yellow
if (Wait-ForPort 8000 90) {
    Write-Host "  ✅ Rust Core 已启动" -ForegroundColor Green
} else {
    Write-Host "  ❌ Rust Core 启动失败" -ForegroundColor Red
    Write-Host "`n❌ 关键服务失败，停止启动" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}
Write-Host ""

# 4. 启动 Web_compute_high (9000)
Write-Host "🚀 步骤 4: 启动 Web_compute_high..." -ForegroundColor Cyan
Start-Process "start_rust_high_server.bat"
Write-Host "  ⏳ 等待端口 9000..." -ForegroundColor Yellow

if (Wait-ForPort 9000 120) {
    Write-Host "  ✅ Web_compute_high 已启动" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Web_compute_high 启动失败 (非关键)" -ForegroundColor Yellow
}
Write-Host ""

# 5. 最终检查
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " 📊 最终状态" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$status = @{
    3000 = "Web_compute_low"
    8000 = "Agent_angel_server Rust Core"
    8001 = "Agent_angel_server Python Worker"
    9000 = "Web_compute_high"
}

# 🧱 [2025-12-17] 修复: 检查端口时也检查 WSL 内部
$running = 0
foreach ($port in $status.Keys | Sort-Object) {
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    $wslCheck = $null
    if (-not $tcp) {
        $wslCheck = wsl bash -c "ss -tuln 2>/dev/null | grep ':$port '" 2>$null
    }
    
    if ($tcp -or $wslCheck) {
        Write-Host "✅ $($status[$port]) (端口 $port)" -ForegroundColor Green
        $running++
    } else {
        Write-Host "❌ $($status[$port]) (端口 $port)" -ForegroundColor Red
    }
}

Write-Host "`n📊 $running/4 个服务运行中" -ForegroundColor $(if($running -eq 4){'Green'}else{'Yellow'})

# 🧱 [2025-12-17] 修复: 直接打开浏览器，因为前面已经确认端口 3000 启动成功
Write-Host "`n🌐 打开浏览器..." -ForegroundColor Green
Start-Sleep -Seconds 1
Start-Process "http://localhost:3000"

Write-Host "`n🎉 启动完成！" -ForegroundColor Magenta
Write-Host "💡 提示: 再次运行 start.bat 可重启所有服务" -ForegroundColor DarkGray
Read-Host "按回车键退出"
