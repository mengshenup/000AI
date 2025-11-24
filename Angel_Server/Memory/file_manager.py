import json # 🧩 JSON 处理库
import os # 📂 操作系统接口
from pathlib import Path # 🛣️ 路径处理库
from Memory.system_config import USER_DATA_DIR # ⚙️ 导入系统配置

# 📂 定义数据存储目录
DATA_DIR = Path(USER_DATA_DIR) # 💾 用户数据根目录 (与 BrowserData 保持一致)
DATA_DIR.mkdir(parents=True, exist_ok=True) # 📁 确保目录存在 (使用 parents=True 以防父目录不存在)

class FileManager:
    # =================================
    #  🎉 文件管理器 (无参数)
    #
    #  🎨 代码用途：
    #     作为 Angel 的“海马体”，负责将短期记忆（内存数据）持久化存储到硬盘中，或从硬盘读取历史数据。
    #
    #  💡 易懂解释：
    #     Angel 的记事本！📓 怕忘记的事情（数据），就写在纸上（文件）存起来；下次想看的时候，再翻开来看看。
    #
    #  ⚠️ 警告：
    #     所有文件操作均为同步阻塞 IO，如果文件过大可能会卡顿主线程。建议仅用于存储小型配置或状态数据。
    # =================================
    
    @staticmethod
    def save(filename: str, data: list | dict):
        # =================================
        #  🎉 保存数据 (文件名，数据内容)
        #
        #  🎨 代码用途：
        #     将 Python 字典或列表序列化为 JSON 格式并写入文件。
        #
        #  💡 易懂解释：
        #     写日记咯！✍️ 把今天发生的事情（data）整整齐齐地写进本子（filename）里。
        #
        #  ⚠️ 警告：
        #     会覆盖同名文件。ensure_ascii=False 确保中文能正常显示。
        # =================================
        file_path = DATA_DIR / filename # 📍 拼接完整路径
        try:
            with open(file_path, 'w', encoding='utf-8') as f: # 📂 打开文件（写入模式）
                json.dump(data, f, ensure_ascii=False, indent=2) # 💾 写入 JSON
            return True # ✅ 保存成功
        except Exception as e:
            print(f"❌ 保存失败 {filename}: {e}") # ❌ 错误日志
            return False # 🚫 保存失败

    @staticmethod
    def load(filename: str, default=None):
        # =================================
        #  🎉 读取数据 (文件名，默认值)
        #
        #  🎨 代码用途：
        #     从指定文件中读取 JSON 数据并反序列化。如果文件不存在或损坏，返回默认值。
        #
        #  💡 易懂解释：
        #     翻日记！📖 看看以前记了什么。如果找不到本子，就拿一本新的（default）开始记。
        # =================================
        if default is None:
            default = [] # 🆕 默认初始化为空列表
        file_path = DATA_DIR / filename # 📍 拼接完整路径
        if not file_path.exists():
            return default # 🤷‍♀️ 文件不存在，返回默认值
        try:
            with open(file_path, 'r', encoding='utf-8') as f: # 📂 打开文件（读取模式）
                return json.load(f) # 📖 读取并解析 JSON
        except Exception as e:
            print(f"❌ 读取失败 {filename}: {e}") # ❌ 错误日志
            return default # 🛡️ 出错时返回默认值，防止崩溃
