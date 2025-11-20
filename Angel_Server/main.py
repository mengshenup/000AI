import sys
import asyncio
import warnings
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.websocket_handler import router as ws_router

# === 🔇 屏蔽烦人的警告信息 ===
# 这里的警告是 Python 3.14 提示未来版本变动，目前必须使用该策略，直接忽略即可
warnings.filterwarnings("ignore", category=DeprecationWarning)

# ==================================================================
# 🟢 核心环境配置 (兼容 Windows Playwright)
# ==================================================================
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI(title="Angel System Backend")

# === 1. 允许跨域 (CORS) ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === 2. 注册 WebSocket 路由 ===
app.include_router(ws_router)

# ==================================================================
# 🚀 启动入口
# ==================================================================
if __name__ == "__main__":
    print(f"🚀 Angel Backend 正在启动 (Python {sys.version.split()[0]})...")
    print("✅ 正在监听端口: 8000")
    
    # 启动 Uvicorn 服务器
    # 注意：reload 设为 False，因为外部的 run.py 负责文件监控和重启
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        reload=False, 
        workers=1
    )