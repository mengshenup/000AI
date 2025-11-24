import uvicorn # 🦄 ASGI 服务器
import sys # 🖥️ 系统相关参数和函数
import functools # 🛠️ 高阶函数工具
import traceback # 📜 堆栈跟踪库
import asyncio # ⚡ 异步 I/O 库
import time # ⏱️ 时间处理库
import os # 📂 操作系统接口

# 🕒 版本控制 (每次修改后更新此处)
DEBUG_VERSION = "v1.3.0 (2025-11-24)" # 🏷️ 当前调试脚本版本

# =================================
#  🕵️‍♂️ 调试专用启动器 (Monkey Patch 模式)
#
#  🎨 代码用途：
#     在不修改源码的情况下，动态注入调试逻辑，捕获异常并打印详细堆栈。
#     主要用于调试 WebSocket 通信和服务器核心逻辑。
#
#  💡 易懂解释：
#     这是给 Angel 做手术的医生！👨‍⚕️ 它可以在 Angel 运行的时候，悄悄地在神经（WebSocket）里装一个监控器，
#     如果哪里痛了（报错），它马上就能知道是哪里出了问题！
#
#  ⚠️ 警告：
#     此脚本使用了 Monkey Patch 技术，修改了运行时代码。仅限调试使用，严禁用于生产环境！
# =================================

# 1. 导入目标模块
# 🔧 确保可以导入根目录模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # 📍 添加项目根目录到系统路径
from Nerve import websocket_server # 🔌 导入 WebSocket 服务模块

# 2. 定义装饰器/Wrapper
def debug_send_impulse_wrapper(original_func):
    # =================================
    #  🎉 调试包装器 (原始函数)
    #
    #  🎨 代码用途：
    #     包装原始的 send_impulse 函数，捕获其执行过程中的所有异常并打印堆栈。
    #
    #  💡 易懂解释：
    #     这是一个保护罩！🛡️ 它包在发送信号的函数外面，如果发送失败了，它会接住错误，告诉我们发生了什么，
    #     而不是让整个程序崩溃。
    # =================================
    @functools.wraps(original_func) # 🎁 保留原函数的元数据
    async def wrapper(*args, **kwargs):
        try:
            # 🚀 调用原始函数
            return await original_func(*args, **kwargs) # 📞 执行原函数
        except Exception as e:
            # 🚨 捕获异常并打印
            print(f"\n[DEBUG] 🚨 send_impulse 捕获到异常:") # 📢 打印异常标题
            print(f"  Type: {type(e).__name__}") # 🏷️ 打印异常类型
            print(f"  Message: {str(e)}") # 💬 打印异常信息
            # 📜 打印堆栈，帮助定位是谁调用的
            traceback.print_exc() # 🕵️‍♂️ 打印完整堆栈
            # 🛡️ 保持原有逻辑：吞掉异常，不让服务器崩溃
            pass # 🤐 吞掉异常
    return wrapper # 🎁 返回包装后的函数

# 3. 应用 Patch (偷梁换柱)
print("\n" + "="*50) # 📏 分隔线
print(f"🐛 Angel Server 调试模式启动 | {DEBUG_VERSION}") # 📢 启动横幅
print("="*50) # 📏 分隔线
print(f"🎯 正在调试目标: Nerve.websocket_server") # 🎯 目标模块
print(f"🔍 监控函数: send_impulse") # 🔍 监控函数
print("-" * 50) # 📏 分隔线

print("💉 正在注入调试探针...") # 💉 注入提示
original_send_impulse = websocket_server.send_impulse # 💾 备份原函数
websocket_server.send_impulse = debug_send_impulse_wrapper(original_send_impulse) # 🔄 替换为包装后的函数
print("✅ 探针注入成功！所有 WebSocket 发送错误将被捕获并显示。") # ✅ 成功提示
print("-" * 50) # 📏 分隔线

# 4. 启动服务器
if __name__ == "__main__":
    # =================================
    #  🎉 启动调试服务器 (无参数)
    #
    #  🎨 代码用途：
    #     启动 Uvicorn 服务器，加载应用。注意这里禁用了 reload 以免 Patch 失效。
    #
    #  💡 易懂解释：
    #     手术台准备就绪！🏥 开始运行 Angel，医生正在旁边盯着呢！
    #
    #  ⚠️ 警告：
    #     reload=False 是必须的，因为热重载会重新导入模块，导致我们的 Monkey Patch 被覆盖失效。
    # =================================
    print("🚀 正在启动 Uvicorn 服务器...") # 🚀 启动提示
    print("📝 提示: 请在前端进行操作，如果发生错误，详细堆栈将显示在下方。") # 📝 操作提示
    print("="*50 + "\n") # 📏 分隔线
    
    try:
        # ⚠️ 注意：这里不能用 reload=True，因为 reload 会重新加载模块，导致 Patch 失效
        # 如果需要调试，请手动重启此脚本
        uvicorn.run(
            "Nerve.fastapi_app:app", # 📦 指向正确的应用入口
            host="0.0.0.0", # 🌐 监听所有网络接口
            port=8000, # 🚪 服务端口号
            reload=False, # 🚫 禁用热重载
            workers=1 # 👷 工作进程数量
        )
    except KeyboardInterrupt:
        print("\n🛑 用户中断调试，正在退出...") # 🛑 用户中断提示
    except Exception as e:
        print(f"\n❌ 服务器发生致命错误: {e}") # ❌ 致命错误提示
        traceback.print_exc() # 🕵️‍♂️ 打印堆栈
