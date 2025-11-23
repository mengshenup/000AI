import sys
import os
from dotenv import load_dotenv

# =================================
#  🎉 主程序入口 (Main)
#
#  🎨 代码用途：
#     初始化 FastAPI 应用，配置中间件、路由和事件循环策略。
#
#  💡 易懂解释：
#     这是服务器的“大脑”！它负责把所有的零件（路由、配置、工具）组装在一起，然后按下启动按钮，让整个系统活过来！🧠
#
#  ⚠️ 警告：
#     请勿删除 Windows 事件循环策略配置，否则 Playwright 会罢工。
# =================================

# 🚫 禁止生成 .pyc 文件，保持目录清爽
sys.dont_write_bytecode = True

# 📥 加载 .env 文件中的环境变量
load_dotenv()
import asyncio
import warnings
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.websocket_handler import router as ws_router

# =================================
#  🎉 忽略警告 ()
#
#  🎨 代码用途：
#     屏蔽 Python 3.14+ 可能出现的 DeprecationWarning 警告。
#
#  💡 易懂解释：
#     让控制台清静一点，别老弹一些无关紧要的黄色警告字，看着心烦！🤫
#
#  ⚠️ 警告：
#     只屏蔽了 DeprecationWarning，其他严重错误还是会显示的。
# =================================
# 🔇 过滤掉 DeprecationWarning 类型的警告，保持控制台整洁
warnings.filterwarnings("ignore", category=DeprecationWarning)

# 🛣️ 初始化 FastAPI 应用
app = FastAPI(
    title="Angel Server",
    description="Angel 智能助手后端服务",
    version="1.0.0"
)

# 📢 注册启动事件 (热重载时也会触发)
@app.on_event("startup")
async def startup_event():
    print("\n" + "="*40)
    print("✨ Angel Server 应用核心已加载 (v1.3.0)")
    print("✨ 中文日志系统: 在线")
    print("="*40 + "\n")

# =================================
#  🎉 Windows 事件循环策略配置 ()
#
#  🎨 代码用途：
#     在 Windows 平台上设置 asyncio 的事件循环策略为 WindowsProactorEventLoopPolicy。
#
#  💡 易懂解释：
#     Windows 系统的“交通规则”和 Linux 不一样。这里专门告诉程序：“你在 Windows 上跑，要遵守 Windows 的规矩”，否则 Playwright 这种浏览器自动化工具会报错哦！🚦
#
#  ⚠️ 警告：
#     仅在 Windows 系统下生效。Linux/Mac 不需要这个。
# =================================
# 🔍 检查当前系统是否为 Windows
if sys.platform.startswith("win"):
    # 🛠️ 如果是 Windows，强制使用 ProactorEventLoopPolicy，这是 Playwright 在 Windows 上运行所必需的
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# 🚀 初始化 FastAPI 应用实例，设置标题
app = FastAPI(title="Angel System Backend")

# =================================
#  🎉 CORS 跨域配置 ()
#
#  🎨 代码用途：
#     允许来自任何源 (Origins) 的前端请求访问此后端 API。
#
#  💡 易懂解释：
#     打开大门！不管你是从 localhost:5500 来的，还是从别的网页来的，我都允许你跟我说话，大家都是好朋友！🤝
#
#  ⚠️ 警告：
#     allow_origins=["*"] 在生产环境中不安全，但在本地开发时非常方便。
# =================================
# 🛡️ 添加中间件来处理跨域资源共享 (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 🌍 允许所有来源的请求
    allow_credentials=True, # 🎫 允许携带凭证（如 Cookies）
    allow_methods=["*"], # 📨 允许所有 HTTP 方法 (GET, POST, etc.)
    allow_headers=["*"], # 📋 允许所有 HTTP 头
)

# =================================
#  🎉 注册路由 ()
#
#  🎨 代码用途：
#     将 WebSocket 相关的路由处理逻辑挂载到主应用上。
#
#  💡 易懂解释：
#     把“接电话”的部门（WebSocket 处理器）正式编入公司（App）架构里，准备开始接单啦！📞
#
#  ⚠️ 警告：
#     如果有新的路由模块，也需要在这里 include。
# =================================
# 🔗 将 WebSocket 路由模块包含到主应用中
app.include_router(ws_router)

# =================================
#  🎉 主程序入口 ()
#
#  🎨 代码用途：
#     当直接运行此文件时，启动 Uvicorn 服务器。
#
#  💡 易懂解释：
#     按下了启动按钮！服务器开始运转，监听 8000 端口，等待客户端连接，随时待命！🚀
#
#  ⚠️ 警告：
#     reload=False 是因为我们在外部使用 run.py 来进行更高级的进程管理和重启。
# =================================
# 🏁 判断是否直接运行此脚本
if __name__ == "__main__":
    # 📢 打印启动信息，包含当前 Python 版本
    print(f"🚀 Angel Backend 正在启动 (Python {sys.version.split()[0]})...")
    print("✅ 正在监听端口: 8000")
    
    # 🔌 启动 Uvicorn 异步服务器
    uvicorn.run(
        app, 
        host="0.0.0.0", # 🌐 监听所有网络接口
        port=8000,      # 🚪 监听 8000 端口
        reload=False,   # 🔄 关闭 Uvicorn 自带的热重载（由 run.py 接管）
        workers=1       # 👷 使用 1 个工作进程
    )