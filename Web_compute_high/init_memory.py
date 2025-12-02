import json
from pathlib import Path

# =================================
#  🎉 记忆初始化工具 (Web Compute High)
#
#  🎨 代码用途：
#     负责初始化 memory_window.json 文件，写入默认的窗口和应用数据。
#     当文件不存在或损坏时，可以使用此脚本重置。
#
#  💡 易懂解释：
#     这是 Angel 的“装修队”！👷‍♂️ 如果房间（数据文件）是空的，
#     它会负责摆放好默认的家具（窗口）和玩具（应用）。
# =================================

CURRENT_DIR = Path(__file__).parent.absolute()
MEMORY_DIR = CURRENT_DIR / "Memorybank"
DATA_FILE = MEMORY_DIR / "memory_window.json"

def get_default_data():
    """
    🎉 获取默认数据结构
    """
    return {
        "default": {
            "apps": {},
            "installedApps": {
                # System Apps
                "sys-taskbar": { "name": "Taskbar", "version": "1.0.0", "isSystem": True, "filename": "taskbar.js" },
                "sys-desktop": { "name": "Desktop", "version": "1.0.0", "isSystem": True, "filename": "desktop.js" },
                "sys-context-menu": { "name": "Context Menu", "version": "1.0.0", "isSystem": True, "filename": "context_menu.js" },
                "app-login": { "name": "Login", "version": "1.0.0", "isSystem": True, "filename": "login.js" },
                "win-companion": { "name": "Angel System", "version": "1.0.0", "isSystem": True, "filename": "angel.js" },
                "svc-billing": { "name": "Billing", "version": "1.0.0", "isSystem": True, "filename": "billing.js" },
                "svc-traffic": { "name": "Traffic", "version": "1.0.0", "isSystem": True, "filename": "traffic.js" },
                "svc-fps": { "name": "FPS Counter", "version": "1.0.0", "isSystem": True, "filename": "fps.js" },
                
                # User Apps
                "win-angel": { 
                    "name": "探索之窗", 
                    "version": "1.2.1", 
                    "isSystem": False, 
                    "filename": "browser.js",
                    "icon": "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
                    "color": "#6c5ce7"
                },
                "win-personalization": { 
                    "name": "个性化", 
                    "version": "1.0.1", 
                    "isSystem": False, 
                    "filename": "personalization.js",
                    "icon": "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0 .59-.22L5.09 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
                    "color": "#e17055"
                },
                "win-taskmgr": { 
                    "name": "活力源泉", 
                    "version": "1.0.1", 
                    "isSystem": False, 
                    "filename": "task_manager.js",
                    "icon": "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
                    "color": "#d63031"
                },
                "win-manual": { 
                    "name": "光明指引", 
                    "version": "1.0.1", 
                    "isSystem": False, 
                    "filename": "manual.js",
                    "icon": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
                    "color": "#0984e3"
                },
                "win-performance": { 
                    "name": "性能调优", 
                    "version": "1.0.1", 
                    "isSystem": False, 
                    "filename": "performance.js",
                    "icon": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
                    "color": "#6c5ce7"
                },
                "win-intelligence": { 
                    "name": "智慧锦囊", 
                    "version": "1.0.1", 
                    "isSystem": False, 
                    "filename": "intelligence.js",
                    "icon": "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z",
                    "color": "#00b894"
                }
            }
        }
    }

def init_memory_window(force=False):
    """
    🎉 初始化 memory_window.json
    :param force: 是否强制覆盖现有文件
    """
    MEMORY_DIR.mkdir(exist_ok=True)
    
    if DATA_FILE.exists() and not force:
        print(f"ℹ️ 文件已存在，跳过初始化: {DATA_FILE}")
        return False

    data = get_default_data()
    
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"✅ 已成功创建默认 memory_window.json: {DATA_FILE}")
        return True
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        return False

if __name__ == "__main__":
    # 直接运行脚本时强制重置
    print("⚠️ 正在执行手动重置...")
    init_memory_window(force=True)
