import json # 📄 JSON 处理库
import hmac # 🔐 HMAC 签名算法
import hashlib # 🔐 哈希算法
import time # ⏱️ 时间模块
import platform # 🖥️ 系统信息
from pathlib import Path # 🛣️ 面向对象的路径库
from fastapi import FastAPI, HTTPException, Header # 🚀 FastAPI 框架
from fastapi.middleware.cors import CORSMiddleware # 🛡️ CORS 中间件
from pydantic import BaseModel # 🏗️ 数据验证模型
import uvicorn # 🦄 ASGI 服务器
from init_memory import init_memory_window, get_default_data # 🛠️ 导入初始化工具 (同目录导入)

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
# 🧱 [2025-12-17] 修复: server.py 移动到 staff/ 后路径调整
CURRENT_DIR = Path(__file__).parent.absolute() # 📍 当前脚本目录 (staff/)
PROJECT_DIR = CURRENT_DIR.parent # 📍 项目根目录 (Web_compute_high/)
WORKSPACE_DIR = PROJECT_DIR.parent # 📍 工作区根目录
WEB_LOW_DIR = WORKSPACE_DIR / "Web_compute_low" # 📍 前端静态资源目录
MEMORY_DIR = PROJECT_DIR / "Memorybank" # 📍 数据存储目录 (在项目根目录下)

# 确保目录存在
MEMORY_DIR.mkdir(exist_ok=True) # 📁 创建存储目录

# 🛠️ 启动时检查并初始化数据文件
init_memory_window(force=False)

# 💾 数据文件路径
DATA_FILE = MEMORY_DIR / "memory_window.json" # 💾 窗口状态数据
KEY_FILE = MEMORY_DIR / "memory_key.json" # 🔑 用户密钥数据

# 🔑 密钥配置 (生产环境应从环境变量加载)
SECRET_KEY = "angel_secret_2025" # 🔐 用于签名的私钥

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
    #  🎉 应用状态模型 (无参数)
    #
    #  🎨 代码用途：
    #     定义保存应用状态时的请求体结构，用于 Pydantic 数据验证。
    #
    #  💡 易懂解释：
    #     这是一个“状态盒子”！📦 里面装着用户 ID 和他的所有宝贝数据。
    #
    #  ⚠️ 警告：
    #     data 字段是字典类型，如果数据量过大，传输和解析可能会变慢。
    # =================================
    data: dict # 📦 状态数据
    user_id: str = "default" # 👤 用户ID

class LoginRequest(BaseModel):
    # =================================
    #  🎉 登录请求模型 (无参数)
    #
    #  🎨 代码用途：
    #     定义用户登录时的请求体结构，包含账号和密码。
    #
    #  💡 易懂解释：
    #     这是一张“通行证申请表”！📝 上面写着你的名字和暗号。
    #
    #  ⚠️ 警告：
    #     密码在传输过程中应使用 HTTPS 加密，否则有明文泄露风险。
    # =================================
    account: str # 👤 账号
    password: str # 🔑 密码

class UpdateKeysRequest(BaseModel):
    # =================================
    #  🎉 更新密钥请求 (无参数)
    #
    #  🎨 代码用途：
    #     定义更新用户密钥时的请求体结构。
    #
    #  💡 易懂解释：
    #     这是“配钥匙申请单”！🔑 告诉管家我要加几把新钥匙。
    # =================================
    account: str # 👤 账号
    keys: list # 🗝️ 新的密钥列表

class SyncBatchRequest(BaseModel):
    # =================================
    #  🎉 批量同步请求 (无参数)
    #
    #  🎨 代码用途：
    #     定义批量同步应用列表时的请求体结构。
    #
    #  💡 易懂解释：
    #     这是一个“大包裹”！📦 里面装了一堆需要更新的应用信息。
    #
    #  ⚠️ 警告：
    #     apps 列表如果过长，可能会导致请求超时，建议分批发送。
    # =================================
    apps: list # 📦 应用列表片段

# 全局缓存变量
_temp_sync_cache = None # 🧠 临时同步缓存

# -------------------------------------------------------------------------
# 🛠️ 辅助函数定义 (提前定义以供调用)
# -------------------------------------------------------------------------

def load_json(path: Path, default=None):
    # =================================
    #  🎉 加载 JSON 文件 (文件路径，默认值)
    #
    #  🎨 代码用途：
    #     安全地读取 JSON 文件，如果文件不存在或损坏，返回默认值。
    #
    #  💡 易懂解释：
    #     翻开账本查账！📖 如果账本丢了，就拿一本新的（默认值）。
    #
    #  ⚠️ 警告：
    #     频繁读取大文件会影响 IO 性能，高并发场景建议使用内存缓存。
    # =================================
    if not path.exists(): # 🔍 检查文件是否存在
        return default if default is not None else {} # 🤷‍♀️ 文件不存在返回默认值
    try:
        with open(path, "r", encoding="utf-8") as f: # 📂 打开文件
            return json.load(f) # 📖 读取并解析
    except Exception as e: # 🛡️ 捕获异常
        print(f"❌ 读取文件失败 {path}: {e}") # ❌ 打印错误日志
        return default if default is not None else {} # 🛡️ 异常返回默认值

def save_json(path: Path, data):
    # =================================
    #  🎉 保存 JSON 文件 (文件路径，数据)
    #
    #  🎨 代码用途：
    #     将数据序列化并写入 JSON 文件。
    #
    #  💡 易懂解释：
    #     记账啦！✍️ 把数据整整齐齐写进本子里，防止丢失。
    #
    #  ⚠️ 警告：
    #     写入操作是原子性的吗？在多线程/多进程下可能会有竞争条件。
    # =================================
    try:
        with open(path, "w", encoding="utf-8") as f: # 📂 打开文件准备写入
            json.dump(data, f, indent=4, ensure_ascii=False) # 💾 写入文件
        return True # ✅ 成功
    except Exception as e: # 🛡️ 捕获异常
        print(f"❌ 保存文件失败 {path}: {e}") # ❌ 打印错误日志
        return False # 🚫 失败

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
    #
    #  ⚠️ 警告：
    #     当前签名算法较为简单，生产环境建议使用 JWT (JSON Web Token)。
    # =================================
    timestamp = str(int(time.time())) # ⏱️ 当前时间戳
    msg = f"{user_id}.{timestamp}" # 📦 消息体
    signature = hmac.new(
        SECRET_KEY.encode(), 
        msg.encode(), 
        hashlib.sha256
    ).hexdigest() # 🔐 计算签名
    return f"{msg}.{signature}" # 🔙 返回完整 Token

# -------------------------------------------------------------------------
# 🛣️ 路由定义
# -------------------------------------------------------------------------

@app.post("/admin/sync_batch")
async def sync_batch(req: SyncBatchRequest, x_angel_key: str = Header(None)):
    # =================================
    #  🎉 接收同步批次 (请求体，鉴权Key)
    #
    #  🎨 代码用途：
    #     接收前端分批发送的应用数据，更新到内存中，不立即写盘。
    #     解决 1万+ 应用导致 IO 阻塞的问题。
    #
    #  💡 易懂解释：
    #     就像收快递！📦 快递员把包裹一个个搬进来，先堆在客厅（内存），
    #     等全都搬完了，再统一整理到仓库（硬盘）里去。
    #
    #  ⚠️ 警告：
    #     如果服务器在 commit 之前重启，内存中的数据会丢失。
    # =================================
    
    # 1. 验证权限
    users = load_json(KEY_FILE, {}) # 📖 读取用户配置
    admin_keys = [k.get("value") for k in users.get("admin", {}).get("keys", [])] # 🔑 获取管理员Key列表
    if x_angel_key != SECRET_KEY and x_angel_key not in admin_keys: # 🛡️ 验证Key
        raise HTTPException(status_code=403, detail="🚫 权限不足") # 🚫 抛出权限异常

    global _temp_sync_cache # 🌍 引用全局变量
    if _temp_sync_cache is None: # 🧐 如果缓存为空
        _temp_sync_cache = load_json(DATA_FILE, {}) # 📖 从文件加载初始数据
        # 确保 default 存在
        if "default" not in _temp_sync_cache: # 🧐 检查默认用户
            _temp_sync_cache["default"] = {"apps": {}, "installedApps": {}} # 🆕 初始化默认用户

    # 更新内存缓存
    data = _temp_sync_cache # 📦 获取缓存引用
    updated_count = 0 # 🔢 计数器
    
    for _, user_data in data.items(): # 🔄 遍历所有用户 (忽略 key)
        if not isinstance(user_data, dict): continue # 🛡️ 跳过非字典数据
        if "installedApps" not in user_data: user_data["installedApps"] = {} # 🆕 初始化已安装应用
        current_installed = user_data["installedApps"] # 📂 获取已安装列表
        
        for app in req.apps: # 🔄 遍历请求中的应用
            app_id = app["id"] # 🆔 获取应用ID
            new_entry = {
                "id": app_id,
                "name": app["name"],
                "version": app["version"],
                "path": app["path"],
                "isSystem": app["isSystem"]
            } # 📝 构建新条目
            current_installed[app_id] = new_entry # 💾 更新条目
            updated_count += 1 # ➕ 计数加一
            
    return {"status": "received", "count": len(req.apps)} # ✅ 返回接收状态

@app.post("/admin/sync_commit")
async def sync_commit(x_angel_key: str = Header(None)):
    # =================================
    #  🎉 提交同步 (鉴权Key)
    #
    #  🎨 代码用途：
    #     将内存中缓存的批量同步数据写入磁盘。
    #
    #  💡 易懂解释：
    #     整理完毕！🧹 把客厅（内存）里的包裹全部搬进仓库（硬盘）存好。
    #
    #  ⚠️ 警告：
    #     这是一个 IO 密集型操作，可能会短暂阻塞服务器主线程。
    # =================================
    
    # 验证权限...
    users = load_json(KEY_FILE, {}) # 📖 读取用户配置
    admin_keys = [k.get("value") for k in users.get("admin", {}).get("keys", [])] # 🔑 获取管理员Key列表
    if x_angel_key != SECRET_KEY and x_angel_key not in admin_keys: # 🛡️ 验证Key
        raise HTTPException(status_code=403, detail="🚫 权限不足") # 🚫 抛出权限异常

    global _temp_sync_cache # 🌍 引用全局变量
    if _temp_sync_cache is None: # 🧐 如果没有缓存
        return {"status": "no_changes", "msg": "没有待提交的更改"} # 🤷‍♀️ 无需提交

    # 写入磁盘
    if save_json(DATA_FILE, _temp_sync_cache): # 💾 保存到文件
        _temp_sync_cache = None # 🗑️ 清空缓存
        return {"status": "success", "msg": "同步完成，已写入磁盘"} # ✅ 返回成功
    else:
        raise HTTPException(status_code=500, detail="保存失败") # ❌ 抛出保存失败异常

@app.get("/")
async def root():
    # =================================
    #  🎉 根路径检查 (无参数)
    #
    #  🎨 代码用途：
    #     健康检查接口，用于确认服务器是否正常运行。
    #
    #  💡 易懂解释：
    #     敲敲门！🚪 看看管家在不在家。
    #
    #  ⚠️ 警告：
    #     此接口公开访问，不要返回敏感信息。
    # =================================
    return {"message": "Angel Web Compute High is running! 🎩"} # 👋 返回欢迎信息

@app.get("/system_info")
async def system_info():
    # =================================
    #  🎉 获取系统硬件信息 (无参数)
    #
    #  🎨 代码用途：
    #     返回服务器的 CPU、系统架构等信息。
    #
    #  💡 易懂解释：
    #     管家，报一下家里的电器型号！📺
    # =================================
    return {
        "cpu_model": platform.processor() or "Unknown CPU",
        "system": platform.system(),
        "architecture": platform.machine()
    }

@app.get("/internal/get_user_key")
async def internal_get_user_key(user_id: str = "admin", x_angel_key: str = Header(None)):
    # =================================
    #  🎉 内部获取用户密钥 (用户ID, 鉴权Key)
    #
    #  🎨 代码用途：
    #     供 Agent_angel_server 内部调用，获取指定用户的 API Key。
    #     需要 SECRET_KEY 鉴权。
    #
    #  💡 易懂解释：
    #     Agent 悄悄问管家：“那个谁的钥匙给我用一下，我要去干活了！”🔑
    # =================================
    
    # 1. 验证权限
    if x_angel_key != SECRET_KEY:
        raise HTTPException(status_code=403, detail="🚫 权限不足")

    users = load_json(KEY_FILE, {})
    
    # 2. 查找用户
    if user_id not in users:
        # 如果是 admin 且不存在，尝试查找第一个有 Key 的用户
        if user_id == "admin":
            for uid, udata in users.items():
                if isinstance(udata, dict) and udata.get("keys"):
                    return {"key": udata["keys"][0]["value"]}
        return {"key": None}

    user_data = users[user_id]
    keys = user_data.get("keys", []) if isinstance(user_data, dict) else []
    
    # 3. 返回第一个有效的 Google Key (AIza...)
    for k in keys:
        if k["value"].startswith("AIza"):
            return {"key": k["value"]}
            
    # 4. 如果没有 Google Key，返回第一个 Key
    if keys:
        return {"key": keys[0]["value"]}
        
    return {"key": None}

@app.post("/internal/add_user_key")
async def internal_add_user_key(req: UpdateKeysRequest, x_angel_key: str = Header(None)):
    # =================================
    #  🎉 内部添加用户密钥 (请求体, 鉴权Key)
    #
    #  🎨 代码用途：
    #     供 Agent_angel_server 内部调用，向指定用户添加新的 API Key。
    #     不会覆盖现有 Key，而是追加。
    # =================================
    
    if x_angel_key != SECRET_KEY:
        raise HTTPException(status_code=403, detail="🚫 权限不足")

    users = load_json(KEY_FILE, {})
    
    if req.account not in users:
        users[req.account] = {"password": "", "keys": []}
    
    user_data = users[req.account]
    current_keys = user_data.get("keys", [])
    
    # 检查重复
    new_keys = req.keys
    for nk in new_keys:
        exists = False
        for ck in current_keys:
            if ck["value"] == nk["value"]:
                exists = True
                break
        if not exists:
            current_keys.append(nk)
            
    user_data["keys"] = current_keys
    
    if save_json(KEY_FILE, users):
        return {"status": "success", "msg": "密钥已追加"}
    else:
        raise HTTPException(status_code=500, detail="保存失败")

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
    #
    #  ⚠️ 警告：
    #     自动注册逻辑仅用于开发/测试环境，生产环境应关闭或增加验证码。
    # =================================
    users = load_json(KEY_FILE, {}) # 📖 读取用户库
    
    # 检查用户是否存在
    if req.account not in users:
        # 🆕 自动注册新用户
        print(f"🆕 自动注册新用户: {req.account}")
        users[req.account] = {"password": req.password, "keys": []}
        save_json(KEY_FILE, users)
        
    # 获取存储的密码和 Keys
    stored_user = users[req.account] # 👤 获取用户信息
    stored_password = "" # 🔑 临时密码变量
    user_keys = [] # 🗝️ 临时Key列表

    if isinstance(stored_user, dict): # 🧐 判断是否为新格式
        # 新格式: {"password": "...", "keys": [...]}
        stored_password = stored_user.get("password", "") # 🔑 获取密码
        user_keys = stored_user.get("keys", []) # 🗝️ 获取Keys
    else:
        # 旧格式: "password"
        stored_password = stored_user # 🔑 获取密码
        user_keys = [] # ∅ 旧格式无Keys

    # 验证密码
    if stored_password != req.password: # 🛡️ 比对密码
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

@app.post("/update_user_keys")
async def update_user_keys(req: UpdateKeysRequest):
    # =================================
    #  🎉 更新用户密钥 (更新请求)
    #
    #  🎨 代码用途：
    #     接收客户端提交的最新 Key 列表，并保存到服务器。
    #     支持新增和更新，会覆盖旧的 Key 列表。
    #
    #  💡 易懂解释：
    #     管家，这是我最新的钥匙串，帮我保管好！🔑
    #
    #  ⚠️ 警告：
    #     这里直接覆盖了 keys 列表，客户端需要负责合并逻辑。
    # =================================
    users = load_json(KEY_FILE, {}) # 📖 读取用户库
    
    if req.account not in users:
        # 如果用户不存在，自动创建 (仅限开发环境)
        users[req.account] = {"password": "", "keys": []}
    
    user_data = users[req.account]
    if isinstance(user_data, dict):
        user_data["keys"] = req.keys # 💾 更新 Keys
    else:
        # 旧格式转新格式
        users[req.account] = {"password": user_data, "keys": req.keys}
        
    if save_json(KEY_FILE, users): # 💾 保存到文件
        return {"status": "success", "msg": "密钥已更新"}
    else:
        raise HTTPException(status_code=500, detail="保存失败")

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
    #
    #  ⚠️ 警告：
    #     频繁调用此接口可能会导致磁盘 IO 压力过大。
    # =================================
    data = load_json(DATA_FILE, {}) # 📖 读取现有数据
    data[state.user_id] = state.data # 📝 更新用户数据
    if save_json(DATA_FILE, data): # 💾 保存到文件
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
    #
    #  ⚠️ 警告：
    #     如果用户数据不存在，返回空字典，前端需做好容错处理。
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
    #
    #  ⚠️ 警告：
    #     此接口返回的数据量可能较大，建议增加分页或精简返回字段。
    # =================================
    
    # 读取默认用户的配置作为基准
    data = load_json(DATA_FILE, {}) # 📖 读取数据
    
    # 🛠️ 自动初始化默认用户 (如果不存在)
    if "default" not in data:
        default_data = get_default_data()
        data["default"] = default_data["default"]
        save_json(DATA_FILE, data) # 💾 保存初始化数据
        print("🆕 已初始化默认应用列表")

    default_apps = data.get("default", {}).get("installedApps", {}) # 📂 获取默认应用列表
    
    apps = [] # 📦 普通应用列表
    system_apps = [] # 🛠️ 系统应用列表
    system_core = [] # ⚙️ 核心组件列表 (暂空)

    for app_id, info in default_apps.items(): # 🔄 遍历应用
        item = {
            "id": app_id, # 🆔 补全 ID
            "filename": info.get("filename", f"{app_id}.js"), # 📂 获取文件名 (优先使用配置，否则回退到 ID)
            "name": info.get("name", app_id),
            "version": info.get("version", "1.0.0"),
            "line_count": 0, # 📏 无法统计远程文件行数
            "icon": info.get("icon"), # 🖼️ 传递图标
            "color": info.get("color") # 🎨 传递颜色
        } # 📝 构建应用信息
        
        if info.get("isSystem"): # 🧐 判断是否为系统应用
            system_apps.append(item) # 🛠️ 添加到系统应用
        else:
            apps.append(item) # 📦 添加到普通应用

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
    #
    #  ⚠️ 警告：
    #     生产环境建议使用 gunicorn 或其他进程管理器来运行。
    # =================================
    uvicorn.run(app, host="0.0.0.0", port=9000)

    
