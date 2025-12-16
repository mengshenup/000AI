# 设计文档

## 概述

本文档描述了Agent_angel_server的全面调试和测试系统设计。该系统将提供自动化测试套件、手动测试脚本和监控工具，以验证Rust + Python混合架构的所有功能。

**设计原则：新手友好**
- ✅ **最大化自动化**：能自动完成的绝不需要手动操作
- ✅ **零配置启动**：一键运行，自动检测和修复常见问题
- ✅ **清晰的提示**：每个步骤都有通俗易懂的说明
- ✅ **智能诊断**：自动分析问题并给出具体解决方案
- ✅ **渐进式引导**：从简单到复杂，逐步引导用户

调试系统由三个主要组件组成：

1. **一键测试工具**：零配置启动，自动运行所有测试并生成报告
2. **智能诊断助手**：自动检测问题，给出通俗易懂的修复建议
3. **可视化监控面板**：实时显示系统状态，无需理解技术细节

## 架构

### 被测系统架构

Agent_angel_server是一个Rust + Python混合架构：

- **Rust核心 (端口8000)**: 使用Axum框架，处理WebSocket连接、认证、消息路由、CDP流、成本监控
- **Python工作器 (端口8001)**: 使用FastAPI框架，处理浏览器自动化(Playwright)和AI处理(Gemini)

主要模块：
- **Brain/**: 主入口点(Main.rs, Main.py)、规划器(Planner.rs)、认知系统
- **Body/**: 浏览器控制(BodyClient.rs, Playwright.py)、AI(Gemini.py)
- **Memory/**: 共享状态(AppState.rs)、数据模型、配置、接口
- **Energy/**: 网络(Gateway.rs, CDPstream.rs)、成本监控、任务

### 测试系统架构

测试系统分为三层：

1. **自动化测试层**
   - Rust单元测试 (cargo test)
   - Python单元测试 (pytest)
   - 集成测试 (端到端场景)

2. **手动测试层**
   - CLI测试运行器 (交互式菜单)
   - 健康检查脚本 (启动验证、端点测试)
   - 性能分析器 (内存、CPU、延迟监控)

3. **报告层**
   - HTML仪表板 (图表和图形)
   - JSON结果 (CI/CD集成)
   - 日志聚合 (错误高亮)

## 组件和接口

### 1. 自动化测试套件

#### 1.1 Rust单元测试

**位置**: `Agent_angel_server/tests/rust/`

**测试模块**:
- `gateway_tests.rs`: WebSocket处理、消息路由、广播功能
- `cognitive_tests.rs`: 任务管理、持久化、认知循环
- `body_client_tests.rs`: HTTP客户端、Python通信
- `cost_monitor_tests.rs`: 成本跟踪、指标聚合
- `key_manager_tests.rs`: RocksDB操作、密钥存储/检索
- `cdp_stream_tests.rs`: CDP连接、帧捕获

**测试框架**: Rust内置测试框架 + `tokio::test`

**Mock策略**: 使用`mockito`进行HTTP模拟，内存RocksDB进行数据库测试

#### 1.2 Python单元测试

**位置**: `Agent_angel_server/tests/python/`

**测试模块**:
- `test_interface.py`: FastAPI端点、请求/响应验证
- `test_playwright.py`: 浏览器自动化、会话管理
- `test_gemini.py`: AI API调用、响应解析
- `test_tasks.py`: 成本同步、后台任务
- `test_config.py`: 配置加载

**测试框架**: `pytest` + `pytest-asyncio`

**Mock策略**: 使用`pytest-mock`进行函数模拟，`aioresponses`进行HTTP模拟

#### 1.3 集成测试

**位置**: `Agent_angel_server/tests/integration/`

**测试场景**:
- `test_full_workflow.py`: 完整用户工作流（连接到任务完成）
- `test_rust_python_comm.py`: 跨服务通信验证
- `test_cdp_streaming.py`: CDP流与活动浏览器会话
- `test_concurrent_sessions.py`: 多个同时用户会话
- `test_error_recovery.py`: 错误处理和恢复场景

**测试框架**: `pytest` + 自定义fixtures

### 2. 新手友好测试工具

#### 2.1 一键测试启动器（零配置）

**位置**: `Agent_angel_server/Debug/run_tests.bat` (Windows) / `run_tests.sh` (Linux)

**功能**:
- **零配置启动**：双击即可运行，无需任何设置
- **自动环境检查**：
  - 自动检测Python、Rust、WSL是否安装
  - 自动检测依赖包是否安装（requirements.txt、Cargo.toml）
  - 缺少依赖时自动提示安装命令（可一键执行）
- **智能端口管理**：
  - 自动检测端口8000/8001是否被占用
  - 如果被占用，提示是否自动关闭占用进程
  - 显示占用进程的详细信息（进程名、PID）
- **自动服务启动**：
  - 自动启动Rust和Python服务
  - 等待服务就绪后再运行测试
  - 测试完成后自动清理（可选）
- **进度可视化**：
  - 显示彩色进度条和百分比
  - 实时显示当前测试项
  - 预估剩余时间
- **新手模式**：
  - 默认启用，显示每个步骤的详细解释
  - 可切换到"专家模式"（只显示结果）

**使用示例**:
```bash
# Windows用户：双击运行
Debug\run_tests.bat

# Linux用户：
./Debug/run_tests.sh

# 输出示例：
╔════════════════════════════════════════════════════════╗
║   🚀 Agent Angel Server 一键测试工具                   ║
║   新手友好 | 零配置 | 自动化                           ║
╚════════════════════════════════════════════════════════╝

[1/6] 🔍 检查环境...
  ✅ Python 3.14 已安装
  ✅ Rust 1.91.1 已安装
  ✅ WSL2 已启动
  ✅ 所有依赖已安装

[2/6] 🔌 检查端口...
  ⚠️  端口8000被占用 (进程: old_server.exe, PID: 12345)
  
  💡 提示: 需要关闭占用端口的进程才能继续测试
  
  是否自动关闭该进程? [Y/n]: Y
  ✅ 进程已关闭

[3/6] 🚀 启动服务...
  ⏳ 启动Rust核心... (预计10秒)
  ✅ Rust核心已启动 (端口8000)
  ⏳ 启动Python工作器... (预计5秒)
  ✅ Python工作器已启动 (端口8001)

[4/6] 🧪 运行测试...
  [████████████████████████████░░░░] 75% (12/16)
  当前: 测试WebSocket连接...
  预计剩余: 15秒

[5/6] 📊 生成报告...
  ✅ HTML报告: Debug/reports/test_report.html
  ✅ JSON结果: Debug/reports/test_results.json

[6/6] 🎉 测试完成！
  ✅ 通过: 14个
  ❌ 失败: 2个
  总耗时: 45秒

  失败的测试:
    ❌ Gemini API连接
       原因: API密钥未配置
       💡 解决: 运行 python Debug/set_api_key.py 设置密钥
       
    ❌ CDP视频流
       原因: Chrome未安装
       💡 解决: 运行 playwright install chromium

是否查看详细报告? [Y/n]: Y
(自动在浏览器中打开HTML报告)

是否自动修复问题? [Y/n]: Y
  ⏳ 正在设置API密钥...
  ⏳ 正在安装Chrome...
  ✅ 问题已修复！

是否重新运行失败的测试? [Y/n]: Y
  ✅ 所有测试通过！🎉
```

#### 2.2 智能诊断助手

**位置**: `Agent_angel_server/Debug/diagnose.py`

**功能**:
- **自动问题检测**：
  - 扫描日志文件查找错误
  - 检查配置文件是否正确
  - 验证网络连接
  - 检查文件权限
- **通俗易懂的解释**：
  - 用日常语言解释技术问题
  - 提供类比和示例
  - 避免使用专业术语
- **分步修复指南**：
  - 每个问题提供3-5个具体步骤
  - 每步都有截图或命令示例
  - 标注哪些步骤可以自动完成
- **一键修复**：
  - 常见问题提供自动修复选项
  - 修复前显示将要执行的操作
  - 修复后自动验证

**使用示例**:
```bash
python Debug/diagnose.py

# 输出：
🔍 智能诊断助手
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

正在扫描系统...

发现 3 个问题：

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ 问题 1: Rust服务无法启动
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤔 这是什么意思?
   Rust服务就像一个"接线员"，负责接收和转发消息。
   现在这个接线员无法上班，所以整个系统无法工作。

🔍 可能的原因:
   1. 端口8000被其他程序占用（就像座位被别人占了）
   2. 数据库文件被锁定（就像钥匙被别人拿走了）
   3. 配置文件有错误（就像地址写错了）

💡 建议的解决方案:

   方案1: 释放被占用的端口 [推荐] [可自动修复]
   ├─ 步骤1: 找到占用端口的程序
   │  命令: netstat -ano | findstr 8000
   ├─ 步骤2: 关闭该程序
   │  命令: taskkill /PID <进程ID> /F
   └─ 步骤3: 重新启动Rust服务
      命令: cargo run

   方案2: 解锁数据库文件 [可自动修复]
   ├─ 步骤1: 删除锁文件
   │  位置: Memorybank/keys_db/LOCK
   └─ 步骤2: 重新启动服务

是否自动执行方案1? [Y/n]: Y

⏳ 正在执行...
  ✅ 找到占用进程: old_server.exe (PID: 12345)
  ✅ 已关闭进程
  ✅ 端口8000已释放
  ⏳ 重新启动Rust服务...
  ✅ Rust服务启动成功！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 问题 2: API密钥未配置
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤔 这是什么意思?
   API密钥就像你的"会员卡号"，用来访问Gemini AI服务。
   现在系统找不到这个卡号，所以无法使用AI功能。

💡 解决方案: [可自动修复]
   
   我可以帮你设置API密钥，需要你提供：
   1. 你的Gemini API密钥（从 https://makersuite.google.com/app/apikey 获取）
   
   📝 如何获取API密钥:
      1. 访问上面的网址
      2. 登录你的Google账号
      3. 点击"Create API Key"按钮
      4. 复制生成的密钥（类似: AIzaSyD...）

是否现在设置? [Y/n]: Y

请输入你的Gemini API密钥: AIzaSyD...
✅ API密钥已保存到数据库
✅ 正在验证密钥...
✅ 密钥有效！可以使用AI功能了

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 所有问题已解决！

是否运行测试验证修复? [Y/n]: Y
⏳ 运行测试...
✅ 所有测试通过！
```

#### 2.3 交互式测试菜单（可选）

**位置**: `Agent_angel_server/Debug/test_menu.py`

**功能**:
- 为高级用户提供更细粒度的控制
- 可以选择运行特定测试
- 查看测试历史和趋势
- 比较不同版本的测试结果

**接口**:
```python
class TestRunner:
    def run_menu(self) -> None  # 运行交互式菜单
    def run_category(self, category: str) -> TestResults  # 运行测试类别
    def run_single_test(self, test_id: str) -> TestResult  # 运行单个测试
    def display_results(self, results: TestResults) -> None  # 显示结果
    def show_test_guide(self, test_id: str) -> None  # 显示测试指南
    def auto_fix_issues(self, results: TestResults) -> None  # 自动修复问题
```

#### 2.4 自动健康检查（后台运行）

**位置**: `Agent_angel_server/Debug/health_monitor.py`

**功能**:
- **持续监控**：
  - 每30秒自动检查一次系统健康状况
  - 检测到问题立即通知
  - 记录健康历史趋势
- **智能告警**：
  - 问题严重程度分级（信息、警告、错误、严重）
  - 桌面通知（Windows通知中心）
  - 可选：发送邮件或Webhook
- **自动恢复**：
  - 服务崩溃时自动重启
  - 端口冲突时自动切换端口
  - 内存泄漏时自动重启服务
- **新手友好的通知**：
  ```
  🔔 通知
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️  Python服务停止响应
  
  🤔 这意味着什么?
     负责浏览器控制的服务停止工作了，
     就像工人突然离开了岗位。
  
  💡 我已经自动重启了服务
     现在一切正常了！
  
  📊 详细信息: 点击查看
  ```

**使用示例**:
```bash
# 启动健康监控（后台运行）
python Debug/health_monitor.py --start

# 输出：
✅ 健康监控已启动
   监控间隔: 30秒
   自动恢复: 已启用
   桌面通知: 已启用

   监控中... (按Ctrl+C停止)

# 检测到问题时自动处理：
[14:23:15] ⚠️  检测到问题: Python服务无响应
[14:23:16] 🔧 正在自动修复...
[14:23:18] ✅ Python服务已重启
[14:23:20] ✅ 所有服务恢复正常
```

#### 2.5 可视化性能监控

**位置**: `Agent_angel_server/Debug/performance_monitor.py`

**功能**:
- **实时仪表板**：
  - 在终端显示彩色图表
  - 自动刷新（每秒）
  - 支持缩放和历史回放
- **通俗易懂的指标**：
  ```
  📊 系统性能监控
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  💾 内存使用
     Rust:   [████████░░] 156 MB / 200 MB (78%)
     Python: [██████████] 423 MB / 500 MB (85%) ⚠️ 接近上限
     
     💡 提示: Python内存使用较高，但仍在正常范围
  
  ⚡ CPU使用
     Rust:   [███░░░░░░░] 12% (正常)
     Python: [██░░░░░░░░] 8% (正常)
  
  🌐 网络性能
     WebSocket延迟: 45ms (优秀 ✅)
     HTTP延迟: 120ms (良好 ✅)
     
     💡 提示: 延迟越低越好，当前性能很棒！
  
  📹 视频流
     帧率: 12 FPS (流畅 ✅)
     抖动: 8ms (稳定 ✅)
     
     💡 提示: 帧率>10就很流畅了
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  总体评分: 🟢 优秀 (92/100)
  
  按 'h' 查看帮助 | 按 'q' 退出
  ```

- **性能建议**：
  - 自动分析性能瓶颈
  - 给出优化建议
  - 用日常语言解释
  ```
  💡 性能优化建议:
  
  1. Python内存使用偏高
     原因: 可能有内存泄漏或缓存过多
     建议: 定期重启Python服务（每24小时）
     影响: 可以节省约100MB内存
     
  2. WebSocket延迟波动
     原因: 网络不稳定或消息队列积压
     建议: 检查网络连接，考虑增加消息处理线程
     影响: 可以减少20%的延迟波动
  ```

**接口**:
```python
class PerformanceMonitor:
    def start_dashboard(self) -> None  # 启动实时仪表板
    def get_metrics(self) -> Metrics  # 获取当前指标
    def get_score(self) -> int  # 获取性能评分(0-100)
    def get_suggestions(self) -> List[Suggestion]  # 获取优化建议
    def export_report(self, format: str) -> str  # 导出报告
```

### 3. 测试报告生成器

**位置**: `Agent_angel_server/Debug/report_generator.py`

**输出格式**:
- HTML仪表板（带图表和图形）
- JSON结果（用于CI/CD集成）
- Markdown摘要（用于文档）
- 日志聚合（带错误高亮）

**接口**:
```python
class ReportGenerator:
    def generate_html(self, results: TestResults) -> str  # 生成HTML
    def generate_json(self, results: TestResults) -> str  # 生成JSON
    def generate_markdown(self, results: TestResults) -> str  # 生成Markdown
    def aggregate_logs(self, log_paths: List[str]) -> str  # 聚合日志
```

## 数据模型

### 测试结果模型

```python
@dataclass
class TestResult:
    test_id: str  # 测试ID
    test_name: str  # 测试名称
    category: str  # 测试类别
    status: TestStatus  # 状态: PASS, FAIL, SKIP, ERROR
    duration_ms: float  # 持续时间（毫秒）
    error_message: Optional[str]  # 错误消息
    stack_trace: Optional[str]  # 堆栈跟踪
    logs: List[str]  # 日志
    timestamp: datetime  # 时间戳

@dataclass
class TestResults:
    total: int  # 总数
    passed: int  # 通过数
    failed: int  # 失败数
    skipped: int  # 跳过数
    errors: int  # 错误数
    duration_ms: float  # 总持续时间
    results: List[TestResult]  # 结果列表
    
@dataclass
class HealthStatus:
    component: str  # 组件名称
    status: ComponentStatus  # 状态: HEALTHY, DEGRADED, UNHEALTHY
    checks: Dict[str, bool]  # 检查项
    diagnostics: Dict[str, Any]  # 诊断信息
    suggestions: List[str]  # 修复建议
```

### 性能指标模型

```python
@dataclass
class Metrics:
    timestamp: datetime  # 时间戳
    rust_memory_mb: float  # Rust内存使用（MB）
    python_memory_mb: float  # Python内存使用（MB）
    rust_cpu_percent: float  # Rust CPU使用率
    python_cpu_percent: float  # Python CPU使用率
    ws_latency_ms: float  # WebSocket延迟（毫秒）
    http_latency_ms: float  # HTTP延迟（毫秒）
    cdp_fps: float  # CDP帧率
    cdp_jitter_ms: float  # CDP抖动（毫秒）
    
@dataclass
class ProfileReport:
    start_time: datetime  # 开始时间
    end_time: datetime  # 结束时间
    duration_s: float  # 持续时间（秒）
    metrics_history: List[Metrics]  # 指标历史
    summary: Dict[str, Any]  # 摘要
    anomalies: List[str]  # 异常
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性1: 服务启动完整性
*对于任何*系统启动序列，Rust核心和Python工作器都应成功初始化所有必需组件并绑定到各自的端口，不出现错误。
**验证: 需求 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5**

### 属性2: WebSocket连接生命周期
*对于任何*到/ws/{user_id}的客户端连接，系统应建立连接，在连接池中维护它，双向处理消息，并在断开连接时清理资源。
**验证: 需求 3.1, 3.3, 3.4**

### 属性3: 浏览器会话隔离
*对于任何*并发浏览器会话集，每个会话应独立运行而不发生资源冲突，关闭一个会话不应影响其他会话。
**验证: 需求 4.4**

### 属性4: 动作执行可靠性
*对于任何*有效的浏览器动作（导航、点击、输入、截图），系统应执行该动作并返回成功响应或描述性错误消息。
**验证: 需求 5.1, 5.2, 5.3, 5.4, 5.5**

### 属性5: CDP流一致性
*对于任何*活动的CDP流，系统应以一致的速率持续传递视频帧，直到流被明确停止或客户端断开连接。
**验证: 需求 6.2, 6.3, 6.5**

### 属性6: 任务持久化往返
*对于任何*在认知系统中创建的任务，保存然后加载该任务应产生具有相同属性的等效任务。
**验证: 需求 7.2, 7.3**

### 属性7: 成本跟踪累积
*对于任何*API调用序列，成本监控器报告的总成本应等于各个调用成本的总和。
**验证: 需求 9.1, 9.2, 9.4**

### 属性8: 密钥存储往返
*对于任何*存储在密钥管理器中的API密钥，检索密钥应返回与存储时完全相同的值。
**验证: 需求 10.1, 10.2**

### 属性9: 跨服务通信可靠性
*对于任何*从Rust到Python或反之的HTTP请求，系统应成功完成请求或返回带有诊断信息的网络错误。
**验证: 需求 11.1, 11.2, 11.3**

### 属性10: 错误处理优雅降级
*对于任何*错误条件（超时、无效输入、服务不可用），系统应记录错误，返回适当的错误响应，并继续处理后续请求。
**验证: 需求 12.1, 12.2, 12.3, 12.4, 12.5**

### 属性11: 端到端工作流完成
*对于任何*完整工作流（连接→创建会话→执行动作→关闭会话），如果所有单独步骤成功，整个工作流应无错误完成。
**验证: 需求 13.1, 13.2**

### 属性12: 中断时资源清理
*对于任何*在执行中被中断的工作流，系统应清理分配的资源（连接、浏览器会话、数据库句柄）并允许新工作流启动。
**验证: 需求 13.5**

## 错误处理

### 错误类别

1. **网络错误**: 连接超时、连接被拒绝、DNS失败
2. **验证错误**: 无效JSON、缺少必需字段、类型不匹配
3. **资源错误**: 端口已被占用、文件未找到、数据库锁定
4. **外部服务错误**: Gemini API失败、浏览器崩溃、CDP断开连接
5. **逻辑错误**: 无效状态转换、断言失败

### 错误处理策略

**Rust核心**:
- 对所有可能失败的操作使用`Result<T, E>`
- 使用`tracing::error!`记录错误，包含完整上下文
- 返回带有错误代码的结构化错误响应
- 对瞬态网络错误实现重试逻辑
- 使用RAII模式在错误路径中清理资源

**Python工作器**:
- 使用try-except块处理特定异常类型
- 使用`logging.error`记录完整堆栈跟踪
- 返回带有状态码和详细信息的FastAPI HTTPException
- 对API速率限制实现指数退避
- 使用上下文管理器进行资源清理

**集成点**:
- 在服务边界验证JSON模式
- 包含请求ID以跨服务跟踪错误
- 对失败的外部服务实现断路器
- 尽可能提供回退响应

## 测试策略

### 单元测试

**Rust单元测试**:
- 使用`#[cfg(test)]`模块隔离测试每个模块
- Mock外部依赖（HTTP客户端、数据库）
- 使用`tokio::test`测试异步函数
- 核心逻辑代码覆盖率目标80%+
- 使用`cargo test --all-features`运行

**Python单元测试**:
- 使用pytest隔离测试每个模块
- Mock外部依赖（Playwright、Gemini API）
- 使用`pytest-asyncio`测试异步函数
- 核心逻辑代码覆盖率目标80%+
- 使用`pytest tests/python/ --cov`运行

**测试组织**:
- 每个源文件一个测试文件
- 使用测试模块/类分组相关测试
- 使用描述性测试名称: `test_<函数>_<场景>_<预期>`
- 包含正面和负面测试用例
- 测试边缘情况（空输入、边界值、null/None）

### 集成测试

**测试场景**:
1. **服务启动**: 启动两个服务并验证健康端点
2. **WebSocket流程**: 连接客户端、发送消息、接收响应、断开连接
3. **浏览器自动化**: 创建会话、导航、截图、关闭会话
4. **CDP流**: 启动流、验证帧传递、停止流
5. **任务执行**: 创建任务、验证认知循环处理它、检查持久化
6. **错误恢复**: 触发错误、验证优雅处理、验证系统继续运行

**测试环境**:
- 使用Docker Compose实现可重现的测试环境
- 每次测试运行启动新实例
- 每次测试后清理资源
- 使用测试专用端口避免冲突
- Mock外部API（Gemini）以避免速率限制

### 属性测试

**框架**: Rust使用`proptest`，Python使用`hypothesis`

**要测试的属性**:
- 任务序列化/反序列化往返
- 成本计算交换律（顺序无关）
- WebSocket消息顺序保持
- 浏览器动作幂等性（可安全重试）

**配置**:
- 每个属性运行最少100次迭代
- 使用收缩找到最小失败示例
- 用设计文档引用标记每个属性测试

### 手动测试

**测试类别**:
1. **启动测试**: 验证两个服务正确启动
2. **WebSocket测试**: 测试连接、消息传递、断开连接
3. **浏览器测试**: 测试会话管理和自动化
4. **AI测试**: 测试Gemini集成和响应处理
5. **CDP测试**: 测试视频流功能
6. **集成测试**: 测试完整工作流

**测试执行**:
- 使用CLI测试运行器进行交互式测试
- 手动测试前运行健康检查
- 测试期间使用分析器监控性能
- 测试完成后生成报告

### 性能测试

**要测量的指标**:
- 服务启动时间（< 5秒）
- WebSocket消息延迟（< 100ms）
- HTTP请求延迟（< 200ms）
- CDP帧率（> 10 FPS）
- 内存使用（Rust < 200MB，Python < 500MB）
- CPU使用（正常负载下< 50%）

**负载测试**:
- 测试1、5、10个并发会话
- 测量性能降级
- 识别瓶颈和资源限制
- 测试10分钟持续负载

**工具**:
- 自定义分析器进行实时监控
- `psutil`获取系统指标
- `time`模块测量延迟
- 生成带图表的性能报告

### 持续集成

**CI管道**:
1. 运行Rust单元测试（`cargo test`）
2. 运行Python单元测试（`pytest`）
3. 运行集成测试（Docker Compose）
4. 生成覆盖率报告
5. 运行linter（clippy、pylint）
6. 构建产物

**测试执行**:
- 每次提交到主分支时运行
- 在拉取请求时运行
- 如果测试失败或覆盖率下降则构建失败
- 生成并发布测试报告

## 实现说明

### 测试数据管理

**Fixtures**:
- 为常见场景创建可重用的测试fixtures
- Python测试使用pytest fixtures
- Rust测试使用测试辅助函数
- 将测试数据存储在`tests/fixtures/`目录

**Mock数据**:
- 为外部API创建真实的mock响应
- 使用录制的HTTP交互进行回放
- 为属性测试生成随机测试数据
- 每次测试后清理测试数据

### 日志和调试

**日志级别**:
- ERROR: 测试失败、意外错误
- WARN: 测试跳过、性能降级
- INFO: 测试进度、主要里程碑
- DEBUG: 详细测试执行、变量值

**日志聚合**:
- 收集Rust和Python服务的日志
- 包含时间戳和请求ID
- 在报告中高亮错误和警告
- 提供日志过滤和搜索

### 测试维护

**最佳实践**:
- 保持测试简单和专注
- 避免测试相互依赖
- 需求变更时更新测试
- 删除过时的测试
- 记录复杂的测试场景
- 及时审查测试失败

**重构**:
- 将通用测试逻辑提取到辅助函数
- 对类似场景使用参数化测试
- 保持测试代码DRY（不要重复自己）
- 像对待生产代码一样维护测试代码质量
