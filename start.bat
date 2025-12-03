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

Write-Host "🧹 正在执行全局端口清理..." -ForegroundColor Cyan
Kill-Port 5500
Kill-Port 8000
Kill-Port 9000
Write-Host "✅ 全局清理完成。`n" -ForegroundColor Green

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
Write-Host "💡 提示: 各个服务窗口现已支持 [按回车键重启] 功能。" -ForegroundColor Yellow
Write-Host "按任意键退出启动器..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

