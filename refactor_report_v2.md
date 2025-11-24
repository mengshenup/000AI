# 🛠️ 系统重构与修复报告 (System Refactoring & Fix Report)

## 1. 🐛 修复：刷新后图标位置重置 (Fix: Icon Reset on Refresh)

**原因**:
之前的代码存在“竞态条件” (Race Condition)。
*   前端启动时，`store.js` 开始异步从服务器下载 `window_memory.json`。
*   但 `main.js` 没有等待下载完成，就直接初始化了窗口管理器 (`wm.init()`)。
*   结果：窗口管理器使用了默认位置渲染图标。等数据下载回来时，图标已经画好了，且没有触发重绘。

**解决方案**:
*   **Store**: 增加了 `ready()` 方法，返回一个 Promise。
*   **Main**: 在 `window.onload` 中，第一件事就是 `await store.ready()`，确保拿到数据后再干活。

## 2. 📂 架构升级：系统应用分离 (System Apps Separation)

**变更**:
*   新建目录: `Angel_Client/js/apps_system/`。
*   **文件迁移**: 以下核心应用已移入新目录：
    *   `angel.js` (小天使)
    *   `task_manager.js` (任务管理器)
    *   `settings.js` (设置)
    *   `performance.js` (性能调优)
    *   `context_menu.js` (右键菜单)

## 3. 🚀 动态加载机制 (Dynamic Loading)

**变更**:
*   **后端**: 新增 API `/get_apps_list`，自动扫描 `apps` 和 `apps_system` 文件夹下的所有 `.js` 文件。
*   **前端**: `main.js` 不再硬编码导入应用。它会先询问后端有哪些应用，然后动态导入。
*   **优势**: 以后您只需在文件夹里新建一个 `.js` 文件，刷新页面就会自动加载，无需修改 `main.js` 或 `config.js`。

## 4. ⚡ 启动优先级与记忆策略 (Priority & Memory)

**逻辑**:
1.  **加载顺序**: 系统应用 (`apps_system`) 会被优先加载和注册。
2.  **启动策略**: 系统应用（如小天使）在启动时会被**强制打开**，不依赖之前的记忆（防止用户不小心关掉后找不到了）。
3.  **记忆策略**:
    *   **普通应用**: 记住所有状态 (位置、大小、是否打开)。
    *   **系统应用**: 记住位置和大小，但**不记住**“是否打开”的状态 (因为每次都强制打开)。

## 5. 💾 数据库版本控制 (Database Versioning)

**变更**:
*   **新格式**: `window_memory.json` 现在使用带版本号的格式：
    ```json
    {
      "version": "1.0",
      "apps": { ... }
    }
    ```
*   **兼容性**: 代码会自动检测。如果是旧格式（纯对象），会自动识别并兼容，不会报错。下次保存时会自动升级为新格式。

---
**状态**: ✅ 全部完成 (All Completed)
**操作**: 请重启服务器 (`start_server.bat`) 并刷新页面以生效。
