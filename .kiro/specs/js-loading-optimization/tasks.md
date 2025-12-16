# 实现计划：全栈原子化重构

## 阶段 1：基础设施搭建

- [x] 1. 创建核心管理器类
  - [x] 1.1 创建 ModuleCache 三级缓存管理器


    - 在 `js/system/` 下创建 `module_cache.js`
    - 实现 L1 内存缓存 (Map)
    - 实现 L2 IndexedDB 缓存
    - 实现 L3 网络请求回退
    - 实现 warmup 预热方法
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 编写 ModuleCache 属性测试


    - **Property 3: 向后兼容导入**
    - **Validates: Requirements 1.4, 8.2**

  - [x] 1.3 创建 WindowResourceRegistry 资源注册表


    - 在 `js/system/` 下创建 `resource_registry.js`
    - 实现 addListener/addTimer/addSubscription 注册方法
    - 实现 forceCleanup 强制回收方法
    - 实现 5 秒超时强制终止
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_


  - [x] 1.4 编写 WindowResourceRegistry 属性测试
    - **Property 7: 资源回收完整性**
    - **Property 8: DOM 清理完整性**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 1.5 创建 CSSInjector 动态样式注入器


    - 在 `js/system/` 下创建 `css_injector.js`
    - 实现 inject 方法（带去重）
    - 实现 remove 方法
    - 使用 data-module 属性标记
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 1.6 编写 CSSInjector 属性测试

    - **Property 5: CSS 动态注入唯一性**
    - **Validates: Requirements 6.4**

  - [x] 1.7 创建 TemplateLoader HTML 模板加载器


    - 在 `js/system/` 下创建 `template_loader.js`
    - 实现 load 方法（带缓存）
    - 实现回退到 JS 内联 content
    - _Requirements: 4.2, 4.3_

  - [x] 1.8 创建 MemoryPressureMonitor 内存压力监控


    - 在 `js/system/` 下创建 `memory_monitor.js`
    - 实现内存压力检测
    - 实现自动关闭最久未使用的后台窗口
    - _Requirements: 9.6_

- [x] 2. Checkpoint - 确保所有测试通过

  - Ensure all tests pass, ask the user if questions arise.

## 阶段 2：system/ 核心模块原子化

- [x] 3. 拆分 store.js


  - [x] 3.1 创建 `js/system/store/` 目录结构


    - 创建 index.js 分子入口
    - 创建 idb.js 原子（IndexedDB 操作）
    - 创建 sync.js 原子（数据同步）
    - 创建 cache.js 原子（缓存管理）
    - 创建 store.css 样式文件
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

  - [x] 3.2 编写 store 原子属性测试

    - **Property 1: 原子模块行数限制**
    - **Property 2: 分子入口存在性**
    - **Validates: Requirements 1.2, 1.3**

  - [x] 3.3 更新 store.js 为兼容层


    - 保留原文件作为 re-export 入口
    - 从 store/index.js 导入并导出所有功能
    - _Requirements: 8.1, 8.2_

- [x] 4. 拆分 window_manager.js
  - [x] 4.1 创建 `js/system/window_manager/` 目录结构


    - 创建 index.js 分子入口
    - 创建 create.js 原子（创建窗口）
    - 创建 open.js 原子（打开窗口）
    - 创建 close.js 原子（关闭窗口）
    - 创建 drag.js 原子（拖拽逻辑）
    - 创建 state.js 原子（状态恢复）
    - 创建 rename.js 原子（重命名功能）
    - 创建 focus.js 原子（焦点管理）
    - 创建 window_manager.css 样式文件
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

  - [x] 4.2 集成 WindowResourceRegistry

    - 在 create.js 中创建资源注册表
    - 在 close.js 中调用 forceCleanup
    - _Requirements: 9.1, 9.2, 9.3_


  - [x] 4.3 更新 window_manager.js 为兼容层
    - _Requirements: 8.1, 8.2_

- [ ] 5. 拆分 network.js
  - [x] 5.1 创建 `js/system/network/` 目录结构

    - 创建 index.js 分子入口
    - 创建 websocket.js 原子（WebSocket 连接）
    - 创建 heartbeat.js 原子（心跳机制）
    - 创建 send.js 原子（发送消息）
    - 创建 network.css 样式文件
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

  - [x] 5.2 更新 network.js 为兼容层

    - _Requirements: 8.1, 8.2_

- [x] 6. 拆分 event_bus.js

  - [ ] 6.1 创建 `js/system/event_bus/` 目录结构
    - 创建 index.js 分子入口
    - 创建 emit.js 原子（发送事件）
    - 创建 on.js 原子（监听事件）
    - 创建 off.js 原子（取消监听）
    - _Requirements: 1.1, 1.2, 1.3_


  - [x] 6.2 更新 event_bus.js 为兼容层

    - _Requirements: 8.1, 8.2_

- [x] 7. 拆分其他 system/ 模块
  - [x] 7.1 拆分 loader.js → loader/
    - 创建 apps.js (应用加载)
    - 创建 business.js (业务逻辑)
    - 创建 fetch.js (应用列表获取)
    - 创建 init.js (系统初始化)
    - 创建 ui.js (UI 绑定)
    - 创建 index.js (分子入口)
    - _Requirements: 1.1, 1.2, 1.3, 2.1_
  - [x] 7.2 拆分 process_manager.js → process_manager/
    - 创建 stats.js (性能统计)
    - 创建 queue.js (资源队列)
    - 创建 context.js (应用上下文)
    - 创建 kill.js (进程终止)
    - 创建 index.js (分子入口)
    - _Requirements: 1.1, 1.2, 1.3, 2.1_
  - [x] 7.3 拆分 capsule_manager.js → capsule_manager/
    - 创建 drag.js (拖拽功能)
    - 创建 create.js (胶囊创建)
    - 创建 index.js (分子入口)
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [x] 8. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

## 阶段 3：apps_system/ 系统应用原子化

- [x] 9. 拆分 desktop.js
  - [x] 9.1 创建 `js/apps_system/desktop/` 目录结构
    - 创建 index.js 分子入口
    - 创建 render.js 原子（渲染图标）
    - 创建 grid.js 原子（网格计算）
    - 创建 icon.js 原子（图标创建）
    - 创建 menu.js 原子（右键菜单）
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_

  - [x] 9.2 更新 desktop.js 为兼容层
    - _Requirements: 8.1, 8.2_

- [x] 10. 拆分 taskbar.js
  - [x] 10.1 创建 `js/apps_system/taskbar/` 目录结构
    - 创建 index.js 分子入口
    - 创建 apps.js 原子（应用图标）
    - 创建 tray.js 原子（托盘图标）
    - 创建 start.js 原子（开始按钮）
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_

  - [x] 10.2 更新 taskbar.js 为兼容层
    - _Requirements: 8.1, 8.2_

- [x] 11. 拆分 angel.js（小天使解耦）
  - [x] 11.1 创建 `js/apps_system/angel/` 目录结构
    - 创建 index.js 分子入口
    - 创建 speak.js 原子（语音和气泡）
    - 创建 model.js 原子（3D 模型构建）
    - 创建 renderer.js 原子（WebGL 渲染器）
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1, 10.1_

  - [x] 11.2 实现事件总线订阅模式
    - 已通过 bus.on 订阅 system:speak 和 app:opened 事件
    - _Requirements: 10.2, 10.3_

  - [ ] 11.3 编写小天使解耦属性测试
    - **Property 9: 小天使解耦**
    - **Validates: Requirements 10.2**

  - [ ] 11.4 实现对话历史 IndexedDB 存储
    - 在 angel/ 下创建 history.js 原子
    - 使用独立的 IndexedDB 存储空间
    - _Requirements: 10.4_

  - [x] 11.5 更新 angel.js 为兼容层
    - _Requirements: 8.1, 8.2_

- [x] 12. 拆分其他 apps_system/ 模块
  - [x] 12.1 拆分 context_menu.js → context_menu/
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_
  - [x] 12.2 拆分 login.js → login/
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_
  - [x] 12.3 拆分 billing.js → billing/
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_
  - [x] 12.4 拆分 traffic.js → traffic/
    - 创建 render.js (配置、模板、更新逻辑)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_
  - [x] 12.5 拆分 fps.js → fps/
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_
  - [x] 12.6 拆分 key_manager.js → key_manager/
    - 创建 render.js (面板渲染、事件绑定)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_
  - [x] 12.7 拆分 app_store.js → app_store/
    - 创建 render.js (渲染逻辑)
    - 创建 actions.js (安装/卸载/清理操作)
    - 创建 index.js (分子入口)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_

- [x] 13. Checkpoint - 阶段 3 基本完成
  - Ensure all tests pass, ask the user if questions arise.

## 阶段 4：apps/ 用户应用原子化

- [x] 14. 拆分 browser.js（完全独立）
  - [x] 14.1 创建 `js/apps/browser/` 目录结构
    - 创建 config.js 原子（配置和模板）
    - 创建 remote.js 原子（远程控制）
    - 创建 index.js 分子入口（BrowserApp 类）
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.2, 3.4, 4.1_

  - [ ] 14.2 编写用户应用独立性属性测试
    - **Property 6: 用户应用独立性**
    - **Validates: Requirements 3.4**

  - [x] 14.3 更新 browser.js 为兼容层
    - _Requirements: 8.1, 8.2_

- [x] 15. 拆分其他 apps/ 模块
  - [x] 15.1 拆分 personalization.js → personalization/
    - 创建 config.js (配置和壁纸列表)
    - 创建 index.js (分子入口)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.2, 3.4, 4.1_
  - [x] 15.2 拆分 task_manager.js → task_manager/
    - 创建 config.js (配置)
    - 创建 render.js (渲染逻辑)
    - 创建 actions.js (操作逻辑)
    - 创建 index.js (分子入口)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.2, 3.4, 4.1_
  - [x] 15.3 拆分 manual.js → manual/
    - 创建 config.js (配置和内容)
    - 创建 index.js (分子入口)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.2, 3.4, 4.1_
  - [x] 15.4 拆分 performance.js → performance/
    - 创建 config.js (配置)
    - 创建 template.js (HTML 模板)
    - 创建 sysinfo.js (系统信息获取)
    - 创建 index.js (分子入口)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.2, 3.4, 4.1_
  - [x] 15.5 拆分 intelligence.js → intelligence/
    - 创建 config.js (配置)
    - 创建 index.js (分子入口)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.2, 3.4, 4.1_

- [x] 16. Checkpoint - 阶段 4 完成
  - 所有 apps/ 模块已原子化

## 阶段 5：系统级共享组件

- [x] 17. 创建 system/components/ 共享组件
  - [x] 17.1 创建 button 组件
    - 创建 `js/system/components/button/` 目录
    - 创建 index.js、button.js、button.css
    - _Requirements: 3.1_

  - [x] 17.2 创建 input 组件
    - 创建 `js/system/components/input/` 目录
    - 创建 index.js、input.js、input.css
    - _Requirements: 3.1_

  - [x] 17.3 创建 modal 组件
    - 创建 `js/system/components/modal/` 目录
    - 创建 index.js、modal.js、modal.css
    - _Requirements: 3.1_

  - [x] 17.4 创建 icon 组件
    - 创建 `js/system/components/icon/` 目录
    - 创建 index.js、svg_icon.js、icon.css
    - _Requirements: 3.1_
  
  - [x] 17.5 创建统一入口
    - 创建 `js/system/components/index.js`

## 阶段 6：CSS 迁移与清理

- [x] 18. 迁移 style.css 样式
  - [x] 18.1 分析 style.css 样式归属
    - 识别每个样式规则属于哪个模块
    - 创建迁移映射表
    - _Requirements: 2.2_

  - [x] 18.2 迁移样式到各模块
    - js/system/global.css (全局变量和重置)
    - js/system/window_manager/window_manager.css (窗口样式)
    - js/apps_system/desktop/desktop.css (桌面图标)
    - js/apps_system/taskbar/taskbar.css (任务栏)
    - js/apps_system/angel/angel.css (小天使)
    - js/apps_system/billing/billing.css (账单)
    - js/apps/personalization/personalization.css (壁纸选择)
    - js/apps/task_manager/task_manager.css (任务管理器)
    - js/apps/intelligence/intelligence.css (情报站)
    - _Requirements: 2.2_

  - [x] 18.3 删除 css/ 文件夹


    - 确认所有样式已迁移
    - 删除 Web_compute_low/css/ 目录
    - _Requirements: 2.3_
    - **注意**: 需要先更新 HTML 引用新的 CSS 路径

  - [ ] 18.4 编写 CSS 对应性属性测试
    - **Property 4: CSS 文件对应性**
    - **Validates: Requirements 2.1**

- [x] 19. Checkpoint - 阶段 6 基本完成
  - CSS 已迁移到各模块，待更新 HTML 引用后删除旧 css/ 目录

## 阶段 7：manifest.json 与校验工具

- [x] 20. 生成 manifest.json
  - [x] 20.1 创建 manifest 生成脚本
    - 创建 js/tools/generate_manifest.js
    - 扫描所有模块目录
    - 提取原子信息（文件、描述、导出）
    - 生成 manifest.json
    - _Requirements: 7.1, 7.2_

  - [ ] 20.2 编写 manifest 完整性属性测试
    - **Property 12: manifest.json 完整性**
    - **Validates: Requirements 7.4**

- [x] 21. 创建原子位置校验工具
  - [x] 21.1 创建 DependencyAnalyzer
    - 创建 js/tools/dependency_analyzer.js
    - 实现依赖图构建
    - 实现循环依赖检测
    - 实现位置错误检测
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ] 21.2 编写循环依赖属性测试
    - **Property 10: 循环依赖检测**
    - **Validates: Requirements 11.4**

  - [ ] 21.3 运行校验并修复问题
    - 执行校验脚本
    - 根据报告修复位置错误
    - _Requirements: 11.5_

## 阶段 8：智能预取与优化

- [x] 22. 实现 PrefetchManager
  - [x] 22.1 创建预取管理器
    - 创建 `js/system/prefetch_manager.js`
    - 实现预取规则配置
    - 实现 requestIdleCallback 预取
    - _Requirements: P10 流量优化_

  - [x] 22.2 配置预取规则
    - 设置常用应用的预取关联
    - 集成到 EventBus 监听 (app:opened)
    - _Requirements: P10 流量优化_

- [x] 23. 添加 requestIdleCallback polyfill
  - [x] 23.1 添加 Safari 兼容性 polyfill
    - 在 prefetch_manager.js 中内置 polyfill
    - 确保 Safari 11.1+ 兼容
    - _Requirements: 浏览器兼容性_

## 阶段 9：最终验证

- [ ] 24. 运行完整测试套件
  - [ ] 24.1 运行所有属性测试
    - 验证 12 个正确性属性
    - _Requirements: 所有_

  - [ ] 24.2 编写命名规范属性测试
    - **Property 11: 命名规范**
    - **Validates: Requirements 5.4**

  - [ ] 24.3 运行集成测试
    - 测试完整模块加载流程
    - 测试窗口资源管理
    - 测试离线缓存行为
    - _Requirements: 所有_

- [ ] 25. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

---

## 📊 重构进度总结

### 已完成的模块原子化:

**system/ (7个模块)**
- ✅ store/ (idb.js, sync.js, cache.js)
- ✅ window_manager/ (create.js, open.js, close.js, drag.js, focus.js, wallpaper.js, state.js, rename.js)
- ✅ event_bus/ (emit.js, on.js, off.js)
- ✅ network/ (websocket.js, heartbeat.js, send.js)
- ✅ loader/ (apps.js, business.js, fetch.js, init.js, ui.js)
- ✅ process_manager/ (stats.js, queue.js, context.js, kill.js)
- ✅ capsule_manager/ (drag.js, create.js)

**apps_system/ (10个模块)**
- ✅ desktop/ (grid.js, icon.js, menu.js, render.js)
- ✅ taskbar/ (apps.js, tray.js, start.js)
- ✅ angel/ (speak.js, model.js, renderer.js, animation.js, interaction.js, voice.js)
- ✅ context_menu/
- ✅ billing/ (config.js, render.js)
- ✅ traffic/ (render.js)
- ✅ fps/
- ✅ login/ (auth.js, render.js)
- ✅ key_manager/ (render.js)
- ✅ app_store/ (render.js, actions.js)

**apps/ (6个模块)**
- ✅ browser/ (config.js, remote.js)
- ✅ personalization/ (config.js)
- ✅ task_manager/ (config.js, render.js, actions.js)
- ✅ manual/ (config.js)
- ✅ performance/ (config.js, template.js, sysinfo.js)
- ✅ intelligence/ (config.js)

**system/components/ (4个组件)**
- ✅ button/ (button.js, button.css)
- ✅ input/ (input.js, input.css)
- ✅ modal/ (modal.js, modal.css)
- ✅ icon/ (svg_icon.js, icon.css)

**工具 (2个)**
- ✅ tools/generate_manifest.js
- ✅ tools/dependency_analyzer.js

**基础设施**
- ✅ prefetch_manager.js (智能预取)
- ✅ CSS 迁移到各模块

### 待完成:
- [ ] 更新 HTML 引用新 CSS 路径
- [ ] 删除旧 css/ 目录
- [ ] 运行完整测试套件
- [ ] 生成 manifest.json
