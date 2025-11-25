@echo off
echo [安装] 正在安装 Angel 客户端依赖...
pip install -r requirements.txt
echo [安装] 正在安装 Playwright 浏览器...
playwright install
echo [完成] 安装完毕！
pause
