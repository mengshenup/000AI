# ==========================================================================
#   📃 文件功能 : 记忆接口层
#   ⚡ 逻辑摘要 : 提供 Python 端访问 Rust 共享内存 (AppState) 的 HTTP 接口封装。
#   💡 易懂解释 : Python 想要看日记，得通过这个 "图书管理员"。
#   🔋 未来扩展 : 支持 gRPC 或 WebSocket 以提高性能。
#   📊 当前状态 : 活跃 (更新: 2025-12-06)
#   🧱 Memory/Interface.py 踩坑记录 :
#      1. [2025-12-04] [已修复] [类型错误]: 任务 ID 必须是字符串。 -> 强制类型转换。
#      2. [2025-12-16] [已修复] [缺少router]: Brain/Main.py 需要导入 router。 -> 添加 FastAPI router。
# ==========================================================================

import requests # 🌐 引入 HTTP 请求库
import json # 📦 引入 JSON 处理库
import sys
import os
from fastapi import APIRouter, Query
from pydantic import BaseModel

# 🛠️ 确保能导入 Body 模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# =============================================================================
#   🎉 FastAPI 路由器
#
#   🎨 代码用途：
#      定义 Python Worker 的 HTTP API 路由。
#
#   💡 易懂解释:
#      "前台接待员，负责接待各种请求。"
#
#   ⚠️ 警告:
#      这些路由由 Brain/Main.py 挂载。
#
#   ⚙️ 触发源:
#      Brain/Main.py -> app.include_router(router)
# =============================================================================
router = APIRouter()

class SessionInitReq(BaseModel):
    user_id: str

class ActionExecuteReq(BaseModel):
    user_id: str
    action: dict

@router.post("/session/init")
async def init_session(req: SessionInitReq):
    """初始化浏览器会话"""
    from Body.Playwright import angel_browser
    await angel_browser.get_or_create_session(req.user_id)
    return {"status": "ok", "user_id": req.user_id}

@router.post("/session/close")
async def close_session(req: SessionInitReq):
    """关闭浏览器会话"""
    from Body.Playwright import angel_browser
    await angel_browser.close_session(req.user_id)
    return {"status": "ok"}

@router.get("/state/screenshot")
async def get_screenshot(user_id: str = Query(...)):
    """获取当前页面截图"""
    from Body.Playwright import angel_browser
    session = await angel_browser.get_or_create_session(user_id)
    screenshot_b64 = await session["eye"].capture()
    return {"screenshot": screenshot_b64}

@router.get("/state/url")
async def get_url(user_id: str = Query(...)):
    """获取当前页面 URL"""
    from Body.Playwright import angel_browser
    session = await angel_browser.get_or_create_session(user_id)
    url = session["page"].url if session["page"] else ""
    return {"url": url}

@router.post("/action/execute")
async def execute_action(req: ActionExecuteReq):
    """执行浏览器动作"""
    from Body.Playwright import angel_browser
    session = await angel_browser.get_or_create_session(req.user_id)
    action = req.action
    action_type = action.get("action_type", "")
    params = action.get("params", {})
    
    if action_type == "click":
        x = params.get("x", 0.5)
        y = params.get("y", 0.5)
        await session["hand"].click(x, y)
    elif action_type == "type":
        text = params.get("text", "")
        await session["page"].keyboard.type(text)
    elif action_type == "scroll":
        delta_y = params.get("delta_y", 0)
        await session["page"].mouse.wheel(0, delta_y)
    elif action_type == "navigate":
        url = params.get("url", "")
        if url:
            await session["page"].goto(url)
    elif action_type == "wait":
        import asyncio
        await asyncio.sleep(1)
    # "done" 不需要执行任何操作
    
    return {"status": "ok"}

class MemoryInterface:
    # =============================================================================
    #   🎉 记忆接口
    #
    #   🎨 代码用途：
    #      封装与 Rust 核心服务器的通信逻辑。
    #
    #   💡 易懂解释:
    #      "喂，Rust 老哥，帮我记个事儿！"
    #
    #   ⚠️ 警告:
    #      依赖 Rust 服务在 8000 端口运行。
    #
    #   ⚙️ 触发源:
    #      Body/Main.py
    # =============================================================================
    
    def __init__(self, base_url="http://localhost:8000"):
        # =============================================================================
        #   🎉 初始化 (基础地址)
        #
        #   🎨 代码用途：
        #      设置 API 基础地址。
        #
        #   💡 易懂解释:
        #      "记住 Rust 老哥的电话号码。"
        #
        #   ⚠️ 警告:
        #      默认 localhost:8000。
        #
        #   ⚙️ 触发源:
        #      Class Instantiation
        # =============================================================================
        self.base_url = base_url # 🔗 设置基础 URL

    def get_task(self, user_id):
        # =============================================================================
        #   🎉 获取任务 (用户ID)
        #
        #   🎨 代码用途：
        #      查询指定用户的当前任务。
        #
        #   💡 易懂解释:
        #      "查查这人现在该干嘛？"
        #
        #   ⚠️ 警告:
        #      如果任务不存在返回 None。
        #
        #   ⚙️ 触发源:
        #      External Call
        # =============================================================================
        try:
            response = requests.get(f"{self.base_url}/task/{user_id}") # 📨 发送 GET 请求
            if response.status_code == 200: # ✅ 请求成功
                return response.json() # 📦 返回 JSON 数据
            return None # ❌ 请求失败
        except Exception as e: # 🚨 捕获异常
            print(f"Error getting task: {e}") # 📢 打印错误
            return None # ❌ 返回空

    def update_task(self, user_id, status):
        # =============================================================================
        #   🎉 更新任务 (用户ID，状态)
        #
        #   🎨 代码用途：
        #      更新指定用户的任务状态。
        #
        #   💡 易懂解释:
        #      "告诉 Rust 老哥，这活儿干完了（或者搞砸了）。"
        #
        #   ⚠️ 警告:
        #      status 必须符合 TaskStatus 枚举。
        #
        #   ⚙️ 触发源:
        #      External Call
        # =============================================================================
        try:
            payload = {"status": status} # 📦 构建请求体
            requests.post(f"{self.base_url}/task/{user_id}/update", json=payload) # 📨 发送 POST 请求
            return True # ✅ 更新成功
        except Exception as e: # 🚨 捕获异常
            print(f"Error updating task: {e}") # 📢 打印错误
            return False # ❌ 更新失败
