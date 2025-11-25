@echo off
chcp 65001
echo ========================================================
echo   Angel Client Setup (Web_compute_low)
echo ========================================================
echo.

:: 1. 检查 Rust 环境
echo 正在检查 Rust 环境...
cargo --version >nul 2>&1
if %errorlevel% equ 0 goto :RustFound

:RustNotFound
echo ❌ 未检测到 Rust 环境。
echo 🔄 正在为您自动下载并安装 Rust (rustup)...

REM 使用 PowerShell 下载 rustup-init.exe
powershell -Command "Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile 'rustup-init.exe'"

if exist rustup-init.exe goto :InstallRust

echo ❌ 下载失败，请手动访问 https://rustup.rs/ 安装。
pause
exit /b

:InstallRust
echo ✅ 下载成功，正在静默安装...
REM -y 表示默认安装，不询问
rustup-init.exe -y

echo ♻️  正在清理安装包...
del rustup-init.exe

echo.
echo ✅ Rust 安装完成！
echo ⚠️  注意: 您可能需要【重启 VS Code】或【重启终端】才能使环境变量生效。
echo.

REM 尝试临时添加环境变量以便立即使用
set PATH=%USERPROFILE%\.cargo\bin;%PATH%
goto :BuildStep

:RustFound
echo ✅ Rust 环境已就绪:
cargo --version
goto :BuildStep

:BuildStep
:: 2. 预编译依赖
echo.
echo 📦 正在预编译 Rust 依赖 (Cargo.toml)...
echo    这可能需要几分钟，请耐心等待...
cd /d "%~dp0"
cargo build --bin apps_list --release

if %errorlevel% equ 0 goto :BuildSuccess

:BuildFail
echo.
echo ❌ 编译失败！
echo.
echo 💡 核心原因: 缺少 C++ 连接器 (Linker)。
echo    Rust 在 Windows 上需要 "Visual Studio C++ Build Tools" 或 "MinGW"。
echo.
echo 🛠️ 解决方案 (二选一):
echo.
echo    [方案 A] 安装 Visual Studio Build Tools (推荐，最稳妥)
echo       1. 下载: https://visualstudio.microsoft.com/visual-cpp-build-tools/
echo       2. 安装时勾选 "使用 C++ 的桌面开发"。
echo.
echo    [方案 B] 安装 MinGW (轻量级，无需安装 VS)
echo       1. 自动为您下载并配置 MinGW 环境...
echo.

choice /C AB /M "请选择方案 (A: 手动安装VS, B: 自动安装MinGW)"
if errorlevel 2 goto :InstallMinGW
if errorlevel 1 goto :End

:InstallMinGW
echo.
echo 🔄 正在下载 MinGW (WinLibs GCC)...
echo    文件较大 (~100MB)，请耐心等待...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/brechtsanders/winlibs_mingw/releases/download/13.2.0-16.0.6-11.0.1-msvcrt-r1/winlibs-x86_64-posix-seh-gcc-13.2.0-llvm-16.0.6-mingw-w64msvcrt-11.0.1-r1.zip' -OutFile 'mingw.zip'"

if not exist mingw.zip (
    echo ❌ 下载失败！请检查网络。
    goto :End
)

echo ✅ 下载成功，正在解压...
powershell -Command "Expand-Archive -Path 'mingw.zip' -DestinationPath 'C:\' -Force"

echo ♻️  正在清理压缩包...
del mingw.zip

echo.
echo ⚙️ 正在配置环境变量...
set PATH=C:\mingw64\bin;%PATH%
REM 永久添加环境变量 (需要重启生效)
setx PATH "C:\mingw64\bin;%PATH%"

echo.
echo 🔄 正在切换 Rust 到 GNU 工具链...
rustup toolchain install stable-x86_64-pc-windows-gnu
rustup default stable-x86_64-pc-windows-gnu

echo.
echo 🚀 环境修复完成！正在重试编译...
cargo build --bin apps_list --release

if %errorlevel% equ 0 goto :BuildSuccess
echo ❌ 重试编译依然失败，请尝试方案 A。
goto :End

:BuildSuccess
echo ✅ 编译成功！同步工具已准备就绪。

:End
echo.
echo 🎉 环境配置完成！
pause
