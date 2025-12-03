import aiosqlite
import asyncio
import json
import os
from pathlib import Path
import time

# 📂 数据库路径定义
# 遵循三层架构，数据存储在 Agent_angel_server/Memorybank/LocalData
SERVER_ROOT = Path(os.path.dirname(os.path.dirname(__file__)))
DATA_DIR = SERVER_ROOT / "Memorybank" / "LocalData"
DB_PATH = DATA_DIR / "angel_memory.db"

# 确保目录存在
DATA_DIR.mkdir(parents=True, exist_ok=True)

class DatabaseManager:
    # =================================
    #  🎉 数据库管理器 (单例)
    #
    #  🎨 代码用途：
    #     基于 SQLite + aiosqlite 的高性能异步数据库管理器。
    #     替代旧的 JSON 文件存储，提供 ACID 事务支持和毫秒级查询。
    #
    #  💡 易懂解释：
    #     Angel 的超级档案室！🗄️ 以前是记在散乱的纸上，现在换成了专业的电子档案系统。
    #     找东西快，存东西稳，而且支持好多人同时查阅哦！
    #
    #  🚀 兼容性：
    #     Windows/Linux 通用。SQLite 是单文件数据库，无服务器依赖，完美适配 .bat/.sh 启动。
    # =================================
    
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized: return
        self.initialized = True
        self.db_path = str(DB_PATH)
        self._lock = asyncio.Lock() # 🔒 应用层锁，防止初始化竞争

    async def init_db(self):
        # =================================
        #  🎉 初始化数据库 (无参数)
        #
        #  🎨 代码用途：
        #     创建表结构，启用 WAL 模式 (Write-Ahead Logging) 以提升并发性能。
        # =================================
        async with self._lock:
            async with aiosqlite.connect(self.db_path) as db:
                # 🚀 启用 WAL 模式 (关键性能优化)
                await db.execute("PRAGMA journal_mode=WAL;")
                await db.execute("PRAGMA synchronous=NORMAL;") # 兼顾性能与安全
                
                # 👤 用户表 (存储 API Keys)
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        user_id TEXT PRIMARY KEY,
                        api_key TEXT,
                        created_at REAL,
                        last_active REAL
                    )
                """)
                
                # 📝 任务表 (存储认知目标)
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS tasks (
                        user_id TEXT PRIMARY KEY,
                        description TEXT,
                        step INTEGER DEFAULT 0,
                        status TEXT,
                        updated_at REAL
                    )
                """)
                
                await db.commit()
                print(f"🗄️ [数据库] SQLite 引擎已就绪: {self.db_path}")

    async def save_user_key(self, user_id: str, api_key: str):
        # =================================
        #  🎉 保存用户 Key
        # =================================
        now = time.time()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO users (user_id, api_key, created_at, last_active)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    api_key=excluded.api_key,
                    last_active=excluded.last_active
            """, (user_id, api_key, now, now))
            await db.commit()
            # print(f"💾 [数据库] 用户 {user_id} Key 已更新")

    async def get_user_key(self, user_id: str) -> str:
        # =================================
        #  🎉 获取用户 Key
        # =================================
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT api_key FROM users WHERE user_id = ?", (user_id,)) as cursor:
                row = await cursor.fetchone()
                return row[0] if row else None

    async def save_task(self, user_id: str, description: str, step: int, status: str):
        # =================================
        #  🎉 保存/更新任务状态
        # =================================
        now = time.time()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO tasks (user_id, description, step, status, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    description=excluded.description,
                    step=excluded.step,
                    status=excluded.status,
                    updated_at=excluded.updated_at
            """, (user_id, description, step, status, now))
            await db.commit()

    async def get_task(self, user_id: str) -> dict:
        # =================================
        #  🎉 获取任务状态
        # =================================
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row # 允许按列名访问
            async with db.execute("SELECT * FROM tasks WHERE user_id = ?", (user_id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "description": row["description"],
                        "step": row["step"],
                        "status": row["status"]
                    }
                return None

    async def migrate_from_json(self):
        # =================================
        #  🎉 数据迁移 (JSON -> SQLite)
        #
        #  🎨 代码用途：
        #     一次性工具，将旧的 JSON 数据导入数据库。
        # =================================
        json_path = DATA_DIR / "user_keys.json"
        if json_path.exists():
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    count = 0
                    for uid, keys in data.items():
                        if keys and isinstance(keys, list):
                            # 取最新的一个 key (假设列表最后一个是最新的，或者第一个)
                            # 旧逻辑通常 append，所以最后一个可能较新，或者第一个。
                            # 这里取第一个作为默认，因为旧代码也是取 [0]
                            await self.save_user_key(uid, keys[0])
                            count += 1
                print(f"📦 [迁移] 已从 JSON 迁移 {count} 个用户 Key 到数据库")
                # 可选：重命名旧文件备份
                # json_path.rename(json_path.with_suffix('.json.bak'))
            except Exception as e:
                print(f"⚠️ [迁移] JSON 数据迁移失败: {e}")

# 全局单例
global_db_manager = DatabaseManager()
