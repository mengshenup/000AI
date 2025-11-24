from fastapi import APIRouter # 🛣️ 路由管理
from pydantic import BaseModel # 🏗️ 数据模型验证
from Memory.file_manager import FileManager # 💾 文件管理器
import platform # 🖥️ 系统信息
import subprocess # 🐚 执行系统命令

router = APIRouter() # 🛣️ 创建 HTTP 路由
DATA_FILE = "apps.json" # 💾 布局配置文件名

class AppState(BaseModel):
    # =================================
    #  🎉 应用状态模型 (无参数)
    #
    #  🎨 代码用途：
    #     定义前端传递的数据结构，用于 Pydantic 自动校验。
    #
    #  💡 易懂解释：
    #     这是一个快递盒！📦 前端发来的数据必须装在这个盒子里，Angel 才能签收哦！
    # =================================
    data: dict # 📦 包含应用布局信息的字典

@router.post("/save_layout")
async def save_layout(state: AppState):
    # =================================
    #  🎉 保存布局 (应用状态)
    #
    #  🎨 代码用途：
    #     接收前端发送的桌面布局数据，并调用 FileManager 持久化存储到磁盘。
    #
    #  💡 易懂解释：
    #     Angel 记性很好的！🧠 你把桌面摆成什么样，我都帮你记下来，下次开机还是老样子！
    # =================================
    """保存记忆"""
    success = FileManager.save(DATA_FILE, state.data) # 💾 保存到文件
    return {"status": "ok" if success else "error"} # 📨 返回操作结果

@router.get("/load_layout")
async def load_layout():
    # =================================
    #  🎉 读取布局 (无参数)
    #
    #  🎨 代码用途：
    #     从磁盘读取之前保存的桌面布局数据，返回给前端。
    #
    #  💡 易懂解释：
    #     恢复现场！✨ 变魔术一样，把上次的桌面变回来！
    # =================================
    """读取记忆"""
    return FileManager.load(DATA_FILE, default={}) # 📖 读取文件并返回

@router.get("/system_info")
async def get_system_info():
    # =================================
    #  🎉 获取系统硬件信息 (无参数)
    #
    #  🎨 代码用途：
    #     获取服务器宿主机的 CPU 型号、内存等硬件信息，供前端展示。
    #
    #  💡 易懂解释：
    #     查户口啦！📝 看看这台电脑到底有多强壮，能不能跑得动小天使！
    # =================================
    """获取系统信息"""
    cpu_name = platform.processor()
    
    # 尝试获取更详细的 CPU 名称 (Windows)
    if platform.system() == "Windows":
        try:
            command = "wmic cpu get name"
            output = subprocess.check_output(command, shell=True).decode().strip()
            # output 格式通常是 "Name\nIntel(R) Core(TM)..."
            lines = output.split('\n')
            if len(lines) > 1:
                cpu_name = lines[1].strip()
        except:
            pass

    return {
        "cpu_model": cpu_name,
        "system": f"{platform.system()} {platform.release()}",
        "architecture": platform.machine()
    }
