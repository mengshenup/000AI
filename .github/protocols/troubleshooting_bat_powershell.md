# 🐛 BAT + PowerShell 嵌入式脚本故障排查

> 记录日期: 2025-12-16  
> 问题类型: BAT 文件行尾符导致的脚本执行失败

## 📋 问题描述

### 症状
执行 BAT 嵌入式 PowerShell 脚本时出现以下错误：

```
'oundColor' is not recognized as an internal or external command
't' is not recognized as an internal or external command
```

### 表现
- PowerShell 代码被 CMD 当作批处理命令执行
- PowerShell 参数（如 `-ForegroundColor`）被截断并当作命令
- 脚本无法正常运行

## 🔍 根本原因

**核心问题**: BAT 文件使用 **LF (Unix)** 行尾符，而非 **CRLF (Windows)** 行尾符

**影响链**:
1. Windows CMD 需要 CRLF (`\r\n`) 才能正确解析批处理命令
2. 当文件只有 LF (`\n`) 时，`goto :eof` 命令无法正确终止 BAT 部分
3. CMD 继续执行后面的 PowerShell 代码行
4. PowerShell 语法在 CMD 中产生语法错误

## 🔧 诊断方法

### 方法 1: 检查文件行尾符（PowerShell）

```powershell
# 检查文件的前 100 个字节
$bytes = [System.IO.File]::ReadAllBytes('script.bat')
for($i=0; $i -lt 100; $i++) {
    if($bytes[$i] -eq 0x0D) { Write-Host "位置 $i : CR (0x0D)" -ForegroundColor Yellow }
    if($bytes[$i] -eq 0x0A) { Write-Host "位置 $i : LF (0x0A)" -ForegroundColor Green }
}
```

**判断标准**:
- ✅ 正确: 显示 `CR LF CR LF CR LF ...` (CRLF 格式)
- ❌ 错误: 只显示 `LF LF LF ...` (LF 格式)

### 方法 2: 检查 UTF-8 BOM

```powershell
$bytes = [System.IO.File]::ReadAllBytes('script.bat')
$hasBOM = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
Write-Host "UTF-8 BOM: $hasBOM"
```

**说明**: BOM 本身不是问题，但可能与行尾符问题同时出现

## ✅ 解决方案

### 快速修复（PowerShell）

```powershell
# 转换为 CRLF 格式
$content = Get-Content 'script.bat' -Raw
$content = $content -replace "`n", "`r`n"
$content = $content -replace "`r`r`n", "`r`n"  # 防止重复转换
[System.IO.File]::WriteAllText('script.bat', $content, [System.Text.Encoding]::UTF8)
Write-Host "已转换为 CRLF 格式" -ForegroundColor Green
```

### 批量修复（PowerShell）

```powershell
# 修复目录下所有 BAT 文件
Get-ChildItem -Path . -Filter *.bat -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "`n", "`r`n"
    $content = $content -replace "`r`r`n", "`r`n"
    [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "已修复: $($_.Name)" -ForegroundColor Green
}
```

## 🛡️ 预防措施

### 1. Git 配置

在项目根目录创建或修改 `.gitattributes` 文件：

```gitattributes
# 强制 BAT 文件使用 CRLF
*.bat text eol=crlf
```

### 2. 编辑器配置

**VS Code** (`.vscode/settings.json`):
```json
{
  "[bat]": {
    "files.eol": "\r\n"
  }
}
```

**EditorConfig** (`.editorconfig`):
```ini
[*.bat]
end_of_line = crlf
```

### 3. 创建脚本时的最佳实践

使用 PowerShell 创建 BAT 文件时，确保使用正确的编码：

```powershell
$content = @"
@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "`$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression `$Script"
goto :eof
# PowerShell code here
"@

# 使用 UTF8 编码和 CRLF 写入
[System.IO.File]::WriteAllText('script.bat', $content, [System.Text.Encoding]::UTF8)
```

## 📝 BAT 嵌入式 PowerShell 标准模板

```batch
@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
# ==========================================
#   PowerShell 代码从这里开始
#   注意: 必须使用 # 注释，不能使用 REM
# ==========================================

$ErrorActionPreference = "Stop"

Write-Host "Hello from embedded PowerShell!" -ForegroundColor Green
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Cyan

# 你的 PowerShell 代码...
```

## ⚠️ 重要注意事项

1. **行尾符要求**:
   - 前 4 行 BAT 命令必须使用 CRLF
   - PowerShell 代码部分可以使用 LF，但建议统一使用 CRLF

2. **注释格式**:
   - BAT 部分: 使用 `REM` 或 `::`
   - PowerShell 部分: 使用 `#`（不能使用 `REM`）

3. **跳过行数**:
   - `Select-Object -Skip 5` 跳过前 5 行
   - 如果修改 BAT 部分行数，需要相应调整跳过数量

4. **文件编码**:
   - 推荐使用 UTF-8（带或不带 BOM 都可以）
   - 避免使用 ANSI 编码（中文可能乱码）

## 🧪 测试验证

创建测试脚本验证修复：

```batch
@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$Script = (Get-Content '%~f0' | Select-Object -Skip 5) -join [Environment]::NewLine; Invoke-Expression $Script"
goto :eof
# Test script
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 测试 BAT + PowerShell 机制" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "[测试 1] 当前目录: $(Get-Location)" -ForegroundColor Green
Write-Host "[测试 2] PowerShell 版本: $($PSVersionTable.PSVersion)" -ForegroundColor Green
Write-Host "[测试 3] 中文显示测试" -ForegroundColor Green

Write-Host "`n所有测试通过！" -ForegroundColor Green
```

运行测试：
```powershell
cmd /c test.bat
```

预期输出应该显示彩色文本，没有任何错误信息。

## 📚 相关资源

- [Windows 批处理文件格式规范](https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands)
- [PowerShell 执行策略](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies)
- [Git 行尾符处理](https://git-scm.com/docs/gitattributes#_end_of_line_conversion)

## 🔄 更新日志

- **2025-12-16**: 初始版本，记录 LF/CRLF 行尾符问题及解决方案


---

## 📝 修复记录

### 已修复的文件
- `Agent_angel_server/Agent_angel_server_setup.bat` ✅ 已修复 (2025-12-16)
- `Agent_angel_server/Agent_angel_server_start.bat` ✅ 已修复 (2025-12-16)

### 修复方法
使用 PowerShell 命令转换行尾符：
```powershell
$file = "path/to/file.bat"
$content = Get-Content $file -Raw
$content = $content -replace "`n", "`r`n"
$content = $content -replace "`r`r`n", "`r`n"
[System.IO.File]::WriteAllText((Resolve-Path $file).Path, $content)
```


## 📝 修复历史

### 2025-12-16: 批量修复启动脚本

**修复的文件**:
- `Agent_angel_server/Agent_angel_server_setup.bat` ✅ 已修复
- `Agent_angel_server/Agent_angel_server_start.bat` ✅ 已修复
- `Agent_angel_server/Agent_angel_server_stop.bat` ✅ 已修复
- `Agent_angel_server/debug.bat` ✅ 已修复
- `Agent_angel_server/setup.bat` ✅ 已修复

**修复方法**: 使用 `fix_line_endings.ps1` 工具自动转换所有 BAT 文件为 CRLF 格式

**验证方法**: 使用 `test_startup_scripts.ps1 -All` 验证所有脚本正确性

## 🛠️ 自动化工具

### fix_line_endings.ps1

自动检查和修复 BAT 文件的行尾符格式。

**用法**:
```powershell
# 仅检查
.\fix_line_endings.ps1 -CheckOnly

# 自动修复
.\fix_line_endings.ps1 -Fix
```

### test_startup_scripts.ps1

测试启动脚本的正确性。

**用法**:
```powershell
# 运行所有测试
.\test_startup_scripts.ps1 -All

# 单独测试
.\test_startup_scripts.ps1 -TestLineEndings
.\test_startup_scripts.ps1 -TestPortCleanup
.\test_startup_scripts.ps1 -TestIndependentStartup
```

## 🔍 预防措施

1. **使用正确的编辑器设置**: 确保编辑器配置为 Windows (CRLF) 行尾符
2. **Git 配置**: 设置 `.gitattributes` 确保 BAT 文件使用 CRLF
3. **定期检查**: 运行 `fix_line_endings.ps1 -CheckOnly` 检查文件格式
4. **CI/CD 集成**: 在 CI 流程中添加行尾符检查

## 📚 相关文档

- [启动脚本使用指南](../../启动脚本使用指南.md)
- [运行时安全规范](./10_runtime_safety.md)
- [编译等待说明](../../编译等待说明.md)
