# 🛠️ 命名规范与空白修复报告 (Naming & Blank Fix Report)

## 1. 🐛 修复：应用打开为空白 (Fix: Blank Apps)

**原因分析**:
之前的代码在从后端加载数据时，直接使用了 `this.apps = data`。这导致了一个严重的竞争条件：
1.  前端代码启动，注册了所有应用（包含了 HTML 内容、图标等元数据）。
2.  后端数据异步加载完成，直接**覆盖**了 `this.apps`。
3.  结果：`this.apps` 里只剩下了后端保存的坐标信息 (`pos`, `size`)，丢失了 `content` (HTML) 和 `icon` 等关键信息，导致窗口渲染为空白。

**解决方案**:
修改了 `Angel_Client/js/store.js` 中的 `syncFromClientDB` 方法。现在它会**智能合并**数据：
*   如果应用已存在（代码已注册），只更新位置和状态，保留 HTML 内容。
*   如果应用不存在（可能是旧数据），则暂时存储。

## 2. 🏷️ 命名与术语更新 (Naming & Terminology)

根据您的指示，进行了以下更名和注释更新：

*   **文件更名**: 存储文件由 `apps.json` 更名为 **`window_memory.json`** (窗口记忆)。
*   **术语统一**:
    *   `Angel_Client/Memorybank/` 目录现在被称为 **客户端数据库 (Client Database)**。
    *   不再使用 "客户端后端" 这种容易混淆的称呼。
*   **字段优化**:
    *   `save()` 方法不再保存 `description` 字段，因为它现在被视为动态数据（由代码控制）。

## 3. ⚠️ 服务器索引警告 (Server Indexing Warning)

在 `Angel_Server/Memory/file_manager.py` 中添加了注释警告：
*   目前服务器通过文件系统路径直接查找客户端数据库 (`Angel_Client/Memorybank`)。
*   **注意**: 这种方式仅适用于 Server 和 Client 在同一台机器上的情况。如果未来分离部署，Server 不应直接索引客户端文件，而应由客户端自行管理或通过 API 传输。

## 4. ✅ 验证步骤

1.  **重启后端**: 关闭并重新运行 `start_server.bat` (以生效文件名变更)。
2.  **刷新前端**: 刷新浏览器。
3.  **检查**:
    *   应用窗口应该能正常显示内容了（不再是空白）。
    *   移动窗口并刷新，位置应被记住。
    *   检查 `Angel_Client/Memorybank/` 目录，应该会自动生成一个新的 `window_memory.json` 文件。

---
**状态**: ✅ 已修复 (Fixed)
