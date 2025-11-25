# 部署结构重构报告 (Deployment Structure Refactor Report)

## 1. 新增部署目录
为了支持“用户模式”和“服务器模式”的分离与共存，创建了以下两个部署目录：

### A. Client_Deploy (客户端部署包)
*路径: `C:\000AI\Client_Deploy`*
- **目标用户**: 普通用户。
- **包含文件**:
    - `start_client.bat`: 一键启动脚本。
    - `setup_client.bat`: 依赖安装脚本。
    - `requirements.txt`: 依赖列表。
- **启动逻辑**:
    1. 启动 `Agent_angel_client` (本地智能体, Port 8000)。
    2. 启动 `Web_compute_low` (前端, Port 5500)。
    3. 自动打开浏览器。

### B. Server_Deploy (服务器部署包)
*路径: `C:\000AI\Server_Deploy`*
- **目标用户**: 服务器管理员 / 完整部署。
- **包含文件**:
    - `start_server.bat`: 全栈启动脚本。
    - `setup_server.bat`: 依赖安装脚本。
    - `requirements.txt`: 完整依赖列表。
- **启动逻辑**:
    1. 启动 `Agent_angel_client` (Port 8000)。
    2. 启动 `Web_compute_high` (Web API, Port 8080)。
    3. 启动 `Agent_angel_server` (Agent Orchestrator, Port 8081)。
    4. 启动 `Web_compute_low` (前端, Port 5500)。

## 2. 核心组件结构 (保持不变)
- `Web_compute_low`: 前端代码 + 本地 Agent 启动器。
- `Web_compute_high`: 云端 Web 服务代码。
- `Agent_angel_client`: 智能体核心代码 (Brain/Body/etc)。
- `Agent_angel_server`: 智能体编排服务代码。

## 3. 模式支持验证
- **用户模式**: 仅需运行 `Client_Deploy` 中的脚本，即可获得完整的前端交互和本地 AI 能力。
- **服务器模式**: 运行 `Server_Deploy` 中的脚本，将同时拉起所有 4 个服务，满足服务器必须全栈运行的需求。
- **代码复用**: 两个部署包均引用同一套源代码 (`..\Web_compute_low`, `..\Agent_angel_client` 等)，确保代码维护的一致性。
