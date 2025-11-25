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
from fastapi import FastAPI, HTTPException, Header # 🚀 FastAPI 框架
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
#  🎉 初始化系统 (已移除)
#
#  🎨 说明：
#     系统初始化逻辑已迁移至 init_memory.bat 脚本。
#     请在部署前或维护时手动运行该脚本来更新应用列表和密钥。
# =================================

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

class SyncBatchRequest(BaseModel):
    # =================================
    #  🎉 批量同步请求
    # =================================
    apps: list # 📦 应用列表片段

@app.post("/admin/sync_batch")
async def sync_batch(req: SyncBatchRequest, x_angel_key: str = Header(None)):
    # =================================
    #  🎉 接收同步批次 (只更新内存)
    #
    #  🎨 代码用途：
    #     接收前端分批发送的应用数据，更新到内存中，不立即写盘。
    #     解决 1万+ 应用导致 IO 阻塞的问题。
    # =================================
    
    # 1. 验证权限
    users = load_json(KEY_FILE, {})
    admin_keys = [k.get("value") for k in users.get("admin", {}).get("keys", [])]
    if x_angel_key != SECRET_KEY and x_angel_key not in admin_keys:
        raise HTTPException(status_code=403, detail="🚫 权限不足")

    # 2. 读取数据 (注意：高并发下需加锁，此处简化)
    # 为了性能，这里我们假设 server 是单进程运行，或者依赖 OS 的文件锁
    # 更好的做法是使用全局变量缓存 data，但为了无状态设计，我们还是读文件
    # 优化：由于是分批发送，我们暂时只读一次，最后 commit 时再写
    # 但由于 HTTP 是无状态的，我们无法在请求间共享“未保存的 data”
    # 除非使用全局变量。
    
    # 修正策略：使用全局变量缓存待写入的数据？不，这会导致多进程问题。
    # 妥协方案：每次都读写文件确实慢。
    # 改进方案：使用一个临时文件 memory_window.tmp.json 或者 内存缓存。
    # 鉴于这是单机 Python 服务，我们使用全局变量 `_temp_sync_cache`
    
    global _temp_sync_cache
    if _temp_sync_cache is None:
        _temp_sync_cache = load_json(DATA_FILE, {})
        # 确保 default 存在
        if "default" not in _temp_sync_cache:
            _temp_sync_cache["default"] = {"apps": {}, "installedApps": {}}

    # 更新内存缓存
    data = _temp_sync_cache
    updated_count = 0
    
    for user, user_data in data.items():
        if not isinstance(user_data, dict): continue
        if "installedApps" not in user_data: user_data["installedApps"] = {}
        current_installed = user_data["installedApps"]
        
        for app in req.apps:
            app_id = app["id"]
            new_entry = {
                "id": app_id,
                "name": app["name"],
                "version": app["version"],
                "path": app["path"],
                "isSystem": app["isSystem"]
            }
            current_installed[app_id] = new_entry
            updated_count += 1
            
    return {"status": "received", "count": len(req.apps)}

@app.post("/admin/sync_commit")
async def sync_commit(x_angel_key: str = Header(None)):
    # =================================
    #  🎉 提交同步 (写入磁盘)
    # =================================
    
    # 验证权限...
    users = load_json(KEY_FILE, {})
    admin_keys = [k.get("value") for k in users.get("admin", {}).get("keys", [])]
    if x_angel_key != SECRET_KEY and x_angel_key not in admin_keys:
        raise HTTPException(status_code=403, detail="🚫 权限不足")

    global _temp_sync_cache
    if _temp_sync_cache is None:
        return {"status": "no_changes", "msg": "没有待提交的更改"}

    # 写入磁盘
    if save_json(DATA_FILE, _temp_sync_cache):
        _temp_sync_cache = None # 清空缓存
        return {"status": "success", "msg": "同步完成，已写入磁盘"}
    else:
        raise HTTPException(status_code=500, detail="保存失败")

# 全局缓存变量
_temp_sync_cache = None

if __name__ == "__main__":
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
    #     从 memory_window.json 中读取已注册的应用列表。
    #     不再直接扫描文件系统，支持分布式部署。
    #
    #  💡 易懂解释：
    #     管家，把账本上的玩具清单念给我听听！📖
    # =================================
    
    # 读取默认用户的配置作为基准
    data = load_json(DATA_FILE, {})
    default_apps = data.get("default", {}).get("installedApps", {})
    
    apps = []
    system_apps = []
    system_core = [] # 核心组件暂不通过此接口动态下发，通常硬编码在 loader.js

    for app_id, info in default_apps.items():
        item = {
            "filename": f"{app_id}.js",
            "name": info.get("name", app_id),
            "version": info.get("version", "1.0.0"),
            "line_count": 0 # 无法统计远程文件行数
        }
        
        if info.get("isSystem"):
            system_apps.append(item)
        else:
            apps.append(item)

    return {
        "apps": apps,
        "system_apps": system_apps,
        "system_core": system_core
    }

# 🗑️ 已移除旧的 sync_apps 接口，请使用 sync_batch + sync_commit
# @app.post("/admin/sync_apps") ...

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
