# 🐞 Agent_angel_server Bug Diagnosis Report

## 🚨 Critical Issues (阻止服务器启动或核心功能)

### 1. `ImportError`: `global_stream_manager` 未定义
- **位置**: `Agent_angel_server/Online/stream_manager.py`
- **现象**: `Nerve/websocket_server.py` 尝试导入 `global_stream_manager`，但在 `stream_manager.py` 文件末尾没有实例化该对象。
- **后果**: 服务器启动时直接崩溃。

### 2. WebSocket 逻辑缺失
- **位置**: `Agent_angel_server/Nerve/websocket_server.py` -> `neural_pathway`
- **现象**: 函数在 `await websocket.accept()` 后直接结束。
- **后果**: 客户端连接后立即断开，无法接收指令，无法发送视频流。Agent 处于“脑死亡”状态。

### 3. AI 大脑逻辑截断
- **位置**: `Agent_angel_server/Brain/gemini_client.py` -> `plan_next_action`
- **现象**: 代码在函数定义行后中断，缺少具体的 AI 决策逻辑。
- **后果**: Agent 无法根据截图规划下一步操作。

## 🛠️ Fix Plan (修复计划)

1.  **实例化单例**: 在 `stream_manager.py` 末尾添加 `global_stream_manager = StreamManager()`。
2.  **补全 AI 逻辑**: 在 `gemini_client.py` 中实现 `plan_next_action`，使其能调用 Gemini API 分析截图。
3.  **重写 WebSocket 循环**: 在 `websocket_server.py` 中实现完整的消息接收、处理循环，并集成 `stream_manager` 的启动与停止。
