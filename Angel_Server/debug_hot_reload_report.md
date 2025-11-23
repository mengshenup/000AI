# 🐞 热更新 (Hot Reload) 调试与分析报告

**日期**: 2025年11月24日
**状态**: 已启用 (Enabled)
**监听范围**: `Angel_Server/` (递归)
**排除范围**: `Memorybank/`, `*.log`, `*.tmp`, `.git`

---

## 1. 当前配置分析

我们已在 `Brain/main.py` 中启用了 Uvicorn 的热更新功能，并配置了排除项：

```python
uvicorn.run(
    "Nerve.fastapi_app:app",
    host="0.0.0.0", 
    port=8000,      
    reload=True,
    reload_dirs=["."],
    reload_excludes=["Memorybank", "Memorybank/*", "*.log", "*.tmp", ".git"],
    workers=1       
)
```

### ✅ 优点
1.  **开发效率高**：修改 `Brain` (逻辑) 或 `Nerve` (API) 代码后，服务器自动重启，无需手动开关。
2.  **避免无效重启**：排除了 `Memorybank` (浏览器缓存/用户数据)，防止因为浏览器写入缓存文件而导致服务器无限循环重启。

---

## 2. 潜在 BUG 与风险 (Critical Bugs)

经过代码审计，发现以下潜在问题，在实际开发中需要注意：

### 🔴 BUG 1: 浏览器僵尸进程 (Zombie Processes)
**严重程度**: 高
**描述**: 
当热更新触发时，Uvicorn 会杀死当前的 Python 进程并启动一个新的。
如果 `Body/browser_manager.py` 中的 Playwright 实例没有优雅关闭（Graceful Shutdown），**浏览器窗口 (msedge.exe / chrome.exe) 可能会残留在后台**。
**后果**: 
每次保存代码，都会多开一个浏览器窗口，最终导致内存耗尽或端口冲突。
**建议修复**:
确保在 `Nerve/fastapi_app.py` 的 `lifespan` 或 `shutdown` 事件中，强制调用 `browser_manager.stop()`。

### 🟠 BUG 2: 状态丢失 (State Loss)
**严重程度**: 中
**描述**: 
热更新本质是**重启进程**。这意味着：
1.  当前登录的网站 Session (内存中) 会丢失（但 Cookies 保存在 Memorybank 中，所以问题不大）。
2.  正在进行的任务（如正在爬取某个页面）会被强制中断。
**后果**: 
如果正在执行长任务，保存代码会导致任务失败。

### 🟡 BUG 3: 文件锁定 (Windows Specific)
**严重程度**: 低
**描述**: 
在 Windows 上，如果 Playwright 正在写入 `Memorybank/BrowserData` 下的某个文件，而此时 Uvicorn 试图扫描目录变动，可能会偶发 `PermissionError`。
**现状**: 
我们已经排除了 `Memorybank`，这大大降低了此风险。

---

## 3. 验证测试计划

建议执行以下测试来验证修复效果：

1.  **启动服务器**：运行 `start_server.bat`。
2.  **触发浏览器**：调用 API 打开一个网页。
3.  **修改代码**：在 `Brain/gemini_client.py` 中加一个空行并保存。
4.  **观察**：
    *   终端是否显示 `WARNING:  WatchFiles detected changes...`
    *   旧的浏览器窗口是否关闭？(如果没关闭，就是 BUG 1)
    *   新的服务器是否成功启动？
5.  **修改排除项**：在 `Memorybank/BrowserData` 里随便新建个文件。
    *   终端**不应该**有任何反应。

---

## 4. 结论

配置已生效，但**强烈建议**检查 `fastapi_app.py` 中的关闭逻辑，以防止浏览器僵尸进程。
