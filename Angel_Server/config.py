import os

# === 基础配置 ===
USER_DATA_DIR = "./user_data"
VIEWPORT = {'width': 1280, 'height': 720}
TARGET_SEARCH_URL = "https://www.douyin.com/search/三角洲行动_零号大坝_老六点位"

# === 💰 计费配置 (USD / 1M Tokens) ===
PRICING_TABLE = {
    "gemini-1.5-flash": {
        "input": 0.075,
        "output": 0.30
    },
    "network_egress": 0.1  # $0.10 per GB
}

# 确保目录存在
if not os.path.exists(USER_DATA_DIR):
    os.makedirs(USER_DATA_DIR)