import sys # 🖥️ 系统相关参数
import os # 📂 操作系统接口
import json # 📄 JSON 处理库
import platform # 🖥️ 平台信息库
import subprocess # 🐚 子进程管理
import hmac # 🔐 HMAC 签名算法
import hashlib # 🔐 哈希算法
import base64 # 🧬 Base64 编码
import time # ⏱️ 时间模块
from pathlib import Path # 🛣️ 面向对象的路径库
from fastapi import FastAPI, HTTPException # 🚀 FastAPI 框架
from fastapi.middleware.cors import CORSMiddleware # 🛡️ CORS 中间件
from pydantic import BaseModel # 🏗️ 数据验证模型
import uvicorn # 🦄 ASGI 服务器
from dotenv import load_dotenv # 🔑 环境变量加载

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
#
#  ⚠️ 警告：
#     当前使用 JSON 文件存储数据，仅适用于单机/小规模部署。大规模生产环境请迁移至 Redis/MySQL。
# =================================

# 📂 路径配置
CURRENT_DIR = Path(__file__).parent.absolute() # 📍 当前脚本目录
WORKSPACE_DIR = CURRENT_DIR.parent # 📍 工作区根目录
WEB_LOW_DIR = WORKSPACE_DIR / "Web_compute_low" # 📍 前端静态资源目录
MEMORY_DIR = CURRENT_DIR / "Memorybank" # 📍 数据存储目录

# 确保目录存在
MEMORY_DIR.mkdir(exist_ok=True) # 📁 创建存储目录

# 💾 数据文件路径
DATA_FILE = MEMORY_DIR / "memory_window.json" # 💾 窗口状态数据
KEY_FILE = MEMORY_DIR / "memory_key.json" # 🔑 用户密钥数据

# 🔑 密钥配置 (生产环境应从环境变量加载)
SECRET_KEY = "angel_secret_2025" # 🔐 用于签名的私钥

# =================================
#  🎉 初始化认证系统 (无参数)
#
#  🎨 代码用途：
#     确保 memory_key.json 存在，并包含默认的 admin 账号。
#     尝试从 .env 文件读取 GEMINI_API_KEY 并注入到 admin 账号中。
#
#  💡 易懂解释：
#     管家上岗前先检查钥匙柜！🔑
#     如果没有管理员账号，就赶紧造一个，顺便把保险箱（.env）里的备用钥匙挂上去。
# =================================
def init_auth_system():
    # 1. 加载环境变量
    env_path = MEMORY_DIR / ".env"
    load_dotenv(env_path)
    api_key = os.getenv("GEMINI_API_KEY", "") # 🔑 获取 API Key，默认为空

    # 2. 读取或创建用户库
    users = load_json(KEY_FILE, {})
    
    # 3. 确保 admin 存在
    if "admin" not in users:
        print("🆕 初始化默认管理员账号: admin")
        users["admin"] = {
            "password": "", # 🔑 默认无密码
            "keys": []
        }
    
    # 4. 注入/更新 Key (如果 admin 是新格式)
    if isinstance(users["admin"], dict):
        # 检查是否已有该 Key，避免重复
        has_key = any(k.get("value") == api_key for k in users["admin"].get("keys", []))
        if api_key and not has_key:
            users["admin"]["keys"] = users["admin"].get("keys", [])
            users["admin"]["keys"].append({
                "name": "System Key (.env)",
                "value": api_key
            })
            print("🔑 已将 .env 中的 Key 注入 admin 账号")
    
    # 5. 保存更改
    save_json(KEY_FILE, users)

# 初始化认证
init_auth_system()

app = FastAPI(title="Angel Web Compute High", version="1.0.0") # 📱 创建 FastAPI 应用

# 🛡️ CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 🌐 允许所有来源
    allow_credentials=True, # 🔑 允许携带凭证
    allow_methods=["*"], # 🛠️ 允许所有方法
    allow_headers=["*"], # 📨 允许所有头信息
)

# 🏗️ 数据模型
class AppState(BaseModel):
    # =================================
    #  🎉 应用状态模型
    #
    #  🎨 代码用途：
    #     定义保存应用状态时的请求体结构。
    # =================================
    data: dict # 📦 状态数据
    user_id: str = "default" # 👤 用户ID

class LoginRequest(BaseModel):
    # =================================
    #  🎉 登录请求模型
    #
    #  🎨 代码用途：
    #     定义用户登录时的请求体结构。
    # =================================
    account: str # 👤 账号
    password: str # 🔑 密码

# 🛠️ 工具函数：文件读写
def load_json(path: Path, default=None):
    # =================================
    #  🎉 加载 JSON 文件 (文件路径, 默认值)
    #
    #  🎨 代码用途：
    #     安全地读取 JSON 文件，如果文件不存在或损坏，返回默认值。
    #
    #  💡 易懂解释：
    #     翻开账本查账！📖 如果账本丢了，就拿一本新的（默认值）。
    # =================================
    if not path.exists():
        return default if default is not None else {} # 🤷‍♀️ 文件不存在
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f) # 📖 读取并解析
    except Exception as e:
        print(f"❌ 读取文件失败 {path}: {e}") # ❌ 错误日志
        return default if default is not None else {} # 🛡️ 异常返回默认值

def save_json(path: Path, data):
    # =================================
    #  🎉 保存 JSON 文件 (文件路径, 数据)
    #
    #  🎨 代码用途：
    #     将数据序列化并写入 JSON 文件。
    #
    #  💡 易懂解释：
    #     记账啦！✍️ 把数据整整齐齐写进本子里。
    # =================================
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False) # 💾 写入文件
        return True # ✅ 成功
    except Exception as e:
        print(f"❌ 保存文件失败 {path}: {e}") # ❌ 错误日志
        return False # 🚫 失败

# 🛠️ 工具函数：Token 生成
def create_token(user_id: str):
    # =================================
    #  🎉 生成令牌 (用户ID)
    #
    #  🎨 代码用途：
    #     生成带有时间戳和签名的 Token，用于用户身份验证。
    #     格式: user_id.timestamp.signature
    #
    #  💡 易懂解释：
    #     发通行证啦！🎫 盖上时间戳和防伪印章（签名），凭票入场！
    # =================================
    # 简单的签名 Token: user_id.timestamp.signature
    timestamp = str(int(time.time())) # ⏱️ 当前时间戳
    msg = f"{user_id}.{timestamp}" # 📦 消息体
    signature = hmac.new(
        SECRET_KEY.encode(), 
        msg.encode(), 
        hashlib.sha256
    ).hexdigest() # 🔐 计算签名
    return f"{msg}.{signature}" # 🔙 返回完整 Token

# =================================
#  🎉 路由定义
# =================================

@app.get("/")
async def root():
    # =================================
    #  🎉 根路径检查 (无参数)
    #
    #  🎨 代码用途：
    #     健康检查接口。
    # =================================
    return {"message": "Angel Web Compute High is running! 🎩"}

@app.post("/login")
async def login(req: LoginRequest):
    # =================================
    #  🎉 用户登录 (登录请求)
    #
    #  🎨 代码用途：
    #     验证用户账号密码。支持新旧两种存储格式。
    #     验证通过后返回 Token 和 API Keys。
    #
    #  💡 易懂解释：
    #     有人敲门！🚪 “口令？” “芝麻开门！”
    #     如果是新朋友，就直接发一张新身份证（注册）；如果是老朋友，就检查密码对不对。
    # =================================
    users = load_json(KEY_FILE, {}) # 📖 读取用户库
    
    # 自动注册逻辑 (简化版 - 默认使用新格式)
    if req.account not in users:
        users[req.account] = {
            "password": req.password,
            "keys": []
        } # 📝 记录新用户 (新格式)
        save_json(KEY_FILE, users) # 💾 保存
        print(f"🆕 新用户注册: {req.account}")
    
    # 获取存储的密码和 Keys
    stored_user = users[req.account]
    stored_password = ""
    user_keys = []

    if isinstance(stored_user, dict):
        # 新格式: {"password": "...", "keys": [...]}
        stored_password = stored_user.get("password", "")
        user_keys = stored_user.get("keys", [])
    else:
        # 旧格式: "password"
        stored_password = stored_user
        user_keys = []

    # 验证密码
    if stored_password != req.password:
        raise HTTPException(status_code=401, detail="密码错误") # ❌ 密码错误
    
    # 生成 Token
    token = create_token(req.account) # 🎫 签发 Token
    
    # 返回成功信息，包含 Keys
    return {
        "status": "success", 
        "token": token, 
        "user_id": req.account,
        "keys": user_keys # 🗝️ 返回用户的 API Keys
    }

@app.post("/save_memory")
async def save_memory(state: AppState):
    # =================================
    #  🎉 保存记忆 (应用状态)
    #
    #  🎨 代码用途：
    #     保存用户的应用窗口状态（如位置、大小、打开的应用）。
    #
    #  💡 易懂解释：
    #     管家，帮我把房间现在的样子拍个照（保存状态）！📸 下次我回来还要这样。
    # =================================
    data = load_json(DATA_FILE, {}) # 📖 读取现有数据
    data[state.user_id] = state.data # 📝 更新用户数据
    if save_json(DATA_FILE, data):
        return {"status": "success"} # ✅ 保存成功
    else:
        raise HTTPException(status_code=500, detail="保存失败") # ❌ 保存失败

@app.get("/load_memory")
async def load_memory(user_id: str = "default"):
    # =================================
    #  🎉 读取记忆 (用户ID)
    #
    #  🎨 代码用途：
    #     获取指定用户的应用窗口状态。
    #
    #  💡 易懂解释：
    #     管家，把我的房间恢复原样！✨
    # =================================
    data = load_json(DATA_FILE, {}) # 📖 读取数据
    return data.get(user_id, {}) # 🔙 返回用户数据，无则返回空

@app.get("/get_apps_list")
async def get_apps_list():
    # =================================
    #  🎉 获取应用列表 (无参数)
    #
    #  🎨 代码用途：
    #     扫描 Web_compute_low 目录下的 JS 文件，自动发现并注册应用。
    #     返回应用列表、系统应用列表和核心组件列表。
    #
    #  💡 易懂解释：
    #     管家，看看家里都有哪些玩具（APP）可以玩？🧸
    #     把它们整理成清单给我看看！
    # =================================
    apps = [] # 📦 普通应用
    system_apps = [] # 🛠️ 系统应用
    system_core = [] # ⚙️ 核心组件

    # 扫描路径配置
    paths = {
        "apps": WEB_LOW_DIR / "js" / "apps",
        "system_apps": WEB_LOW_DIR / "js" / "apps_system",
        "system_core": WEB_LOW_DIR / "js" / "system"
    }

    for category, path in paths.items():
        if not path.exists(): continue # 🚫 目录不存在跳过
        
        for file in path.glob("*.js"): # 🔍 遍历 JS 文件
            try:
                # 简单的元数据提取 (实际应解析文件头注释)
                app_name = file.stem # 🏷️ 文件名作为应用名
                app_version = "1.0.0" # 🏷️ 默认版本
                
                # 读取文件统计行数
                with open(file, "r", encoding="utf-8") as f:
                    line_count = len(f.readlines()) # 📏 统计行数

                item = {
                    "filename": file.name,
                    "name": app_name,
                    "version": app_version,
                    "line_count": line_count
                }

                if category == "apps":
                    apps.append(item)
                elif category == "system_apps":
                    system_apps.append(item)
                elif category == "system_core":
                    system_core.append(item)
            except Exception as e:
                print(f"⚠️ 解析应用失败 {file}: {e}")

    return {
        "apps": apps,
        "system_apps": system_apps,
        "system_core": system_core
    } # 🔙 返回分类列表

if __name__ == "__main__":
    # =================================
    #  🎉 启动服务器 (无参数)
    #
    #  🎨 代码用途：
    #     启动 Uvicorn 服务器，监听 9000 端口。
    #
    #  💡 易懂解释：
    #     管家上班啦！🎩 站在门口（端口 9000）准备迎接主人！
    # =================================
    uvicorn.run(app, host="0.0.0.0", port=9000)
