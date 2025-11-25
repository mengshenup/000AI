import sys
import os
import uvicorn

# =================================
#  🎉 智能体启动器 (Agent Launcher)
#
#  🎨 代码用途：
#     启动 Agent_Angel_Server 中的核心逻辑。
#     虽然文件在 Web_Compute 下，但它实际上是调用 Agent_Angel_Server 的代码。
#
#  💡 易懂解释：
#     这是 Angel 的“灵魂”！👻 运行它，你的电脑里就住进了一个小天使，可以帮你操作浏览器、陪你聊天啦！
#
#  ⚠️ 警告：
#     必须确保 8000 端口未被占用。
# =================================

# 将 Agent_angel_client 加入 Python 搜索路径
current_dir = os.path.dirname(os.path.abspath(__file__))
workspace_dir = os.path.dirname(current_dir)
agent_client_dir = os.path.join(workspace_dir, "Agent_angel_client")
sys.path.append(agent_client_dir)

if __name__ == "__main__":
    print(f"\n🚀 Angel Agent Client (Local Mode) 正在启动...")
    print(f"📂 核心模块路径: {agent_client_dir}")
    
    # 启动 FastAPI 服务
    # 注意: 我们现在从 Web_compute_low 目录运行，但代码在 Agent_angel_client
    # 由于我们将 Agent_angel_client 加入了 sys.path，我们可以直接 import Nerve
    uvicorn.run(
        "Nerve.fastapi_app:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True,
        reload_dirs=[agent_client_dir]
    )    # 由于我们将 Agent_Angel_Server 加入了 sys.path，我们可以直接 import Nerve
    uvicorn.run(
        "Nerve.fastapi_app:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True,
        reload_dirs=[agent_server_dir]
    )
