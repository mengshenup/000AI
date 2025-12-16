# 需求文档：全栈原子化重构

## 简介

将 Web_compute_low 项目重构为**类小程序的原子化架构**，实现：
1. **JS 逻辑原子化** - 每个函数/类拆分为独立原子模块
2. **CSS 样式原子化** - 样式归还给对应 JS，删除全局 style.css
3. **UI 组件原子化** - 按钮、输入框等拆分为可复用原子组件
4. **上下文节省** - AI 模型按需调取原子，无需加载全部代码

## 术语表

- **原子 (Atom)**: 最小不可分割单元，1-3 个函数，20-50 行，<2KB
- **分子 (Molecule)**: 3-10 个原子组合，100-300 行，<10KB
- **组织 (Organism)**: 完整功能模块入口文件
- **小程序化**: 每个功能模块独立成"小程序"，有自己的 JS/CSS/HTML

## 目标目录结构

```
Web_compute_low/
├── js/
│   ├── system/
│   │   ├── store.js                    # 组织入口（仅 import/export）
│   │   └── store/                      # store 原子目录
│   │       ├── index.js                # 分子：组合所有原子
│   │       ├── idb.js                  # 原子：IndexedDB 操作
│   │       ├── sync.js                 # 原子：数据同步
│   │       ├── cache.js                # 原子：缓存管理
│   │       ├── compress.js             # 原子：数据压缩
│   │       └── store.css               # 样式：store 专属样式
│   │
│   │   ├── window_manager.js           # 组织入口
│   │   └── window_manager/             # window_manager 原子目录
│   │       ├── index.js                # 分子
│   │       ├── drag.js                 # 原子：拖拽逻辑
│   │       ├── resize.js               # 原子：调整大小
│   │       ├── focus.js                # 原子：焦点管理
│   │       ├── create.js               # 原子：创建窗口
│   │       ├── open.js                 # 原子：打开窗口
│   │       ├── close.js                # 原子：关闭窗口
│   │       └── window_manager.css      # 样式：窗口专属样式
│   │
│   │   ├── loader.js                   # 组织入口
│   │   └── loader/
│   │       ├── index.js
│   │       ├── fetch_apps.js           # 原子：获取应用列表
│   │       ├── dynamic_import.js       # 原子：动态导入
│   │       ├── init.js                 # 原子：初始化逻辑
│   │       └── loader.css
│   │
│   │   ├── network.js                  # 组织入口
│   │   └── network/
│   │       ├── index.js
│   │       ├── websocket.js            # 原子：WebSocket 连接
│   │       ├── heartbeat.js            # 原子：心跳机制
│   │       ├── send.js                 # 原子：发送消息
│   │       └── network.css
│   │
│   │   ├── event_bus.js                # 组织入口
│   │   └── event_bus/
│   │       ├── index.js
│   │       ├── emit.js                 # 原子：发送事件
│   │       ├── on.js                   # 原子：监听事件
│   │       └── off.js                  # 原子：取消监听
│   │
│   │   └── config.js                   # 配置文件（不拆分，保持单文件）
│   │
│   ├── apps/                           # 用户应用
│   │   ├── browser.js                  # 组织入口
│   │   └── browser/
│   │       ├── index.js
│   │       ├── navigate.js             # 原子：导航逻辑
│   │       ├── scan.js                 # 原子：扫描逻辑
│   │       ├── remote_click.js         # 原子：远程点击
│   │       ├── template.html           # HTML 模板
│   │       └── browser.css             # 样式
│   │
│   │   ├── personalization.js
│   │   └── personalization/
│   │       ├── index.js
│   │       ├── wallpaper.js            # 原子：壁纸切换
│   │       ├── theme.js                # 原子：主题切换
│   │       ├── template.html
│   │       └── personalization.css
│   │
│   │   └── ... (其他应用同理)
│   │
│   ├── apps_system/                    # 系统应用
│   │   ├── desktop.js
│   │   └── desktop/
│   │       ├── index.js
│   │       ├── render.js               # 原子：渲染图标
│   │       ├── grid.js                 # 原子：网格计算
│   │       ├── template.html
│   │       └── desktop.css
│   │
│   │   ├── taskbar.js
│   │   └── taskbar/
│   │       ├── index.js
│   │       ├── clock.js                # 原子：时钟
│   │       ├── apps_list.js            # 原子：应用列表
│   │       ├── template.html
│   │       └── taskbar.css
│   │
│   │   └── ... (其他系统应用同理)
│   │
│   ├── system/
│   │   └── components/                 # 系统级共享组件（仅 system/ 和 apps_system/ 可用）
│   │       ├── button/
│   │       │   ├── index.js
│   │       │   ├── button.js           # 原子：按钮逻辑
│   │       │   └── button.css          # 原子：按钮样式
│   │       │
│   │       ├── input/
│   │       │   ├── index.js
│   │       │   ├── input.js
│   │       │   └── input.css
│   │       │
│   │       ├── modal/
│   │       │   ├── index.js
│   │       │   ├── modal.js
│   │       │   └── modal.css
│   │       │
│   │       ├── icon/
│   │       │   ├── index.js
│   │       │   ├── svg_icon.js         # 原子：SVG 图标渲染
│   │       │   └── icon.css
│   │       │
│   │       └── ... (其他系统级共享组件)
│   │
│   └── apps/                           # 用户应用（完全独立，不共享组件）
│       └── browser/                    # 每个应用自包含所有依赖
│           ├── index.js
│           ├── components/             # 应用私有组件（如有需要）
│           │   └── url_bar/
│           ├── navigate.js
│           ├── scan.js
│           ├── template.html
│           └── browser.css
│
├── css/                                # 【删除】样式已归还给各模块
│
└── index.html                          # 入口 HTML（仅加载 loader.js）
```

## 需求列表

### 需求 1：JS 逻辑原子化

**用户故事:** 作为开发者，我希望每个 JS 文件都拆分为原子模块，这样可以按需加载和维护。

#### 验收标准

1. 当 JS 文件超过 100 行时，系统应将其拆分为同名文件夹下的原子模块
2. 当拆分完成时，每个原子模块应不超过 50 行代码
3. 当原子模块被创建时，系统应在同名文件夹下创建 index.js 作为分子入口
4. 当原组织入口文件存在时，系统应保留其作为向后兼容的导出入口

### 需求 2：CSS 样式原子化

**用户故事:** 作为开发者，我希望样式归还给对应的 JS 模块，这样每个模块都是自包含的。

#### 验收标准

1. 当模块文件夹创建时，系统应在其中创建同名 .css 文件
2. 当 style.css 中的样式被识别属于某模块时，系统应将其迁移到对应模块的 .css 文件
3. 当所有样式迁移完成时，系统应删除 Web_compute_low/css 文件夹
4. 当模块加载时，系统应动态注入其对应的 CSS 样式

### 需求 3：UI 组件原子化

**用户故事:** 作为开发者，我希望系统级模块可以共享组件提高效率，而用户应用完全独立自包含。

#### 组件共享策略

- **系统级（system/ + apps_system/）**: 可共享组件，放在 `js/system/components/`
- **用户应用（apps/）**: 完全独立，不共享组件，每个应用自包含所有依赖
  - 原因：用户应用从商店安装，需要独立运行，不依赖外部组件

#### 验收标准

1. 当创建系统级共享组件时，系统应将其放在 js/system/components/ 目录下
2. 当用户应用需要组件时，系统应将组件代码内联到应用自己的文件夹中
3. 当系统级模块使用共享组件时，系统应通过 import 从 system/components/ 导入
4. 当用户应用被安装时，系统应确保其完全自包含，无外部依赖

### 需求 4：HTML 模板分离

**用户故事:** 作为开发者，我希望 HTML 模板从 JS 中分离，这样更易于维护和预览。

#### 验收标准

1. 当应用包含 HTML 内容时，系统应将其提取到同名文件夹下的 template.html
2. 当模块加载时，系统应动态 fetch 并注入 HTML 模板
3. 当 HTML 模板不存在时，系统应回退到 JS 内联的 content 字段

### 需求 5：上下文节省（AI 友好）

**用户故事:** 作为 AI 模型，我希望能按需调取原子模块，而不是加载整个文件，这样可以节省上下文窗口。

#### 验收标准

1. 当原子模块创建时，系统应在文件头部添加标准化的 JSDoc 注释描述其功能
2. 当需要查找功能时，AI 应能通过 index.js 的导出列表快速定位目标原子
3. 当原子模块被调取时，AI 只需读取该原子文件（<50行），无需读取整个组织
4. 当创建新原子时，系统应遵循统一的命名规范（动词_名词.js，如 create_window.js）

### 需求 6：动态样式注入

**用户故事:** 作为用户，我希望样式按需加载，减少首屏加载时间。

#### 验收标准

1. 当模块被动态导入时，系统应同时加载其对应的 CSS 文件
2. 当 CSS 加载完成时，系统应将其注入到 document.head 中
3. 当模块被卸载时，系统应移除其注入的 CSS（可选，防止样式泄漏）
4. 当 CSS 已加载过时，系统应跳过重复加载

### 需求 7：模块清单文件

**用户故事:** 作为开发者，我希望有一个清单文件描述所有模块，方便 AI 和工具理解项目结构。

#### 验收标准

1. 当项目重构完成时，系统应生成 manifest.json 描述所有模块及其原子
2. 当 manifest.json 存在时，AI 应能通过它快速了解项目结构而无需遍历文件
3. 当新模块被添加时，系统应自动更新 manifest.json
4. 当 manifest.json 被读取时，AI 应能获取每个原子的功能描述和依赖关系

#### manifest.json 示例

```json
{
  "version": "1.0.0",
  "modules": {
    "system/store": {
      "entry": "store.js",
      "atoms": {
        "idb": { "file": "store/idb.js", "desc": "IndexedDB 操作", "exports": ["initDB", "getItem", "setItem"] },
        "sync": { "file": "store/sync.js", "desc": "数据同步", "exports": ["syncFromServer", "syncToServer"] },
        "cache": { "file": "store/cache.js", "desc": "缓存管理", "exports": ["getCache", "setCache", "clearCache"] }
      },
      "css": "store/store.css",
      "dependencies": ["system/config"]
    }
  }
}
```

### 需求 8：向后兼容

**用户故事:** 作为开发者，我希望重构后的代码保持向后兼容，现有代码无需修改即可运行。

#### 验收标准

1. 当原组织入口文件（如 store.js）存在时，系统应保留其作为兼容层
2. 当外部代码 import store.js 时，系统应正常工作（通过 re-export）
3. 当新代码需要细粒度导入时，系统应支持直接 import 原子模块
4. 当重构完成时，系统应通过现有测试用例验证兼容性

---

## 重构范围

### 需要拆分的 JS 文件

**system/ 目录：**
- [ ] store.js → store/
- [ ] window_manager.js → window_manager/
- [ ] loader.js → loader/
- [ ] network.js → network/
- [ ] event_bus.js → event_bus/
- [ ] process_manager.js → process_manager/
- [ ] capsule_manager.js → capsule_manager/

**apps/ 目录：**
- [ ] browser.js → browser/
- [ ] personalization.js → personalization/
- [ ] task_manager.js → task_manager/
- [ ] manual.js → manual/
- [ ] performance.js → performance/
- [ ] intelligence.js → intelligence/

**apps_system/ 目录：**
- [ ] desktop.js → desktop/
- [ ] taskbar.js → taskbar/
- [ ] context_menu.js → context_menu/
- [ ] login.js → login/
- [ ] angel.js → angel/
- [ ] billing.js → billing/
- [ ] traffic.js → traffic/
- [ ] fps.js → fps/
- [ ] key_manager.js → key_manager/
- [ ] app_store.js → app_store/

### 需要迁移的 CSS

- [ ] style.css → 拆分到各模块文件夹
- [ ] 删除 css/ 文件夹


---

## 补充需求

### 需求 9：类 Rust 安全内存回收

**用户故事:** 作为用户，我希望系统能自动安全地回收内存，不需要应用自己处理，也不会出现关不掉应用的情况。

#### 设计理念

借鉴 Rust 的所有权和生命周期概念：
- **所有权 (Ownership)**: 每个 DOM 元素、事件监听器、定时器都有明确的"所有者"（窗口）
- **生命周期 (Lifetime)**: 当窗口关闭时，其"拥有"的所有资源自动释放
- **强制回收**: 系统级强制回收，不依赖应用配合

#### 验收标准

1. 当窗口关闭时，系统应自动清理该窗口注册的所有事件监听器
2. 当窗口关闭时，系统应自动清除该窗口创建的所有定时器（setTimeout/setInterval）
3. 当窗口关闭时，系统应自动移除该窗口的 DOM 元素及其子元素
4. 当窗口关闭时，系统应自动断开该窗口的 WebSocket 连接（如有）
5. 当应用 5 秒内未响应关闭请求时，系统应强制终止并回收资源
6. 当内存压力检测到时，系统应自动关闭最久未使用的后台窗口

#### 实现方案：资源注册表

```javascript
// 每个窗口维护一个资源注册表
class WindowResourceRegistry {
    constructor(windowId) {
        this.windowId = windowId;
        this.listeners = [];      // 事件监听器
        this.timers = [];         // 定时器
        this.subscriptions = [];  // 事件总线订阅
        this.connections = [];    // 网络连接
    }
    
    // 注册资源（应用调用）
    addListener(element, event, handler) { ... }
    addTimer(timerId, type) { ... }
    addSubscription(eventName, handler) { ... }
    
    // 强制回收（系统调用）
    forceCleanup() {
        this.listeners.forEach(l => l.element.removeEventListener(l.event, l.handler));
        this.timers.forEach(t => t.type === 'interval' ? clearInterval(t.id) : clearTimeout(t.id));
        this.subscriptions.forEach(s => bus.off(s.event, s.handler));
        this.connections.forEach(c => c.close());
    }
}
```

### 需求 10：小天使对话解耦

**用户故事:** 作为开发者，我希望小天使的对话功能完全归属于小天使模块，与其他应用解耦。

#### 验收标准

1. 当小天使对话功能存在时，系统应将其完全封装在 apps_system/angel/ 目录下
2. 当其他应用需要与小天使交互时，系统应通过事件总线（bus.emit）而非直接调用
3. 当小天使模块被卸载时，系统应确保不影响其他应用的正常运行
4. 当对话历史需要存储时，系统应存储在小天使自己的 IndexedDB 存储空间

#### 解耦接口设计（事件总线模式）

**消息流向：**
```
应用 → 事件总线(bus) → 小天使订阅接收
```
（无需系统分发中间层，事件总线本身就是发布-订阅模式，订阅者直接接收）

**详细流程：**
1. 应用发送信号到事件总线（广播）
2. 事件总线是系统级中转站，负责分发
3. 小天使作为订阅者，主动监听感兴趣的事件
4. 小天使收到事件后，自己决定如何响应

```javascript
// === 系统级事件总线 (system/event_bus.js) ===
// 所有消息都经过这里中转
class EventBus {
    emit(event, data) { /* 广播给所有订阅者 */ }
    on(event, handler) { /* 订阅事件 */ }
    off(event, handler) { /* 取消订阅 */ }
}

// === 应用发送信号 (apps/browser.js) ===
bus.emit('app:opened', { id: 'browser' });  // 广播：浏览器打开了

// === 小天使订阅接收 (apps_system/angel.js) ===
bus.on('app:opened', (data) => {
    // 小天使主动订阅，收到后自己决定说什么
    this.speak(`${data.id}已打开~`);
});
```

**核心原则：**
- 应用不知道小天使的存在（解耦）
- 小天使主动订阅感兴趣的事件
- 事件总线是唯一的通信桥梁

### 需求 11：原子位置校验

**用户故事:** 作为开发者，我希望重构完成后能自动检查原子是否放在正确的位置。

#### 验收标准

1. 当重构完成时，系统应运行原子位置校验脚本
2. 当原子被多个模块引用时，系统应建议将其提升到共享组件目录
3. 当原子只被单个模块引用时，系统应确认其位于该模块目录下
4. 当检测到循环依赖时，系统应报告并建议重构方案
5. 当原子功能与所在模块不匹配时，系统应建议迁移到更合适的位置

#### 校验规则

```
规则 1: 原子应放在其主要使用者的目录下
规则 2: 被 3+ 个模块引用的原子应提升为共享组件
规则 3: 系统级原子不应依赖用户应用
规则 4: 用户应用不应依赖其他用户应用
规则 5: 禁止循环依赖
```

#### 校验脚本输出示例

```
🔍 原子位置校验报告

✅ system/store/idb.js - 位置正确
✅ system/store/sync.js - 位置正确
⚠️ system/window_manager/drag.js - 建议迁移
   原因: 被 desktop.js 和 taskbar.js 也引用
   建议: 提升到 system/components/drag/
❌ apps/browser/utils.js - 位置错误
   原因: 被 apps/intelligence.js 引用
   建议: 如需共享，迁移到 system/components/
```


---

## P9 级性能优化专家审查报告

### 整体评估

| 方案 | 效率评分 | 风险 | 建议 |
|------|---------|------|------|
| 原子化拆分 | ⭐⭐⭐⭐ | 中 | 需要权衡拆分粒度 |
| CSS 归还模块 | ⭐⭐⭐⭐⭐ | 低 | 强烈推荐 |
| IndexedDB 缓存 | ⭐⭐⭐⭐ | 低 | 注意序列化开销 |
| 事件总线解耦 | ⭐⭐⭐⭐⭐ | 低 | 最佳实践 |
| 资源注册表回收 | ⭐⭐⭐⭐⭐ | 低 | 必须实现 |

### 潜在效率问题及优化建议

#### 1. 三级缓存架构（内存 > IndexedDB > 网络）

**速度对比：**
| 存储层 | 读取速度 | 容量 | 持久性 |
|-------|---------|------|-------|
| 内存 (Map/Object) | ~0.001ms | ~100MB | 会话级 |
| IndexedDB | ~1-10ms | ~无限 | 永久 |
| 网络请求 | ~100-1000ms | 无限 | - |

**最优方案：三级缓存**
```javascript
class ModuleCache {
    constructor() {
        this.memory = new Map();  // L1: 内存缓存（最快）
        // L2: IndexedDB（持久化）
        // L3: 网络（最慢）
    }
    
    async get(id) {
        // L1: 内存命中 → 0.001ms
        if (this.memory.has(id)) {
            return this.memory.get(id);
        }
        
        // L2: IndexedDB 命中 → 1-10ms
        const cached = await IDB.get(`module:${id}`);
        if (cached) {
            this.memory.set(id, cached);  // 提升到 L1
            return cached;
        }
        
        // L3: 网络请求 → 100-1000ms
        const fresh = await fetch(`/modules/${id}.js`);
        this.memory.set(id, fresh);       // 存入 L1
        await IDB.set(`module:${id}`, fresh);  // 存入 L2
        return fresh;
    }
}
```

**效果：**
- 首次访问：网络 → IndexedDB → 内存
- 同会话再次访问：内存命中（0.001ms）
- 刷新后访问：IndexedDB → 内存（1-10ms）

#### 2. IndexedDB 优化（减少序列化开销）

**问题：** 大对象存入 IndexedDB 需要序列化，读取需要反序列化，耗时

**优化方案：分离存储 + 预热**
```javascript
// ✅ 分离存储：小数据和大数据分开
await IDB.set('browser:meta', { name, icon, version });  // 小数据，快速读取
await IDB.set('browser:content', '<大量HTML>');          // 大数据，按需读取

// ✅ 启动预热：系统启动时将常用数据加载到内存
async function warmupCache() {
    const frequentApps = ['browser', 'settings', 'angel'];
    for (const id of frequentApps) {
        const meta = await IDB.get(`${id}:meta`);
        if (meta) moduleCache.memory.set(`${id}:meta`, meta);
    }
}
// 在 DOMContentLoaded 后立即执行
document.addEventListener('DOMContentLoaded', warmupCache);
```

#### 4. 事件总线的内存泄漏风险

**问题：** 订阅后忘记取消，导致内存泄漏

**优化方案：**
```javascript
// ❌ 低效：订阅后不取消
bus.on('app:opened', handler);  // 窗口关闭后 handler 仍在内存中

// ✅ 高效：与资源注册表结合，自动清理
class WindowResourceRegistry {
    subscribe(event, handler) {
        bus.on(event, handler);
        this.subscriptions.push({ event, handler });
    }
    
    cleanup() {
        this.subscriptions.forEach(s => bus.off(s.event, s.handler));
    }
}
```

#### 5. CSS 动态注入的重复问题

**问题：** 同一模块多次打开，CSS 被重复注入

**优化方案：**
```javascript
const loadedCSS = new Set();

function injectCSS(moduleId, cssPath) {
    if (loadedCSS.has(moduleId)) return;  // 已加载，跳过
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssPath;
    link.dataset.module = moduleId;
    document.head.appendChild(link);
    
    loadedCSS.add(moduleId);
}
```

#### 6. 原子粒度的权衡

**问题：** 拆分过细增加维护成本，拆分过粗失去按需加载优势

**建议粒度：**
| 模块类型 | 建议粒度 | 原因 |
|---------|---------|------|
| 核心系统 (store, wm) | 细粒度 (20-50行) | 频繁使用，需要精细控制 |
| 用户应用 (browser) | 中粒度 (50-100行) | 整体加载，无需过细 |
| 工具函数 | 单函数 | 最大复用性 |

### 最终建议

1. **开发环境**：保持原子化拆分，便于维护和 AI 理解
2. **缓存策略**：IndexedDB 存元数据，Service Worker 缓存代码
3. **内存管理**：资源注册表 + 强制回收，杜绝泄漏
4. **监控**：添加性能埋点，持续优化


---

## P10 级流量优化专家审查报告

### 核心理念：流量节省 >> CPU 性能

在移动网络和弱网环境下，**流量成本和加载时间**远比 CPU 计算重要。原子化的核心价值正是**按需加载最小单元**。

### HTTP 请求开销澄清

**之前的担忧是错误的！**

HTTP/1.1 的"请求开销"主要是：
- 连接建立延迟（RTT）
- 请求头开销（~500 bytes/请求）

**但原子化的流量节省远大于这些开销：**

| 场景 | 传统方式 | 原子化方式 | 节省 |
|------|---------|-----------|------|
| 只用 1 个按钮 | 加载整个 UI 库 100KB | 加载 button.js 2KB | 98KB |
| 只用 store.get | 加载整个 store.js 20KB | 加载 idb.js 1KB | 19KB |
| 首屏渲染 | 加载所有应用 500KB | 加载核心 50KB | 450KB |

### 流量优化方案

#### 1. 真正的按需加载（Tree Shaking 运行时版）

```javascript
// ❌ 传统：加载整个模块
import { store } from './store.js';  // 20KB 全部加载
store.get('key');

// ✅ 原子化：只加载需要的函数
import { get } from './store/idb.js';  // 1KB 只加载 get
get('key');
```

**流量节省：95%**

#### 2. 代码分片 + 懒加载

```javascript
// 首屏只加载核心（~30KB）
import { initCore } from './core.js';

// 用户点击时才加载应用（按需）
button.onclick = async () => {
    const { browser } = await import('./apps/browser/index.js');  // 10KB
    browser.open();
};
```

**流量节省：首屏减少 90%**

#### 3. 增量更新（Delta Sync）

```javascript
// ❌ 传统：版本更新重新下载整个文件
// 旧版 browser.js: 50KB
// 新版 browser.js: 51KB (只改了 1KB)
// 下载: 51KB

// ✅ 增量：只下载变化部分
// diff.patch: 1KB
// 本地合并: 旧版 + patch = 新版
// 下载: 1KB
```

**流量节省：98%**

#### 4. 智能预取（Predictive Prefetch）

```javascript
// 根据用户行为预测下一步操作
// 用户打开"设置"后，80% 会点"壁纸"
// 提前在空闲时加载壁纸模块

const prefetchRules = {
    'settings': ['wallpaper', 'theme'],  // 设置 → 壁纸/主题
    'browser': ['scan', 'bookmark'],      // 浏览器 → 扫描/书签
};

bus.on('app:opened', ({ id }) => {
    const next = prefetchRules[id];
    if (next) {
        requestIdleCallback(() => {
            next.forEach(m => import(`./apps/${id}/${m}.js`));
        });
    }
});
```

**用户体验：点击即开，无等待**

#### 5. 压缩传输

```javascript
// 服务端启用 Brotli 压缩（比 Gzip 小 20%）
// Nginx 配置:
// brotli on;
// brotli_types application/javascript text/css;

// 原始: 10KB
// Gzip: 3KB
// Brotli: 2.4KB
```

**流量节省：76%**

#### 6. 本地缓存优先（Stale-While-Revalidate）

```javascript
// 优先使用本地缓存，后台静默更新
async function loadModule(id) {
    // 1. 立即返回缓存（0ms 延迟）
    const cached = await IDB.get(`module:${id}`);
    if (cached) {
        // 后台检查更新
        checkUpdate(id).then(newVersion => {
            if (newVersion) IDB.set(`module:${id}`, newVersion);
        });
        return cached;
    }
    
    // 2. 无缓存才请求网络
    const fresh = await fetch(`/modules/${id}.js`);
    await IDB.set(`module:${id}`, fresh);
    return fresh;
}
```

**流量节省：重复访问 100%**

### 流量优化总结

| 优化策略 | 流量节省 | 实现难度 | 优先级 |
|---------|---------|---------|-------|
| 原子化按需加载 | 90%+ | 中 | P0 |
| 本地缓存优先 | 100%（重复） | 低 | P0 |
| Brotli 压缩 | 76% | 低 | P1 |
| 增量更新 | 98% | 高 | P2 |
| 智能预取 | 0%（但体验好） | 中 | P2 |

### 最终架构：流量最优

```
首次访问:
  加载核心 (30KB) → 渲染桌面 → 用户点击 → 加载原子 (1-5KB)

再次访问:
  IndexedDB 缓存命中 → 0 流量 → 后台静默检查更新

弱网环境:
  Service Worker 离线缓存 → 完全离线可用
```


---