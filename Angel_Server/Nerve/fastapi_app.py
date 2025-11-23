import sys
import os
from dotenv import load_dotenv

# =================================
#  🎉 主程序入口 (Nerve/fastapi_app.py)
#
#  🎨 代码用途：
#     初始化 FastAPI 应用，配置中间件、路由和事件循环策略。
# =================================

sys.dont_write_bytecode = True
load_dotenv()

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