# 🛠️ 存储架构重构报告 (Storage Refactoring Report)

## 1. 🎯 核心变更 (Core Changes)

我们已成功将桌面布局存储从浏览器的 `localStorage` 迁移到了 **客户端目录下的 JSON 文件** (`Angel_Client/Memorybank/apps.json`)。

### ✅ 变更清单
1.  **后端 (`Angel_Server/Memory/file_manager.py`)**:
    *   **动态路径查找**: 增加了智能路径查找逻辑。无论用户如何重命名 `Angel_Client` 文件夹，只要它包含 `index.html`，后端就能找到它。
    *   **自动初始化**: 如果 `Memorybank` 文件夹或 `apps.json` 文件不存在，系统会自动创建它们，防止首次启动报错。
    *   **存储位置**: 数据现在存储在 `Angel_Client/Memorybank/` 目录下，实现了“数据随客户端走”的需求。

2.  **前端 (`Angel_Client/js/store.js`)**:
    *   **移除 LocalStorage**: 彻底移除了 `save()` 和 `reset()` 方法中对 `localStorage` 的依赖。
    *   **API 对接**: `save()` 方法现在通过 `POST /save_layout` 接口将数据发送给后端。
    *   **新增 Reset**: 补充了缺失的 `reset()` 方法，现在可以通过 API 清空后端存档并刷新页面。
    *   **禁用指纹**: 暂时禁用了基于 LocalStorage 的版本指纹检查，避免冲突。

## 2. 🚀 如何验证 (How to Verify)

1.  **重启后端**: 关闭并重新运行 `start_server.bat` 以加载新的 Python 代码。
2.  **刷新前端**: 刷新浏览器页面。
3.  **测试保存**: 移动任意窗口（如“任务管理器”），然后刷新页面。窗口位置应该保持不变（数据已保存到文件）。
4.  **检查文件**: 打开 `Angel_Client/Memorybank/apps.json`，你应该能看到刚才保存的窗口坐标数据。
5.  **测试重置**: 打开“性能调优”应用 -> “紧急修复” -> “重置小天使状态”。页面应刷新，且所有窗口恢复默认位置。

## 3. ⚠️ 注意事项 (Notes)

*   **网络依赖**: 现在的保存和读取完全依赖后端 API。如果后端未启动，桌面布局将无法保存或读取（会使用默认值）。
*   **文件权限**: 请确保 `Angel_Client` 文件夹有写入权限（通常 Windows 默认都有）。

---
**状态**: ✅ 已完成 (Completed)
**下一步**: 享受您的纯文件存储版 Angel！✨
