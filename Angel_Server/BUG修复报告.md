# 🐛 BUG 分析与修复报告

## 1. 问题描述
用户反馈 `start_server.bat` 启动时卡住或崩溃，控制台报错：
```text
ImportError: cannot import name 'stealth_async' from 'playwright_stealth'
```

## 2. 原因分析
*   **依赖库版本变更**：项目依赖的 `playwright-stealth` 库自动安装了最新版 **2.0.0**。
*   **API 不兼容**：该版本进行了重构，移除了旧版的 `stealth_async` 函数，改为使用面向对象的 `Stealth` 类。
*   **代码未适配**：`services/browser.py` 中依然尝试导入和使用旧版函数，导致 Python 解释器在启动阶段抛出 `ImportError`，进而导致 Uvicorn 服务器启动失败或陷入重启循环。

## 3. 修复方案 (已实施)

### A. 代码适配
修改 `Angel_Server/services/browser.py`：
1.  **导入变更**：
    *   ❌ `from playwright_stealth import stealth_async`
    *   ✅ `from playwright_stealth import Stealth`
2.  **调用变更**：
    *   ❌ `await stealth_async(self.page)`
    *   ✅ `await Stealth().apply_stealth_async(self.page)`

### B. 容错增强 (新增)
为了防止因 Chrome 未安装导致服务器再次卡死，将增加**自动降级机制**：
*   优先尝试启动系统 Chrome (以获得最佳抗指纹效果)。
*   如果启动失败 (如未安装 Chrome)，自动降级为 Playwright 自带的 Chromium。

## 4. 验证结果
*   检查 `playwright-stealth` 2.0.0 的 API 签名，确认 `Stealth().apply_stealth_async()` 是正确的调用方式。
*   服务器现在应能正常启动，不再报 Import 错误。
