# 🐞 后端热更新 (Hot Reload) 社区问题与解决方案报告

**日期**: 2025年11月24日
**环境**: Windows + FastAPI (Uvicorn) + Playwright + Asyncio

---

## 1. 核心问题：Windows 上的进程锁与僵尸进程

在 Windows 平台上使用 `uvicorn` 的 `reload=True` 配合 `Playwright` 时，社区普遍反馈以下严重问题：

### 🔴 问题 A: 端口被占用 (Port Already in Use)
*   **现象**: 修改代码保存后，服务器尝试重启，但报错 `[WinError 10048] 通常每个套接字地址(协议/网络地址/端口)只允许使用一次`。
*   **原因**: 旧的 Python 进程虽然被杀死了，但它启动的子进程（如 Playwright 的 `node.exe` 或浏览器进程）可能还持有端口句柄，导致端口没有立即释放。
*   **解决方案**: 
    1.  使用 `stop_server.bat` 彻底清理。
    2.  在代码中显式处理 `shutdown` 事件，确保关闭所有连接。

### 🔴 问题 B: 浏览器实例残留 (Zombie Browsers)
*   **现象**: 每次热更新重启，都会新开一个浏览器窗口，旧的窗口不关闭。一小时开发下来，后台可能有几十个 `msedge.exe`。
*   **原因**: Uvicorn 的重载机制是粗暴地终止主进程，不会等待 `app.on_event("shutdown")` 里的逻辑执行完毕（特别是如果 shutdown 逻辑很慢的话）。
*   **社区建议**: 
    *   开发阶段尽量使用 `headless=False` 以便肉眼观察。
    *   编写专门的清理脚本（如我们的 `stop_server.bat`）。

### 🟡 问题 C: 事件循环冲突 (Event Loop Closed)
*   **现象**: 重启时出现 `RuntimeError: Event loop is closed`。
*   **原因**: Windows 上的 `ProactorEventLoop` 在进程终止时的清理行为与其他平台不同。
*   **解决方案**: 我们已经在 `fastapi_app.py` 中强制使用了 `WindowsProactorEventLoopPolicy`，这通常能解决大部分此类问题。

---

## 2. 最佳实践建议

1.  **排除无关文件**: 
    *   正如我们所做，必须排除 `Memorybank`、日志、文档等文件的监听，否则会陷入无限重启死循环。

2.  **手动重启优于自动重启**:
    *   对于涉及浏览器生命周期的重构（如修改 `Body/browser_manager.py`），建议**手动停止并重启**服务器，而不是依赖热更新。热更新更适合修改 API 逻辑 (`Nerve`) 或 AI 提示词 (`Brain`)。

3.  **使用 Watchfiles**:
    *   Uvicorn 内部使用 `watchfiles` 库。确保安装了最新版，它对 Windows 文件系统的事件监听更稳定。

---

## 3. 结论

目前我们的配置（排除特定目录 + 强制 Proactor 策略）已经是 Windows 平台下的最优解。但“僵尸浏览器”问题是架构层面的限制，无法通过简单的配置完美解决，只能依靠开发者的使用习惯（定期清理）来规避。
