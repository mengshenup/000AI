import uvicorn
import os
import sys

# =================================
#  🎉 Angel Server 启动器 (优化版)
#
#  🎨 代码用途：
#     使用 Uvicorn 的内置热重载机制启动服务器。
#
#  💡 易懂解释：
#     这是服务器的“引擎开关”！它不仅启动服务器，还开启了“自动感应”模式——只要你改了代码，它就会自动重启，而且比旧版本更省力、更灵敏！🏎️
#
#  ⚠️ 警告：
#     reload=True 模式下，不要在代码里写死循环，否则电脑会起飞。
# =================================

# 🚫 禁止生成 .pyc 文件，保持目录清爽
sys.dont_write_bytecode = True

if __name__ == "__main__":
    # 📢 打印启动信息
    print(f"🚀 Angel Server (Optimized Reloader) starting...")
    print(f"📂 Watching directory: {os.getcwd()}")
    
    # 🔌 使用 uvicorn.run 直接启动，开启 reload=True
    # 这会自动使用高效的文件系统监听 (watchfiles)，避免轮询造成的卡顿
    uvicorn.run(
        "main:app",
        host="0.0.0.0", # 🌐 监听所有网络接口
        port=8000,      # 🚪 监听 8000 端口
        reload=True,    # 🔄 开启热重载
        reload_dirs=["."], # 📂 监听当前目录
        reload_excludes=["user_data", ".git", "__pycache__", "*.log"], # 🚫 排除不需要监听的目录
        workers=1       # 👷 使用 1 个工作进程
    )