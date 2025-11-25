# 架构重构报告 v3 (Architecture Refactor Report v3)

## 1. 核心变更
根据最新指令，项目结构已调整为：

### A. Web_compute_low (原 Web_Compute) - [低计算量前端]
*路径: `C:\000AI\Web_compute_low`*
- **包含内容**: 
    - 前端代码 (HTML/JS/CSS/Three.js)。
    - `start_client.bat`: 启动脚本，负责拉起前端和本地 Agent。
    - `start_agent.py`: 代理启动脚本，引用 `Agent_angel_client` 的代码。
- **角色**: 用户交互界面，负责 UI 渲染。虽然包含 Three.js，但相对于后端 AI 推理，被定义为“低计算量”。

### B. Web_compute_high (原 Web_Server) - [高计算量服务端]
*路径: `C:\000AI\Web_compute_high`*
- **包含内容**: 
    - `server.py`: FastAPI 服务。
- **角色**: 云端 Web 服务。用户可选择连接此服务以节省本地资源（未来扩展）。

### C. Agent_angel_client (原 Agent_Angel_Server) - [智能体客户端]
*路径: `C:\000AI\Agent_angel_client`*
- **包含内容**: 
    - `Brain/` (LLM)
    - `Body/` (Playwright)
    - `Eye/` (Screenshot)
    - `Hand/` (Mouse)
    - `Nerve/` (API)
    - `Memory/` (File Manager)
- **角色**: 运行在用户本地的智能体核心。包含 90% 的 Python 代码。

### D. Agent_angel_server (新) - [智能体服务端]
*路径: `C:\000AI\Agent_angel_server`*
- **包含内容**: 
    - `server.py`: 云端智能体编排服务。
- **角色**: 云端智能体管理与编排。

## 2. 部署模式支持

### 用户模式 (User Mode)
- **运行**: `Web_compute_low` + `Agent_angel_client`。
- **可选**: 连接 `Web_compute_high` (节省本地资源)。
- **启动**: 运行 `C:\000AI\Web_compute_low\start_client.bat`。

### 服务器模式 (Server Mode)
- **运行**: 必须运行所有 4 个组件。
    1. `Web_compute_low` (提供前端界面)
    2. `Web_compute_high` (提供 Web API)
    3. `Agent_angel_client` (提供基础智能体能力)
    4. `Agent_angel_server` (提供编排能力)

## 3. JS 运算量预估
已生成详细报告 `C:\000AI\js_computation_report.md`。
- **高计算量**: `window_manager.js`, `angel.js`, `task_manager.js`。
- **建议**: 将部分逻辑下放到 `Agent_angel_client` 或 `Web_compute_high`。
