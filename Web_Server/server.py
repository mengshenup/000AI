from fastapi import FastAPI
import uvicorn

# =================================
#  🎉 网站服务端 (Web Server)
#
#  🎨 代码用途：
#     云端轻量级服务器，负责静态资源分发、用户鉴权、多端同步信令。
#
#  💡 易懂解释：
#     这是 Angel 的云端基地！☁️ 虽然它不负责思考（那是本地客户端的事），但它负责连接全世界的 Angel 用户！
# =================================

app = FastAPI(title="Angel Cloud Server")

@app.get("/")
def read_root():
    return {"message": "Welcome to Angel Cloud Server! Please use the Web_Client for AI features."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
