@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
# ==========================================
#   Agent_angel_server 环境安装脚本
#   文件创建规范: 遵循 .github/protocols/10_runtime_safety.md
#   - BAT 外壳 + 嵌入式 PowerShell 核心逻辑
#   - 自动输入交互: 使用 -y 参数或管道注入
# ==========================================

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Agent_angel_server 环境安装" -ForegroundColor Cyan
Write-Host " (WSL2 + Patchright Linux 版本)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 步骤1: 检测 WSL2
Write-Host "[1/4] 正在检测 WSL2..." -ForegroundColor Yellow
Write-Host ""

try {
    wsl --version | Out-Null
    Write-Host "+ WSL2 已安装" -ForegroundColor Green
    wsl --version
    Write-Host ""
} catch {
    Write-Host "X 未检测到 WSL" -ForegroundColor Red
    Write-Host ""
    Write-Host "需要安装 WSL2，请以管理员身份运行: wsl --install"
    Write-Host ""
    exit 1
}

# 检查 Ubuntu - 直接测试能否运行命令
Write-Host "正在检查 Ubuntu..."
wsl -d Ubuntu echo "test" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "+ Ubuntu 已安装并可用" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "X Ubuntu 未正确配置" -ForegroundColor Red
    Write-Host "请手动配置 Ubuntu 后重新运行"
    exit 1
}

# 步骤2: 安装 Python 依赖
Write-Host "[2/4] 正在在 WSL2 中安装 Python 依赖..." -ForegroundColor Yellow
Write-Host ""

$pwd = Get-Location
$drive = $pwd.Drive.Name.ToLower()
$path = $pwd.Path.Replace($pwd.Drive.Name + ':\', '').Replace('\', '/')
$wslPath = "/mnt/$drive/$path"

Write-Host "WSL 路径: $wslPath" -ForegroundColor DarkGray
Write-Host ""

Write-Host "正在检查 Python..."
wsl bash -c "command -v python3 >/dev/null 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "正在安装 Python..." -ForegroundColor Yellow
    wsl bash -c "sudo apt-get update && sudo apt-get install -y python3 python3-pip"
} else {
    Write-Host "+ Python 已安装" -ForegroundColor Green
}

Write-Host "正在检查 pip..."
wsl bash -c "python3 -m pip --version >/dev/null 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "正在安装 pip..." -ForegroundColor Yellow
    wsl bash -c "sudo apt-get update && sudo apt-get install -y python3-pip"
}
Write-Host ""

Write-Host "正在检查 Patchright..."
wsl bash -c "cd '$wslPath' && python3 -c 'import patchright' 2>/dev/null"
if ($LASTEXITCODE -eq 0) {
    Write-Host "+ Patchright 已安装，跳过" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "正在安装 Python 依赖..." -ForegroundColor Yellow
    wsl bash -c "cd '$wslPath' && python3 -m pip install --break-system-packages -r requirements.txt"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "X Python 依赖安装失败" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "+ Python 依赖安装完成" -ForegroundColor Green
    Write-Host ""
}

# 步骤3: 安装 Patchright 浏览器
Write-Host "[3/4] 正在在 WSL2 中安装 Patchright (Linux 版本)..." -ForegroundColor Yellow
Write-Host ""

Write-Host "正在检查 Patchright 浏览器..."
wsl bash -c "cd '$wslPath' && python3 -c 'from patchright.sync_api import sync_playwright; p = sync_playwright().start(); p.chromium.executable_path; p.stop()' 2>/dev/null"
if ($LASTEXITCODE -eq 0) {
    Write-Host "+ Patchright 浏览器已安装，跳过" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "正在安装系统依赖..." -ForegroundColor Yellow
    wsl bash -c "sudo apt-get update && sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2"
    
    Write-Host "正在安装 Patchright 浏览器..." -ForegroundColor Yellow
    wsl bash -c "cd '$wslPath' && python3 -m patchright install chromium"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "X Patchright 安装失败" -ForegroundColor Red
        Write-Host ""
        Write-Host "请尝试手动安装: wsl bash -c `"cd '$wslPath' && python3 -m patchright install chromium`""
        Write-Host ""
        exit 1
    }
    
    Write-Host "+ Patchright 安装完成" -ForegroundColor Green
    Write-Host ""
}

# 步骤4: 验证安装
Write-Host "[4/4] 正在验证安装..." -ForegroundColor Yellow
Write-Host ""

$result = wsl bash -c "cd '$wslPath' && python3 -c 'import patchright' 2>&1"

if ($LASTEXITCODE -eq 0) {
    Write-Host "+ Patchright 导入成功" -ForegroundColor Green
} else {
    Write-Host "X Patchright 验证失败: $result" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " 安装完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "环境信息:"
Write-Host "  - WSL2: 已安装"
Write-Host "  - Ubuntu: 已安装"
Write-Host "  - Python: 已安装"
Write-Host "  - Patchright: 已安装 (Linux 版本)"
Write-Host ""
Write-Host "下一步:"
Write-Host "  1. 运行 Agent_angel_server_start.bat 启动服务"
Write-Host "  2. 或运行 start.bat 启动完整系统"
Write-Host ""
Write-Host "3秒后自动关闭..." -ForegroundColor DarkGray
Start-Sleep -Seconds 3
