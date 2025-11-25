from fastapi import APIRouter, HTTPException # 🛣️ 路由管理
from pydantic import BaseModel # 🏗️ 数据模型验证
from Memory.file_manager import FileManager, CLIENT_DIR # 💾 文件管理器
import platform # 🖥️ 系统信息
import subprocess # 🐚 执行系统命令
import os # 📂 文件操作
import json # 🧩 JSON 处理

router = APIRouter() # 🛣️ 创建 HTTP 路由
DATA_FILE = "memory_window.json" # 💾 窗口记忆文件
KEY_FILE = "memory_key.json" # 🔑 密钥记忆文件

# =================================
#  🎉 Agent HTTP 接口 (Agent API)
#
#  🎨 代码用途：
#     仅保留与 Agent 智能体相关的控制接口。
#     登录、存储、应用列表等 Web 业务逻辑已迁移至 Web_compute_high (Port 9000)。
#
#  💡 易懂解释：
#     这里是 Angel 的“运动神经”！💪 只负责动手做事（操作浏览器、AI思考），
#     不再管记账（登录/存储）那些琐事啦！
# =================================

@router.get("/")
async def root():
    return {"message": "Angel Agent Server is running! 🤖"}

# 🗑️ 已移除: /login, /save_memory, /load_memory, /get_apps_list
# 请访问 Web_compute_high (Port 9000) 获取这些服务。
                    "version": app_version,
                    "line_count": line_count
                })
            except:
                system_core.append({"filename": file.name, "version": '1.0.0', "line_count": 0})

    return {
        "apps": apps,
        "system_apps": system_apps,
        "system_core": system_core
    }
