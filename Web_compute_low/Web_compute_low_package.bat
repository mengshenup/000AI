@echo off
chcp 65001 >nul
echo ========================================================
echo   📦 Angel Web Low - Linux 发布打包工具
echo ========================================================
echo.
echo   此脚本将提取所有运行时需要的文件，生成一个干净的发布包。
echo   您可以直接将生成的 'release_linux' 文件夹上传到服务器。
echo.

if not exist "Debug\simple_server" (
    echo ❌ 错误: 未找到编译好的 'simple_server' 文件。
    echo    请先运行 Web_compute_low_build.bat 进行编译。
    pause
    exit /b
)

echo [1/5] 创建发布目录 (release_linux)...
:: 目标目录在项目外层，避免递归复制
set "DEST=..\release_linux"
if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"

echo [2/5] 复制项目文件 (排除源码)...
:: 使用 Robocopy 进行智能复制
:: /E: 复制子目录
:: /XD: 排除目录 (src, target, .git, wsl_rust_env, .vscode, no_code)
:: /XF: 排除文件 (*.rs, *.toml, *.bat, *.ps1, *.gitignore, *.lock)
robocopy . "%DEST%" /E /XD src target .git wsl_rust_env .vscode no_code /XF *.rs *.toml *.bat *.ps1 *.gitignore *.lock >nul

echo [3/5] 确保二进制文件可执行...
:: 在 Windows 上无法设置 Linux 权限，但文件已经复制过去了

echo [4/5] 创建启动脚本...
echo #!/bin/bash > "%DEST%\start.sh"
echo chmod +x Debug/simple_server >> "%DEST%\start.sh"
echo ./Debug/simple_server >> "%DEST%\start.sh"

echo.
echo ========================================================
echo   ✅ 打包完成！
echo   发布包位置: %DEST%
echo.
echo   📂 包含内容:
echo      - Debug/simple_server (Linux 二进制程序)
echo      - Operator/apps_list (Linux 二进制程序)
echo      - index.html
echo      - assets/, css/, js/
echo      - start.sh
echo.
echo   🚀 部署指南:
echo      1. 将 release_linux 文件夹上传到 Linux 服务器。
echo      2. 运行 chmod +x start.sh
echo      3. 运行 ./start.sh
echo ========================================================
pause