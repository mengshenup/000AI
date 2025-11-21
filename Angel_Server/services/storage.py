import json
import os
from pathlib import Path

# 定义数据存储目录
DATA_DIR = Path("user_data")
DATA_DIR.mkdir(exist_ok=True)

def save_data(filename: str, data: list | dict):
    # ---------------------------------------------------------------- #
    #  保存数据(文件名, 数据)
    #
    #  函数用处：
    #     将数据保存为 JSON 文件到 user_data 目录。
    #
    #  易懂解释：
    #     把内存里的东西写到硬盘上，防止断电丢失。
    # ---------------------------------------------------------------- #
    file_path = DATA_DIR / filename
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"❌ 保存失败 {filename}: {e}")
        return False

def load_data(filename: str, default=None):
    # ---------------------------------------------------------------- #
    #  读取数据(文件名, 默认值)
    #
    #  函数用处：
    #     从 user_data 目录读取 JSON 文件。如果文件不存在，返回默认值。
    # ---------------------------------------------------------------- #
    if default is None:
        default = []
        
    file_path = DATA_DIR / filename
    if not file_path.exists():
        return default
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ 读取失败 {filename}: {e}")
        return default
