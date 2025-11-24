# 架构重构报告 v2 (Architecture Refactor Report v2)

## 1. 核心变更
根据最新指令，项目结构已调整为：

### A. Web_Compute (原 Web_Client) - [高计算量前端]
*路径: `C:\000AI\Web_Compute`*
- **包含内容**: 
    - 前端代码 (HTML/JS/CSS/Three.js)。
    - `start_client.bat`: 启动脚本，负责拉起前端和本地 Agent。
    - `start_agent.py`: 代理启动脚本，引用 `Agent_Angel_Server` 的代码。
- **角色**: 用户交互界面，负责 3D 渲染 (High Compute JS)。

### B. Web_Server - [低计算量服务端]
*路径: `C:\000AI\Web_Server`*
- **包含内容**: 
    - `server.py`: 轻量级 FastAPI 服务。
- **角色**: 云端轻量级服务，负责鉴权、静态分发、多端同步。

### C. Agent_Angel_Server - [智能体核心]
*路径: `C:\000AI\Agent_Angel_Server`*
- **包含内容**: 
    - `Brain/` (LLM)
    - `Body/` (Playwright)
    - `Eye/` (Screenshot)
    - `Hand/` (Mouse)
    - `Nerve/` (API)
    - `Memory/` (File Manager)
- **角色**: 智能体的大脑和身体。目前代码 90% 集中于此。
- **部署方式**: 
    - **本地模式**: 由 `Web_Compute` 的 `start_agent.py` 引用并启动，利用用户本地算力。
    - **云端模式**: 可独立部署在 GPU 服务器上。

## 2. 关键修正
1.  **目录重命名**: `Web_Client` -> `Web_Compute`。
2.  **代码迁移**: 将 `Web_Compute/Client_Core` 中的所有 Python 模块移动到 `Agent_Angel_Server`。
3.  **路径修复**:
    -   `Agent_Angel_Server/Memory/file_manager.py`: 修正了查找 `Web_Compute` 目录的逻辑，确保能找到 `window_memory.json`。
    -   `Agent_Angel_Server/Nerve/fastapi_app.py`: 修正了 `.env` 加载路径，指向 `Web_Compute/Memorybank/.env`。
    -   `Web_Compute/start_agent.py`: 更新了 `sys.path`，使其能正确引用 `Agent_Angel_Server` 中的模块。

## 3. 运行说明
- **启动**: 运行 `C:\000AI\Web_Compute\start_client.bat`。
- **效果**: 
    - 启动前端 (Port 5500)。
    - 启动本地 Agent (Port 8000, 代码源自 `Agent_Angel_Server`)。
