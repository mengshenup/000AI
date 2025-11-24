import sys
import os
import uvicorn

# =================================
#  🎉 本地智能体启动器 (Local Agent Launcher)
#
#  🎨 代码用途：
#     启动运行在用户设备上的 Python 后端，负责 AI 推理、浏览器控制等高计算任务。
#
#  💡 易懂解释：
#     这是 Angel 的“灵魂”！👻 运行它，你的电脑里就住进了一个小天使，可以帮你操作浏览器、陪你聊天啦！
#
#  ⚠️ 警告：
#     必须确保 8000 端口未被占用。
# =================================

# 将 Client_Core 加入 Python 搜索路径，解决模块导入问题
current_dir = os.path.dirname(os.path.abspath(__file__))
core_dir = os.path.join(current_dir, "Client_Core")
sys.path.append(core_dir)

if __name__ == "__main__":
    print(f"\n🚀 Angel Local Agent (Web_Client) 正在启动...")
    print(f"📂 核心模块路径: {core_dir}")
    
    # 启动 FastAPI 服务
    # 注意: app 字符串路径需要根据实际运行目录调整
    # 这里假设我们在 Web_Client 目录下运行，且 Client_Core 是包
    uvicorn.run(
        "Client_Core.Nerve.fastapi_app:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True,
        reload_dirs=[core_dir]
    )
