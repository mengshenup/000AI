import uvicorn
import sys
import functools
import traceback
import asyncio

# =================================
#  🕵️‍♂️ 调试专用启动器 (Monkey Patch 模式)
#
#  🎨 代码用途：
#     在不修改源码的情况下，动态注入调试逻辑，捕获异常并打印详细堆栈。
# =================================

# 1. 导入目标模块
# 注意：必须在导入 main:app 之前进行 Patch
from routers import websocket_handler

# 2. 定义装饰器/Wrapper
def debug_send_packet_wrapper(original_func):
    @functools.wraps(original_func)
    async def wrapper(*args, **kwargs):
        try:
            # 调用原始函数
            return await original_func(*args, **kwargs)
        except Exception as e:
            # 捕获异常并打印
            print(f"\n[DEBUG] 🚨 send_packet 捕获到异常:")
            print(f"  Type: {type(e).__name__}")
            print(f"  Message: {str(e)}")
            # 打印堆栈，帮助定位是谁调用的
            traceback.print_exc()
            # 保持原有逻辑：吞掉异常，不让服务器崩溃
            pass 
    return wrapper

# 3. 应用 Patch (偷梁换柱)
print("\n" + "="*50)
print("🐛 Angel Server 调试模式启动")
print("="*50)
print(f"🎯 正在调试目标: routers.websocket_handler")
print(f"🔍 监控函数: send_packet")
print("-" * 50)

print("💉 正在注入调试探针...")
original_send_packet = websocket_handler.send_packet
websocket_handler.send_packet = debug_send_packet_wrapper(original_send_packet)
print("✅ 探针注入成功！所有 WebSocket 发送错误将被捕获并显示。")
print("-" * 50)

# 4. 启动服务器
if __name__ == "__main__":
    print("🚀 正在启动 Uvicorn 服务器...")
    print("📝 提示: 请在前端进行操作，如果发生错误，详细堆栈将显示在下方。")
    print("="*50 + "\n")
    
    try:
        # 注意：这里不能用 reload=True，因为 reload 会重新加载模块，导致 Patch 失效
        # 如果需要调试，请手动重启此脚本
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=False, 
            workers=1
        )
    except KeyboardInterrupt:
        print("\n🛑 用户中断调试，正在退出...")
    except Exception as e:
        print(f"\n❌ 服务器发生致命错误: {e}")
        traceback.print_exc()
