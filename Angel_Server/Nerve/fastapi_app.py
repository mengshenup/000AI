import sys
import os
from dotenv import load_dotenv
import subprocess

# =================================
#  🎉 主程序入口 (Nerve/fastapi_app.py)
#
#  🎨 代码用途：
#     初始化 FastAPI 应用，配置中间件、路由和事件循环策略。
# =================================

sys.dont_write_bytecode = True

# 🔄 加载环境变量 (从 Memorybank/.env)
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Memorybank", ".env")
load_dotenv(env_path)

import asyncio
import warnings
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Nerve.websocket_server import router as ws_router
from Nerve.http_server import router as api_router

warnings.filterwarnings("ignore", category=DeprecationWarning)

# 📢 注册启动事件
async def startup_event():
    print("\n" + "="*40)
    print("✨ Angel Server 应用核心已加载 (v2.2.0)")
    print("✨ 模块化架构: Brain, Eye, Hand, Body, Nerve, Memory, Energy")
    print("="*40 + "\n")

# 🔍 Windows 事件循环策略
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# 🚀 初始化 FastAPI 应用实例
app = FastAPI(title="Angel System Backend", version="2.2.0")
app.add_event_handler("startup", startup_event)

# 🛡️ CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔗 注册路由 (神经通路)
app.include_router(ws_router)
app.include_router(api_router)

# 🧟‍♂️ 僵尸猎人：尝试清理可能残留的浏览器进程
def kill_zombie_browsers():
    """
    🧟‍♂️ 僵尸猎人：尝试清理可能残留的浏览器进程
    在热更新重启时，旧的浏览器进程可能没关掉。
    这里使用 taskkill 尝试清理。
    """
    try:
        # 仅清理带有特定特征的进程，避免误杀用户浏览器
        # 注意：Playwright 启动的浏览器通常没有明显的窗口标题特征，除非是 headless=False
        # 但我们可以尝试清理 node.exe (Playwright 的驱动)
        subprocess.run("taskkill /F /IM node.exe /T", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
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
    print(f"🚀 Angel Backend 正在启动 (Python {sys.version.split()[0]})...")
    print("✅ 正在监听端口: 8000")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,      
        reload=False,   
        workers=1       
    )