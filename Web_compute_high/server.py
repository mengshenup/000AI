import sys
import os
import json
import platform
import subprocess
import hmac
import hashlib
import base64
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# =================================
#  🎉 Web Compute High Server (Web端高算力节点)
#
#  🎨 代码用途：
#     负责处理高并发、高安全性的业务逻辑，如用户登录、数据存储、应用列表分发。
#     这是 "Web端" 的后端部分，与 "Agent端" (Agent_angel_server) 分离。
#
#  💡 易懂解释：
#     这是 Angel 的“管家”！🎩 他负责看门（登录）、记账（存数据）、整理房间（管理应用列表）。
#     虽然现在是用 Python 写的，但为了服务 1 亿用户，未来建议用 Go 语言重写哦！🚀
# =================================

# 📂 路径配置
CURRENT_DIR = Path(__file__).parent.absolute()
WORKSPACE_DIR = CURRENT_DIR.parent
WEB_LOW_DIR = WORKSPACE_DIR / "Web_compute_low"
MEMORY_DIR = CURRENT_DIR / "Memorybank"

# 确保目录存在
MEMORY_DIR.mkdir(exist_ok=True)

# 💾 数据文件路径
DATA_FILE = MEMORY_DIR / "memory_window.json"
KEY_FILE = MEMORY_DIR / "memory_key.json"

# 🔑 密钥配置 (生产环境应从环境变量加载)
SECRET_KEY = "angel_secret_2025"

app = FastAPI(title="Angel Web Compute High", version="1.0.0")

# 🛡️ CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🏗️ 数据模型
class AppState(BaseModel):
    data: dict
    user_id: str = "default"

class LoginRequest(BaseModel):
    account: str
    password: str

# 🛠️ 工具函数：文件读写
def load_json(path: Path, default=None):
    if not path.exists():
        return default if default is not None else {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ 读取文件失败 {path}: {e}")
        return default if default is not None else {}

def save_json(path: Path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"❌ 保存文件失败 {path}: {e}")
        return False

# 🛠️ 工具函数：Token 生成
def create_token(user_id: str):
    # 简单的签名 Token: user_id.timestamp.signature
    timestamp = str(int(time.time()))
    msg = f"{user_id}.{timestamp}"
    signature = hmac.new(
        SECRET_KEY.encode(), 
        msg.encode(), 
        hashlib.sha256
    ).hexdigest()
    return f"{msg}.{signature}"

# =================================
#  🎉 路由定义
# =================================

@app.get("/")
async def root():
    return {"message": "Angel Web Compute High is running! 🚀"}

@app.post("/login")
async def login(req: LoginRequest):
    # =================================
    #  🎉 用户登录
    # =================================
    keys_db = load_json(KEY_FILE, default={
        "admin": {"password": "admin", "keys": [{"name": "Default Key", "value": "sk-..."}]}
    })
    
    user = keys_db.get(req.account)
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
        
    if user["password"] != req.password:
        raise HTTPException(status_code=401, detail="密码错误")
        
    # 生成 Token
    token = create_token(req.account)
    
    return {"status": "ok", "keys": user["keys"], "token": token}

@app.post("/save_layout")
async def save_layout(state: AppState):
    # =================================
    #  🎉 保存布局
    # =================================
    current_data = load_json(DATA_FILE, default={})
    current_data[state.user_id] = state.data
    success = save_json(DATA_FILE, current_data)
    return {"status": "ok" if success else "error"}

@app.get("/load_memory")
async def load_memory(file: str = "memory_window.json", user_id: str = "default"):
    # =================================
    #  🎉 读取布局
    # =================================
    # 注意：这里 file 参数暂时保留兼容性，但实际只读 DATA_FILE
    all_data = load_json(DATA_FILE, default={})
    return all_data.get(user_id, {})

@app.get("/system_info")
async def get_system_info():
    # =================================
    #  🎉 获取系统信息
    # =================================
    cpu_name = platform.processor()
    if platform.system() == "Windows":
        try:
            command = "wmic cpu get name"
            output = subprocess.check_output(command, shell=True).decode().strip()
            lines = output.split('\n')
            if len(lines) > 1:
                cpu_name = lines[1].strip()
        except:
            pass

    return {
        "cpu_model": cpu_name,
        "system": f"{platform.system()} {platform.release()}",
        "architecture": platform.machine()
    }

@app.get("/get_apps_list")
async def get_apps_list():
    # =================================
    #  🎉 获取应用列表
    # =================================
    apps_dir = WEB_LOW_DIR / "js" / "apps"
    system_apps_dir = WEB_LOW_DIR / "js" / "apps_system"
    
    def scan_dir(directory):
        files = []
        if not directory.exists():
            return files
        for f in directory.glob("*.js"):
            try:
                with open(f, "r", encoding="utf-8") as file_obj:
                    line_count = sum(1 for _ in file_obj)
                files.append({"name": f.name, "lines": line_count})
            except:
                pass
        return files

    return {
        "apps": scan_dir(apps_dir),
        "system_apps": scan_dir(system_apps_dir),
        "system_core": [] # 暂时留空
    }

if __name__ == "__main__":
    print(f"\n🚀 Angel Web Compute High (Port 9000) 正在启动...")
    uvicorn.run(app, host="0.0.0.0", port=9000)
