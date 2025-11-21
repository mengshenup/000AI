import uvicorn
import os
import sys

# 禁止生成 .pyc 文件
sys.dont_write_bytecode = True

# ---------------------------------------------------------------- #
#  Angel Server 启动器 (优化版)
#
#  代码用处：
#     使用 Uvicorn 的内置热重载机制启动服务器。
#
#  易懂解释：
#     这是服务器的“引擎开关”。它不仅启动服务器，还开启了“自动感应”模式——
#     只要你改了代码，它就会自动重启，而且比旧版本更省力、更灵敏。
# ---------------------------------------------------------------- #

if __name__ == "__main__":
    print(f"🚀 Angel Server (Optimized Reloader) starting...")
    print(f"📂 Watching directory: {os.getcwd()}")
    
    # 使用 uvicorn.run 直接启动，开启 reload=True
    # 这会自动使用高效的文件系统监听 (watchfiles)，避免轮询造成的卡顿
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["."],
        reload_excludes=["user_data", ".git", "__pycache__", "*.log"],
        workers=1
    )