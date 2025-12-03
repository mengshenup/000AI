import sys
import os
from dotenv import load_dotenv
import subprocess

# =================================
#  🎉 FastAPI 应用核心 (无参数)
#
#  🎨 代码用途：
#     作为 Angel 的“神经中枢”，初始化 FastAPI 应用实例，配置 CORS 跨域策略，加载环境变量，并注册 HTTP 和 WebSocket 路由。
#
#  💡 易懂解释：
#     这是 Angel 的大脑皮层！🧠 它把所有的神经（路由）都连接起来，让 Angel 能够听到（接收请求）并做出反应（返回数据）。
#
#  ⚠️ 警告：
#     Windows 平台下必须设置 WindowsProactorEventLoopPolicy，否则 Playwright 的异步操作可能会卡死。
# =================================

sys.dont_write_bytecode = True # 🚫 禁止生成 .pyc 文件

# 🔄 加载环境变量 (已移除对 Web_compute_high 的依赖)
# 修正路径：Agent_angel_server/Nerve/fastapi_app.py -> Agent_angel_server -> 000AI -> Web_compute_high -> Memorybank
# current_dir = os.path.dirname(os.path.abspath(__file__))
# workspace_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir))) # 假设结构为 Agent_angel_server/Nerve
# 实际上: __file__ = .../Agent_angel_server/Nerve/fastapi_app.py
# dirname -> .../Agent_angel_server/Nerve
# dirname -> .../Agent_angel_server
# dirname -> .../000AI
# workspace_dir = os.path.dirname(os.path.dirname(current_dir))
# env_path = os.path.join(workspace_dir, "Web_compute_high", "Memorybank", ".env") 
# load_dotenv(env_path) # 🔑 加载环境变量

import asyncio # ⚡ 异步 I/O 库
import sys # 🖥️ 系统模块

# ⚠️ Windows 平台必须设置 ProactorEventLoopPolicy，否则 Playwright 会卡死
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import warnings # ⚠️ 警告控制模块
import uvicorn # 🦄 ASGI 服务器
from fastapi import FastAPI # 🚀 FastAPI 框架
from fastapi.middleware.cors import CORSMiddleware # 🛡️ CORS 中间件
from Nerve.websocket_server import router as ws_router # 🔌 WebSocket 路由
from Nerve.http_server import router as api_router # 🔌 HTTP API 路由
from Brain.cognitive_system import global_cognitive_system # 🧠 导入认知系统

warnings.filterwarnings("ignore", category=DeprecationWarning) # 🔇 忽略弃用警告

# 📢 注册启动事件
async def startup_event():
    # =================================
    #  🎉 启动事件 (无参数)
    #
    #  🎨 代码用途：
    #     在服务器启动时执行的钩子函数，打印欢迎信息和版本号。
    #     同时启动认知系统 (Cognitive System)。
    #
    #  💡 易懂解释：
    #     Angel 醒来啦！🌅 伸个懒腰，大声喊出自己的名字和版本号！
    #     然后叫醒大脑，开始思考今天要做什么。
    # =================================
    print("\n" + "="*40) # 📢 打印分隔线
    print("✨ Angel Server 应用核心已加载 (v2.2.0)") # 📢 打印版本信息
    print("✨ 模块化架构: Brain, Eye, Hand, Body, Nerve, Memory, Energy") # 📢 打印架构信息
    print("="*40 + "\n") # 📢 打印分隔线
    
    # 🧠 启动认知循环
    await global_cognitive_system.start()

# 🚀 初始化 FastAPI 应用实例
app = FastAPI(title="Angel System Backend", version="2.2.0") # 📱 创建应用
app.add_event_handler("startup", startup_event) # 🔗 绑定启动事件

# 🛡️ CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 🌐 允许所有来源
    allow_credentials=True, # 🔑 允许携带凭证
    allow_methods=["*"], # 🛠️ 允许所有方法
    allow_headers=["*"], # 📨 允许所有头信息
)

# 🔗 注册路由 (神经通路)
app.include_router(ws_router) # 🔌 接入 WebSocket 神经
app.include_router(api_router) # 🔌 接入 HTTP 神经

# 🧟‍♂️ 僵尸猎人：尝试清理可能残留的浏览器进程
def kill_zombie_browsers():
    # =================================
    #  🎉 僵尸猎人 (无参数)
    #
    #  🎨 代码用途：
    #     尝试清理系统中残留的 node.exe 进程（Playwright 驱动），防止僵尸进程占用资源。
    #
    #  💡 易懂解释：
    #     打扫战场！🧹 把那些赖着不走的坏家伙（僵尸进程）都赶走，保持系统干干净净！
    #
    #  ⚠️ 警告：
    #     taskkill /F 是强制结束进程，可能会误杀其他 Node.js 应用。慎用。
    # =================================
    """
    🧟‍♂️ 僵尸猎人：尝试清理可能残留的浏览器进程
    在热更新重启时，旧的浏览器进程可能没关掉。
    这里使用 taskkill 尝试清理。
    """
    try:
        # 仅清理带有特定特征的进程，避免误杀用户浏览器
        # 注意：Playwright 启动的浏览器通常没有明显的窗口标题特征，除非是 headless=False
        # 但我们可以尝试清理 node.exe (Playwright 的驱动)
        subprocess.run("taskkill /F /IM node.exe /T", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) # 🔫 强制结束 node.exe
        
        # 如果是 headless 模式，通常可以通过命令行参数区分，但 taskkill 很难做到这一点。
        # 最安全的方式是依赖 stop_server.bat 手动清理。
        # 或者，如果确定机器是专用的，可以取消下面注释：
        # subprocess.run("taskkill /F /IM msedge.exe /FI \"WINDOWTITLE eq data:,*\"", shell=True)
        pass
    except Exception:
        pass

# 在模块加载时尝试清理（慎用，可能会误杀）
# kill_zombie_browsers()

if __name__ == "__main__":
    # =================================
    #  🎉 本地调试入口 (无参数)
    #
    #  🎨 代码用途：
    #     当直接运行此文件时启动服务器。通常由 Brain/main.py 启动，此处仅作备用。
    #
    #  💡 易懂解释：
    #     备用启动按钮！🔴 如果主开关坏了，按这里也能启动 Angel 哦！
    # =================================
    print(f"🚀 Angel Backend 正在启动 (Python {sys.version.split()[0]})...") # 📢 打印启动信息
    print("✅ 正在监听端口: 8000") # 📢 打印端口信息
    
    uvicorn.run(
        app, # 📦 运行的应用实例
        host="0.0.0.0", # 🌐 监听地址
        port=8000,      # 🚪 监听端口
        reload=False,   # 🚫 关闭热重载 (生产模式)
        workers=1       # 👷 工作进程数
    )