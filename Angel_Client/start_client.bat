@echo off
cd /d "%~dp0"
:: 切换为 UTF-8 编码
chcp 65001 >nul

title Angel Client (前端界面 - 5500)
color 0a

:: 🔧 优化控制台体验 (防挂起/防乱码)
powershell -Command "&{$c=[Console];$m=$c::In.GetMode();$m=$m -band -not 0x0040;$c::In.SetMode($m);$r=$c::BufferHeight;if($r -lt 3000){$c::BufferHeight=3000}}" >nul 2>&1
set PYTHONIOENCODING=utf-8

echo ==========================================
echo      🟢 Angel 前端启动器
echo ==========================================
echo.

:: === 1. 端口说明 ===
echo [原理] 正在启动临时 HTTP 服务 (端口 5500)
echo        这是为了让浏览器能加载模块化 JS 文件。
echo.

:: === 2. 自动打开浏览器 ===
echo [1/2] 正在自动打开浏览器...
:: start "" 是异步命令，不会阻塞后续代码
start http://localhost:5500

:: === 3. 启动前端服务 ===
echo [2/2] 正在挂载静态文件服务...
echo.
echo [提示] 如果浏览器显示 "无法连接"，请检查：
echo        1. 本窗口是否被意外关闭。
echo        2. 是否有其他软件(如LiveServer)占用了 5500 端口。
echo.
echo [注意] 修改前端代码后，只需在浏览器按 F5 刷新，无需重启此窗口。
echo.

:: 使用 Python 内置 HTTP 服务器，如果报错跳转到错误处理
python -m http.server 5500
if %errorlevel% neq 0 goto :error

:: 正常退出（通常到不了这里，除非手动关闭）
goto :end

:error
color 0c
echo.
echo ==========================================
echo 启动失败！
echo ==========================================
echo 可能原因：
echo 1. 端口 5500 被占用。
echo 2. Python 未正确安装。
echo.
pause
exit

:end