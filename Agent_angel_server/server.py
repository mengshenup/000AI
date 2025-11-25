from fastapi import FastAPI
import uvicorn

# =================================
#  🎉 智能体天使服务器 (Agent Angel Server)
#
#  🎨 代码用途：
#     云端智能体编排与管理服务。
#     在服务器模式下，它负责协调多个 Agent_angel_client 或提供更强大的云端 AI 能力。
#
#  💡 易懂解释：
#     这是天使军团的指挥官！💂‍♂️ 它可以指挥成千上万个小天使，或者处理那些小天使处理不了的超级难题！
# =================================

app = FastAPI(title="Agent Angel Server (Cloud)")

@app.get("/")
def read_root():
    return {"message": "Agent Angel Server is running. Ready to orchestrate."}

if __name__ == "__main__":
    # 默认运行在 8081 端口，避免与本地 Agent (8000) 和 Web Server (8080) 冲突
    uvicorn.run(app, host="0.0.0.0", port=8081)
