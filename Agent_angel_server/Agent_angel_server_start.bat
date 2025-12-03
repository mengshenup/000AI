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
    $attempt = 1
    $stuckCount = 0
    $lastPid = 0
    
    # 升级为无限重试模式，直到端口彻底释放
    while ($true) {
        # 方法 1: PowerShell 原生检查
        $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        
        # 方法 2: Netstat 文本解析
        $netstatOut = netstat -ano | Select-String ":$port\s"
        
        if (-not $tcp -and -not $netstatOut) {
            Write-Host "✅ 端口 $port 已清理干净 (耗时: $attempt 秒)。" -ForegroundColor Green
            return
        }

        Write-Host "⚠️ [清理] 端口 $port 被占用 (第 $attempt 次尝试)..." -ForegroundColor Yellow
        
        # 收集所有相关 PID
        $pids = @()
        if ($tcp) { $pids += $tcp.OwningProcess }
        if ($netstatOut) {
            foreach ($line in $netstatOut) {
                if ($line -match '\s+(\d+)\s*$') {
                    $pids += $matches[1]
                }
            }
        }
        $pids = $pids | Select-Object -Unique

        foreach ($id in $pids) { 
            if ($id -eq 0) { continue } # 忽略 System Idle Process
            
            # 获取进程名称以便诊断
            $procName = "Unknown"
            try { $procName = (Get-Process -Id $id -ErrorAction SilentlyContinue).ProcessName } catch {}
            Write-Host "   - 目标: PID $id ($procName)" -ForegroundColor Gray

            # 尝试 1: Stop-Process
            try {
                Stop-Process -Id $id -Force -ErrorAction Stop
                Write-Host "     [Stop-Process] 成功" -ForegroundColor Green
            } catch {
                Write-Host "     [Stop-Process] 失败" -ForegroundColor DarkGray
                
                # 尝试 2: Taskkill (显示错误信息)
                Write-Host "     [Taskkill] 尝试强制终止..." -ForegroundColor DarkGray
                cmd /c "taskkill /F /PID $id"
                
                # 尝试 3: WMIC (核弹选项)
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "     [WMIC] 尝试底层终止..." -ForegroundColor DarkGray
                    cmd /c "wmic process where processid=$id delete"
                }
            }
            
            # 检测顽固进程
            if ($id -eq $lastPid) {
                $stuckCount++
                if ($stuckCount -ge 5) {
                    Write-Host "❌ 警告: PID $id 极其顽固，可能需要管理员权限。" -ForegroundColor Red
                    Write-Host "   请尝试右键点击脚本 -> '以管理员身份运行'。" -ForegroundColor Yellow
                }
            } else {
                $stuckCount = 0
                $lastPid = $id
            }
        }
        
        Start-Sleep -Seconds 1
        $attempt++
    }
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
    try {
        Write-Host "`n========================================" -ForegroundColor Magenta
        Write-Host "🚀 正在启动 Agent_angel_server..." -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Magenta

        # 执行端口清理并获取结果
        $portFree = $true
        # 注意: PowerShell 函数返回值比较特殊，这里我们通过检查端口状态来确认
        Kill-Port 8000
        
        # 再次确认端口是否真的空闲
        $tcpCheck = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
        $netstatCheck = netstat -ano | Select-String ":8000\s"
        
        if ($tcpCheck -or $netstatCheck) {
            Write-Host "❌ [启动终止] 端口 8000 依然被占用，无法启动服务器。" -ForegroundColor Red
            Write-Host "   请尝试手动关闭占用该端口的程序 (如其他 Python 进程)。" -ForegroundColor Gray
        } else {
            # 只有端口空闲时才启动 Python
            if (Test-Path 'Brain/run.py') {
                python Brain/run.py
            } elseif (Test-Path 'Brain/main.py') {
                Write-Host "⚠️ 未找到 Brain/run.py，降级使用 Brain/main.py" -ForegroundColor Yellow
                python Brain/main.py
            } else {
                Write-Host "❌ 错误：找不到启动文件！" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "❌ 运行时错误: $_" -ForegroundColor Red
    }

    Write-Host "`n🛑 服务器已停止 (或启动失败)。" -ForegroundColor Yellow
    Write-Host "👉 按 [Enter] 键重新启动..." -ForegroundColor Cyan
    $input = Read-Host
    if ($input -eq 'q') { break }
}
