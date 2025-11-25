import sys
import os
import json
import re
from pathlib import Path
from datetime import datetime

from dotenv import load_dotenv # 🔑 加载环境变量

# =================================
#  🎉 记忆库初始化工具 (Memory Initialization Tool)
#
#  🎨 代码用途：
#     这是一个【离线管理工具】，用于在开发或部署阶段生成初始数据。
#     它扫描前端目录 (Web_compute_low)，生成应用列表，并安全地更新到 Memorybank。
#
#  💡 易懂解释：
#     这是 Angel 的“物资清单登记员”！📝
#     它负责把仓库里的东西（应用）登记造册，然后把清单交给管家（Server）。
#     它只负责“加名字”，绝对不会把原来的账本（用户数据）给撕了！
#
#  ⚠️ 警告：
#     请在拥有完整代码库的环境（如开发机或构建服务器）中运行。
#     不要在无法访问 Web_compute_low 的生产服务器上直接运行。
# =================================

# 📂 路径配置
CURRENT_DIR = Path(__file__).parent.absolute()
SERVER_ROOT = CURRENT_DIR.parent # Web_compute_high
WORKSPACE_DIR = SERVER_ROOT.parent # 000AI
# 假设 Web_compute_low 与 Web_compute_high 在同一父目录下 (开发/构建环境)
WEB_LOW_DIR = WORKSPACE_DIR / "Web_compute_low"
MEMORY_DIR = SERVER_ROOT / "Memorybank"
ENV_FILE = MEMORY_DIR / ".env" # 🔑 环境变量文件

# 确保存储目录存在
MEMORY_DIR.mkdir(exist_ok=True)

# 💾 目标文件
DATA_FILE = MEMORY_DIR / "memory_window.json"
KEY_FILE = MEMORY_DIR / "memory_key.json"
MANIFEST_FILE = MEMORY_DIR / "app_manifest.json" # 用于记录指纹，实现增量更新

def scan_apps():
    # =================================
    #  🎉 扫描应用 (Scan Apps)
    #
    #  🎨 代码用途：
    #     遍历 Web_compute_low/js/apps 和 apps_system 目录。
    #     提取应用元数据 (ID, 名称, 版本)。
    #
    #  💡 易懂解释：
    #     点货啦！拿着清单去仓库数数，看看都有什么好东西。📦
    # =================================
    
    apps_map = {}
    
    # 定义扫描路径
    scan_paths = {
        "system": WEB_LOW_DIR / "js" / "apps_system",
        "user": WEB_LOW_DIR / "js" / "apps"
    }

    print(f"🔍 开始扫描应用目录: {WEB_LOW_DIR}")

    for category, path in scan_paths.items():
        if not path.exists():
            print(f"⚠️ 目录不存在: {path}")
            continue

        for file in path.glob("*.js"):
            app_id = file.stem # 文件名作为 ID
            
            # 尝试读取文件内容提取元数据 (简单的正则匹配)
            try:
                content = file.read_text(encoding="utf-8")
                
                # 提取 name (例如: name: '任务栏')
                name_match = re.search(r"name:\s*['\"](.+?)['\"]", content)
                name = name_match.group(1) if name_match else app_id
                
                # 提取 version
                ver_match = re.search(r"version:\s*['\"](.+?)['\"]", content)
                version = ver_match.group(1) if ver_match else "1.0.0"

                # 提取 icon (简单判断是否有 icon 字段)
                has_icon = "icon:" in content or "iconPath:" in content

                # 构建元数据
                apps_map[app_id] = {
                    "id": app_id,
                    "name": name,
                    "version": version,
                    "category": category,
                    "path": f"js/{'apps_system' if category == 'system' else 'apps'}/{file.name}",
                    "isSystem": category == "system",
                    "last_modified": file.stat().st_mtime
                }
                # print(f"   ✅ 发现应用: {name} ({app_id})")
            except Exception as e:
                print(f"   ❌ 解析失败 {file.name}: {e}")

    print(f"✨ 扫描完成，共发现 {len(apps_map)} 个应用")
    return apps_map

def init_memory_window(apps_map):
    # =================================
    #  🎉 初始化窗口记忆 (Init Window Memory)
    #
    #  🎨 代码用途：
    #     更新 memory_window.json 中的 installedApps 列表。
    #     采用【增量更新】策略：只添加新应用，更新现有应用元数据，绝不删除旧数据。
    #
    #  💡 易懂解释：
    #     拿着新清单去核对账本。
    #     “咦，这个是新出的玩具，加上去！”
    #     “这个玩具改名字了？改一下。”
    #     “这个旧玩具清单上没有？那先留着吧，万一还有人用呢。”
    # =================================
    
    data = {}
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except:
            print("⚠️ 现有 memory_window.json 损坏，将重置")

    # 确保 default 用户存在
    if "default" not in data:
        data["default"] = {"apps": {}, "installedApps": {}}

    updated_count = 0
    added_count = 0

    # 遍历所有用户 (包括 default)
    for user, user_data in data.items():
        if not isinstance(user_data, dict): continue
        
        if "installedApps" not in user_data:
            user_data["installedApps"] = {}
        
        current_installed = user_data["installedApps"]
        
        for app_id, app_info in apps_map.items():
            # 构造要写入的数据 (精简版)
            new_entry = {
                "id": app_id,
                "name": app_info["name"],
                "version": app_info["version"],
                "path": app_info["path"],
                "isSystem": app_info["isSystem"]
            }

            if app_id in current_installed:
                # ✅ 已存在：更新元数据 (覆盖旧的 info)
                # 注意：这里我们假设 installedApps 里的数据是系统生成的元数据，可以安全更新
                current_installed[app_id].update(new_entry)
                updated_count += 1
            else:
                # 🆕 不存在：添加新应用
                current_installed[app_id] = new_entry
                added_count += 1
        
        # ⚠️ 关键：我们不执行删除操作 (prune)，防止误删服务器上特有的数据
        
        data[user] = user_data

    # 保存
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    
    print(f"💾 已更新 memory_window.json (新增 {added_count} 个, 更新 {updated_count} 个)")

def init_memory_key():
    # =================================
    #  🎉 初始化密钥库 (Init Key Memory)
    #
    #  🎨 代码用途：
    #     确保 memory_key.json 存在且包含 admin。
    #     从 .env 读取 GEMINI_API_KEY 并注入 admin 账号。
    # =================================
    
    # 1. 加载环境变量
    load_dotenv(ENV_FILE)
    api_key = os.getenv("GEMINI_API_KEY", "")
    
    users = {}
    if KEY_FILE.exists():
        try:
            with open(KEY_FILE, "r", encoding="utf-8") as f:
                users = json.load(f)
        except:
            pass
    
    # 2. 确保 admin 存在
    if "admin" not in users:
        print("🆕 创建默认 admin 账号")
        users["admin"] = {
            "password": "",
            "keys": []
        }
    
    # 3. 注入 Key (支持新格式)
    if isinstance(users["admin"], dict):
        current_keys = users["admin"].get("keys", [])
        # 检查是否已存在该 Key
        has_key = any(k.get("value") == api_key for k in current_keys)
        
        if api_key and not has_key:
            current_keys.append({
                "name": "System Key (.env)",
                "value": api_key
            })
            users["admin"]["keys"] = current_keys
            print("🔑 已将 .env 中的 Key 注入 admin 账号")
            
    # 4. 保存
    with open(KEY_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=4, ensure_ascii=False)
    print("💾 已更新 memory_key.json")

def run():
    print("="*40)
    print("🚀 Angel Server Memory Initialization")
    print("="*40)
    
    # 1. 扫描应用
    apps = scan_apps()
    
    # 2. 初始化窗口记忆 (全量安装)
    init_memory_window(apps)
    
    # 3. 初始化密钥库
    init_memory_key()
    
    print("\n✨ 初始化完成！Ready to serve.")

if __name__ == "__main__":
    run()
