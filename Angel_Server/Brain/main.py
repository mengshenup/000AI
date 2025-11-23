import uvicorn
import os
import sys

# =================================
#  🎉 主程序入口 (Brain/main.py)
#
#  🎨 代码用途：
#     负责启动和监控 FastAPI 应用进程。
#     (原 Nerve/server_runner.py)
# =================================

sys.dont_write_bytecode = True

if __name__ == "__main__":
    print(f"\n🚀 Angel Server (v2.2.0) 正在启动...")
    print(f"📂 正在监听目录: {os.getcwd()}")
    
    uvicorn.run(
        "Nerve.fastapi_app:app",
        host="0.0.0.0", 
        port=8000,      
        reload=True,
        reload_dirs=["."],  # 🔄 监听当前目录下所有文件的变动
        reload_excludes=["Memorybank", "Memorybank/*", "*.log", "*.tmp", ".git", "*.md", "*.bat", "*.txt"], # 🚫 排除频繁变动的目录和文档
        workers=1       
    )