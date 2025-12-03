import sys
import os
import asyncio

# 尝试导入 watchfiles，如果不存在则提示安装
try:
    from watchfiles import run_process, DefaultFilter
except ImportError:
    print("❌ 错误: 未找到 'watchfiles' 模块。")
    print("请运行: pip install watchfiles")
    sys.exit(1)

def start_server_worker():
    """
    工作进程函数
    每次代码变更后，watchfiles 会在一个全新的进程中执行此函数。
    这确保了 EventLoop 策略被彻底重置，完美解决 Playwright 在 Windows 下的兼容性问题。
    """
    # 1. 强制设置 Windows 事件循环策略 (关键步骤)
    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("✅ [Worker] WindowsProactorEventLoopPolicy 已激活")

    # 2. 导入 Uvicorn 和 App
    # 必须在函数内部导入，防止被父进程缓存
    import uvicorn
    
    # 确保当前目录在 sys.path 中
    sys.path.insert(0, os.getcwd())
    
    try:
        from Nerve.fastapi_app import app
    except ImportError:
        # 容错：尝试添加项目根目录
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sys.path.append(root_dir)
        from Nerve.fastapi_app import app

    # 3. 启动 Uvicorn
    # 注意：这里必须关闭 reload，因为外部的 watchfiles 已经在负责热更新了
    print(f"🚀 [Worker] Uvicorn 正在启动 (PID: {os.getpid()})...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False, # ❌ 关闭内置热更新
        workers=1
    )

if __name__ == "__main__":
    print("\n🔥 [HotReload] 增强型热更新守护进程 (v3.0) 已启动")
    print("💡 原理: 使用 watchfiles 替代 uvicorn.reload，彻底隔离进程环境")
    print(f"📂 监听目录: {os.getcwd()}")
    
    # 配置过滤器 (使用 watch_filter 参数替代 ignore_patterns)
    # DefaultFilter 会自动忽略常见隐藏文件，我们只需添加自定义规则
    ignore_patterns = [
        r"Memorybank", r"Debug", r"__pycache__", r"\.venv", r"\.vscode", r"\.git", # 目录
        r".*\.log$", r".*\.tmp$", r".*\.md$", r".*\.bat$", r".*\.txt$" # 文件后缀
    ]
    
    try:
        # 启动文件监控
        run_process(
            ".",
            target=start_server_worker,
            watch_filter=DefaultFilter(ignore_entity_patterns=ignore_patterns)
        )
    except KeyboardInterrupt:
        print("\n🛑 服务已停止")
