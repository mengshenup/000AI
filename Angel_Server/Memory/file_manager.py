import json
import os
from pathlib import Path

# 📂 定义数据存储目录
DATA_DIR = Path("user_data")
DATA_DIR.mkdir(exist_ok=True)

class FileManager:
    # =================================
    #  🎉 文件管理器 (Memory/file_manager.py)
    #
    #  🎨 代码用途：
    #     负责本地文件的读写操作。
    # =================================
    
    @staticmethod
    def save(filename: str, data: list | dict):
        file_path = DATA_DIR / filename
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"❌ 保存失败 {filename}: {e}")
            return False

    @staticmethod
    def load(filename: str, default=None):
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
