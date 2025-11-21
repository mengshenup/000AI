import json
import os
from pathlib import Path

# 定义数据存储目录
# 使用 pathlib 库来处理路径，兼容不同操作系统
DATA_DIR = Path("user_data")
# 如果目录不存在，则自动创建
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
    #
    #  警告：
    #     如果文件已存在，将会被直接覆盖。
    # ---------------------------------------------------------------- #
    
    # 拼接完整的文件路径
    file_path = DATA_DIR / filename
    try:
        # 以写入模式打开文件，指定 utf-8 编码防止乱码
        with open(file_path, 'w', encoding='utf-8') as f:
            # 将 Python 对象序列化为 JSON 字符串并写入文件
            # ensure_ascii=False 允许写入中文，indent=2 保持缩进美观
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True # 保存成功返回 True
    except Exception as e:
        # 打印错误信息，方便排查
        print(f"❌ 保存失败 {filename}: {e}")
        return False # 保存失败返回 False

def load_data(filename: str, default=None):
    # ---------------------------------------------------------------- #
    #  读取数据(文件名, 默认值)
    #
    #  函数用处：
    #     从 user_data 目录读取 JSON 文件。如果文件不存在，返回默认值。
    #
    #  易懂解释：
    #     从硬盘上把之前存的东西读回内存里。
    #
    #  警告：
    #     如果文件内容不是合法的 JSON 格式，将会报错并返回默认值。
    # ---------------------------------------------------------------- #
    
    # 如果没有提供默认值，则默认为空列表
    if default is None:
        default = []
        
    # 拼接完整的文件路径
    file_path = DATA_DIR / filename
    
    # 检查文件是否存在
    if not file_path.exists():
        return default # 不存在则返回默认值
        
    try:
        # 以读取模式打开文件
        with open(file_path, 'r', encoding='utf-8') as f:
            # 将 JSON 字符串反序列化为 Python 对象
            return json.load(f)
    except Exception as e:
        # 打印错误信息
        print(f"❌ 读取失败 {filename}: {e}")
        return default # 出错时返回默认值
