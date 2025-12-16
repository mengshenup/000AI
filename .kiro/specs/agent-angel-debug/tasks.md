# 实施计划

## 任务列表

- [x] 1. 创建项目结构和基础工具


  - 创建Debug/agent-angel-debug目录结构
  - 设置测试框架和依赖
  - 创建通用工具类和辅助函数
  - _需求: 所有需求_

- [x] 1.1 创建目录结构



  - 创建 `Debug/agent-angel-debug/` 主目录（本spec的所有文件）
  - 创建 `Debug/agent-angel-debug/utils/` 工具类目录
  - 创建 `Debug/agent-angel-debug/health_checks/` 健康检查目录
  - 创建 `Debug/agent-angel-debug/tests/` 测试代码目录
  - 创建 `Debug/agent-angel-debug/tests/rust/` Rust测试目录
  - 创建 `Debug/agent-angel-debug/tests/python/` Python测试目录
  - 创建 `Debug/agent-angel-debug/tests/integration/` 集成测试目录
  - 创建 `Debug/agent-angel-debug/tests/fixtures/` 测试数据目录
  - 创建 `Debug/agent-angel-debug/reports/` 报告输出目录
  - 创建 `Debug/agent-angel-debug/reports/.gitignore` 忽略报告文件
  - _需求: 所有需求_

- [x] 1.2 设置Python测试依赖


  - 更新 `requirements.txt` 添加测试库（pytest, pytest-asyncio, aioresponses）
  - 创建 `Debug/requirements-test.txt` 测试专用依赖
  - 添加性能监控库（psutil, rich）
  - 添加HTTP测试库（httpx, websockets）
  - _需求: 所有需求_

- [x] 1.3 创建通用工具类


  - 创建 `Debug/agent-angel-debug/utils/common.py` 通用辅助函数
  - 创建 `Debug/agent-angel-debug/utils/colors.py` 彩色输出工具
  - 创建 `Debug/agent-angel-debug/utils/process.py` 进程管理工具
  - 创建 `Debug/agent-angel-debug/utils/network.py` 网络检查工具
  - _需求: 所有需求_

- [x] 2. 实现一键测试启动器（核心功能）


  - 创建Windows批处理脚本
  - 创建Linux shell脚本
  - 实现环境检查逻辑
  - 实现自动服务启动
  - 实现测试执行和报告生成
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 13.1, 13.2_

- [x] 2.1 创建启动脚本框架


  - 创建 `Debug/agent-angel-debug/run_tests.bat` Windows脚本
  - 创建 `Debug/agent-angel-debug/run_tests.sh` Linux脚本
  - 添加彩色输出和进度显示
  - 添加错误处理和日志记录
  - _需求: 所有需求_

- [x] 2.2 实现环境检查模块

  - 检测Python版本和路径
  - 检测Rust/Cargo是否安装
  - 检测WSL状态（Windows）
  - 检查依赖包是否安装
  - 生成缺失依赖的安装命令
  - _需求: 1.1, 1.2, 2.1, 2.2_

- [x] 2.3 实现端口管理模块

  - 检测端口8000/8001占用情况
  - 识别占用进程（进程名、PID）
  - 提供自动关闭选项
  - 处理端口释放失败的情况
  - _需求: 1.3, 2.3, 12.1_

- [x] 2.4 实现服务启动模块

  - 启动Rust核心服务（cargo run或已编译二进制）
  - 启动Python工作器服务
  - 等待服务就绪（健康检查）
  - 处理启动失败情况
  - 提供服务日志实时输出选项
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.5 实现测试执行引擎

  - 按顺序执行所有测试
  - 显示彩色进度条和百分比
  - 实时显示当前测试项
  - 收集测试结果和错误信息
  - 预估剩余时间
  - _需求: 所有需求_

- [x] 2.6 实现报告生成模块

  - 生成HTML可视化报告（保存到 `Debug/agent-angel-debug/reports/`）
  - 生成JSON结构化结果
  - 生成Markdown摘要
  - 在浏览器中自动打开HTML报告
  - _需求: 所有需求_

- [x] 3. 实现智能诊断助手


  - 创建 `Debug/agent-angel-debug/diagnose.py`
  - 创建问题检测引擎
  - 实现通俗易懂的问题解释
  - 实现分步修复指南
  - 实现一键自动修复
  - _需求: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 3.1 创建问题检测引擎

  - 扫描Rust和Python日志文件（Agent_angel_server/server.log等）
  - 检测常见错误模式（端口占用、依赖缺失、配置错误）
  - 检查配置文件完整性
  - 验证网络连接
  - 检查文件权限
  - _需求: 12.1, 12.2_

- [x] 3.2 实现问题解释模块

  - 为每种错误类型编写通俗解释
  - 使用类比和示例说明
  - 避免技术术语
  - 提供"这是什么意思？"的说明
  - _需求: 12.3_

- [x] 3.3 实现修复方案生成器

  - 为每种问题生成3-5个解决方案
  - 每个方案包含具体步骤和命令
  - 标注哪些步骤可以自动完成
  - 按推荐程度排序方案
  - _需求: 12.4, 12.5_

- [x] 3.4 实现自动修复功能

  - 端口占用自动关闭进程
  - 依赖缺失自动安装
  - 配置错误自动修正
  - 数据库锁文件自动清理
  - API密钥交互式设置
  - 修复后自动验证
  - _需求: 10.1, 10.2, 12.5_

- [x] 4. 实现健康检查系统


  - 创建各组件健康检查脚本（在 `Debug/agent-angel-debug/health_checks/`）
  - 创建 `Debug/agent-angel-debug/health_monitor.py` 持续监控服务
  - 实现自动恢复机制
  - 实现桌面通知
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 11.1, 11.2, 11.3_

- [x] 4.1 创建Rust服务健康检查

  - 创建 `Debug/agent-angel-debug/health_checks/check_rust.py`
  - 检查端口8000是否监听
  - 验证WebSocket端点响应
  - 检查RocksDB可访问性
  - 测试认知系统是否运行
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 7.1_

- [x] 4.2 创建Python服务健康检查

  - 创建 `Debug/agent-angel-debug/health_checks/check_python.py`
  - 检查端口8001是否监听
  - 验证FastAPI端点响应
  - 检查Playwright是否可用
  - 测试Gemini API连接
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2_

- [x] 4.3 创建跨服务通信检查

  - 创建 `Debug/agent-angel-debug/health_checks/check_integration.py`
  - 测试Rust→Python HTTP调用
  - 测试Python→Rust HTTP调用
  - 验证消息格式正确性
  - 测试错误处理
  - _需求: 11.1, 11.2, 11.3_

- [x] 4.4 实现持续健康监控

  - 实现 `Debug/agent-angel-debug/health_monitor.py`
  - 每30秒自动检查系统状态
  - 检测到问题立即通知
  - 记录健康历史趋势
  - 提供启动/停止命令
  - _需求: 所有需求_

- [x] 4.5 实现自动恢复机制

  - 服务崩溃时自动重启
  - 端口冲突时自动切换端口
  - 内存泄漏时自动重启服务
  - 记录恢复操作日志
  - _需求: 12.5, 13.5_

- [x] 4.6 实现桌面通知系统

  - Windows通知中心集成
  - 问题严重程度分级
  - 通知内容通俗易懂
  - 点击通知查看详情
  - _需求: 12.3_

- [x] 5. 实现可视化性能监控

  - 创建 `Debug/agent-angel-debug/performance_monitor.py`
  - 创建实时性能仪表板
  - 实现性能指标收集
  - 实现性能评分系统
  - 生成性能优化建议
  - _需求: 13.3, 13.4_

- [x] 5.1 创建实时仪表板

  - 实现 `Debug/agent-angel-debug/performance_monitor.py`
  - 使用rich库创建终端UI
  - 显示彩色进度条和图表
  - 自动刷新（每秒）
  - 支持交互式操作（缩放、暂停）
  - _需求: 13.3_

- [x] 5.2 实现性能指标收集

  - 收集内存使用（Rust、Python）
  - 收集CPU使用率
  - 测量WebSocket延迟
  - 测量HTTP请求延迟
  - 测量CDP帧率和抖动
  - 测量数据库操作延迟
  - _需求: 13.3, 13.4_

- [x] 5.3 实现性能评分系统

  - 根据各项指标计算总分（0-100）
  - 定义优秀/良好/一般/差的阈值
  - 显示评分趋势图
  - 提供评分详细说明
  - _需求: 13.4_

- [x] 5.4 实现性能优化建议


  - 自动分析性能瓶颈
  - 生成具体优化建议
  - 用日常语言解释
  - 估算优化效果
  - _需求: 13.4_

- [x] 6. 实现单元测试套件

  - 创建Rust单元测试（在 `Debug/agent-angel-debug/tests/rust/`）
  - 创建Python单元测试（在 `Debug/agent-angel-debug/tests/python/`）
  - 实现测试数据fixtures
  - 实现mock工具
  - _需求: 所有需求_

- [x] 6.1 创建Rust单元测试框架


  - 在 `Debug/agent-angel-debug/tests/rust/` 创建测试目录
  - 配置Cargo.toml测试依赖
  - 创建测试辅助函数
  - 设置mock HTTP客户端
  - 设置内存RocksDB
  - _需求: 所有需求_


- [x] 6.2 实现Rust核心组件测试

  - 创建 `Debug/agent-angel-debug/tests/rust/gateway_tests.rs`
  - 创建 `Debug/agent-angel-debug/tests/rust/cognitive_tests.rs`
  - 创建 `Debug/agent-angel-debug/tests/rust/body_client_tests.rs`
  - 创建 `Debug/agent-angel-debug/tests/rust/cost_monitor_tests.rs`
  - 创建 `Debug/agent-angel-debug/tests/rust/key_manager_tests.rs`
  - 创建 `Debug/agent-angel-debug/tests/rust/cdp_stream_tests.rs`
  - _需求: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 9.1, 9.2, 9.4, 10.1, 10.2, 6.1, 6.2_


- [x] 6.3 创建Python单元测试框架

  - 在 `Debug/agent-angel-debug/tests/python/` 创建测试目录
  - 配置pytest和pytest-asyncio
  - 创建测试fixtures（在 `Debug/agent-angel-debug/tests/fixtures/`）
  - 设置mock工具（pytest-mock, aioresponses）
  - _需求: 所有需求_



- [ ] 6.4 实现Python组件测试
  - 创建 `Debug/agent-angel-debug/tests/python/test_interface.py`
  - 创建 `Debug/agent-angel-debug/tests/python/test_playwright.py`
  - 创建 `Debug/agent-angel-debug/tests/python/test_gemini.py`
  - 创建 `Debug/agent-angel-debug/tests/python/test_tasks.py`
  - 创建 `Debug/agent-angel-debug/tests/python/test_config.py`
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 9.3_

- [x] 7. 实现集成测试套件


  - 创建端到端测试场景（在 `Debug/agent-angel-debug/tests/integration/`）
  - 实现测试环境管理
  - 创建测试数据生成器
  - _需求: 13.1, 13.2, 13.5_


- [x] 7.1 创建集成测试框架

  - 在 `Debug/agent-angel-debug/tests/integration/` 创建测试目录
  - 创建测试环境启动脚本
  - 实现服务健康等待逻辑
  - 创建测试清理脚本
  - _需求: 13.1, 13.2_


- [ ] 7.2 实现完整工作流测试
  - 创建 `Debug/agent-angel-debug/tests/integration/test_full_workflow.py`
  - 创建 `Debug/agent-angel-debug/tests/integration/test_rust_python_comm.py`
  - 创建 `Debug/agent-angel-debug/tests/integration/test_cdp_streaming.py`
  - 创建 `Debug/agent-angel-debug/tests/integration/test_concurrent_sessions.py`
  - 创建 `Debug/agent-angel-debug/tests/integration/test_error_recovery.py`
  - _需求: 13.1, 13.2, 13.5, 4.4, 6.3, 6.4, 6.5, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 8. 实现文档和用户指南

  - 创建快速开始指南
  - 创建故障排除文档
  - 创建视频教程脚本
  - _需求: 所有需求_

- [x] 8.1 创建快速开始指南


  - 编写 `Debug/agent-angel-debug/README.md` 主文档
  - 包含安装步骤
  - 包含第一次运行教程
  - 包含常见问题FAQ
  - 添加截图和示例输出
  - _需求: 所有需求_




- [x] 8.2 创建故障排除文档
  - 编写 `Debug/agent-angel-debug/TROUBLESHOOTING.md`
  - 列出所有常见问题
  - 每个问题包含症状、原因、解决方案
  - 添加诊断命令示例
  - _需求: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 8.3 创建视频教程脚本
  - 编写 `Debug/agent-angel-debug/VIDEO_SCRIPTS.md`
  - 脚本1: 如何运行第一次测试
  - 脚本2: 如何使用诊断助手
  - 脚本3: 如何查看性能监控
  - 每个脚本包含旁白和操作步骤
  - _需求: 所有需求_

- [x] 9. 最终集成和测试



  - 运行完整测试套件
  - 修复发现的问题
  - 优化性能
  - 生成最终文档
  - _需求: 所有需求_

- [x] 9.1 运行完整测试验证




  - 在干净环境中运行一键测试
  - 验证所有自动化功能
  - 验证所有诊断功能
  - 验证所有监控功能
  - 记录测试结果
  - _需求: 所有需求_

- [x] 9.2 性能优化

  - 优化测试执行速度
  - 减少内存占用
  - 优化报告生成速度
  - 优化监控刷新率
  - _需求: 13.3, 13.4_

- [x] 9.3 用户体验优化

  - 收集新手用户反馈
  - 改进提示文案
  - 优化交互流程
  - 添加更多示例
  - _需求: 所有需求_

- [x] 9.4 生成最终文档


  - 更新所有README文件
  - 生成API文档
  - 创建发布说明
  - 准备演示材料
  - _需求: 所有需求_
