# ==========================================================================
#   📃 文件功能 : 全局配置
#   ⚡ 逻辑摘要 : 存储项目路径、API Key、浏览器设置和定价表。
#   💡 易懂解释 : 机器人的 "基因" 和 "出厂设置"。
#   🔋 未来扩展 : 支持从 .env 文件加载，支持动态热更新配置。
#   📊 当前状态 : 活跃 (更新: 2025-12-16)
#   🧱 Memory/Config.py 踩坑记录 :
#      1. [2025-12-04] [已修复] [路径错误]: 之前注释写的是 Body 目录，实际在 Memory 目录。 -> 修正了注释。
#      2. [2025-12-16] [已修复] [文件重复]: 文件内容被重复粘贴多次。 -> 清理重复内容。
# ==========================================================================

import os # 📂 引入操作系统模块
import pathlib # 🛣️ 引入路径处理模块

# =============================================================================
#   🎉 路径配置
#
#   🎨 代码用途：
#      定义关键目录的绝对路径。
#
#   💡 易懂解释:
#      "我家在哪？"
#
#   ⚠️ 警告:
#      依赖文件系统的实际结构。
#
#   ⚙️ 触发源:
#      Import
# =============================================================================
CURRENT_DIR = pathlib.Path(__file__).parent.absolute() # 📍 定位当前目录 (Memory)
PROJECT_ROOT = CURRENT_DIR.parent # 🏠 定位项目根目录 (Agent_angel_server)
USER_DATA_DIR = os.path.join(PROJECT_ROOT, "Memorybank", "BrowserData") # 💾 设定数据存储路径

# =============================================================================
#   🎉 浏览器配置
#
#   🎨 代码用途：
#      定义浏览器视口、通道和默认页。
#
#   💡 易懂解释:
#      "眼睛睁多大？"
#
#   ⚠️ 警告:
#      VIEWPORT 影响截图大小和 Token 消耗。
#
#   ⚙️ 触发源:
#      Playwright.py
# =============================================================================
VIEWPORT = {'width': 1280, 'height': 720} # 🖼️ 设定视口尺寸
BROWSER_CHANNEL = None # 🌐 设定浏览器通道 (None=Chromium)
TARGET_SEARCH_URL = "https://www.douyin.com/search/三角洲行动_零号大坝_老六点位" # 🎯 设定默认搜索目标

# =============================================================================
#   🎉 密钥配置
#
#   🎨 代码用途：
#      从RocksDB获取外部服务的凭证。
#
#   💡 易懂解释:
#      "从保险箱拿钥匙。"
#
#   ⚠️ 警告:
#      密钥由Agent_angel_client通过API传入并存储到RocksDB。
#      用户在线时使用最新密钥，离线时使用缓存的密钥。
#
#   ⚙️ 触发源:
#      Gemini.py
# =============================================================================
def get_gemini_api_key():
    """从RocksDB获取Gemini API密钥"""
    try:
        import rocksdb
        db_path = os.path.join(PROJECT_ROOT, "Memorybank", "keys_db")
        if os.path.exists(db_path):
            opts = rocksdb.Options()
            opts.create_if_missing = False
            db = rocksdb.DB(db_path, opts, read_only=True)
            value = db.get(b"gemini")
            if value:
                return value.decode('utf-8')
    except Exception:
        # RocksDB读取失败，返回空字符串
        pass
    
    return ""

GEMINI_API_KEY = get_gemini_api_key() # 🔑 获取 Gemini 密钥

# =============================================================================
#   🎉 定价表
#
#   🎨 代码用途：
#      定义各种资源的单价 (美元)。
#
#   💡 易懂解释:
#      "价目表。"
#
#   ⚠️ 警告:
#      需要定期更新以匹配官方定价。
#
#   ⚙️ 触发源:
#      Gemini.py, Tasks.py
# =============================================================================
PRICING_TABLE = { # 💰 定义价格字典
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30}, # ⚡ Flash 模型费率
    "gemini-1.5-pro": {"input": 3.50, "output": 10.50},   # 🧠 Pro 模型费率
    "network_egress": 0.1 # 🌐 网络流量费率
}

# 🔨 确保目录存在
if not os.path.exists(USER_DATA_DIR): # 📂 检查目录是否存在
    os.makedirs(USER_DATA_DIR) # 🔨 创建缺失目录
