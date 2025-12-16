# 设计文档：全栈原子化重构

## 概述

本设计文档描述了将 Web_compute_low 项目重构为类小程序原子化架构的技术方案。核心目标是：
- 按需加载最小代码单元，节省流量
- CSS 样式归还给对应模块，实现自包含
- 类 Rust 安全内存回收，杜绝泄漏
- AI 友好的代码组织，节省上下文

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                            │
│                    (仅加载 loader.js)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      loader.js (组织)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ fetch_apps  │  │ dynamic_    │  │    init     │         │
│  │    .js      │  │ import.js   │  │    .js      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  system/ 核心   │ │ apps_system/    │ │    apps/        │
│  (共享组件)     │ │ (系统应用)      │ │  (用户应用)     │
│                 │ │                 │ │  (完全独立)     │
│ ├── store/      │ │ ├── desktop/    │ │ ├── browser/    │
│ ├── wm/         │ │ ├── taskbar/    │ │ ├── settings/   │
│ ├── network/    │ │ ├── angel/      │ │ └── ...         │
│ └── components/ │ │ └── ...         │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 三级缓存架构

```
┌─────────────────────────────────────────────────────────────┐
│                     ModuleCache                              │
├─────────────────────────────────────────────────────────────┤
│  L1: 内存 (Map)     │ 速度: ~0.001ms │ 容量: ~100MB        │
├─────────────────────────────────────────────────────────────┤
│  L2: IndexedDB      │ 速度: ~1-10ms  │ 容量: 无限          │
├─────────────────────────────────────────────────────────────┤
│  L3: 网络           │ 速度: ~100ms+  │ 容量: 无限          │
└─────────────────────────────────────────────────────────────┘
```

## 组件与接口

### 1. ModuleCache（模块缓存管理器）

```javascript
/**
 * 三级缓存管理器
 * 优先级: 内存 > IndexedDB > 网络
 */
class ModuleCache {
    constructor() {
        this.memory = new Map();  // L1 内存缓存
        this.loadedCSS = new Set();  // 已加载的 CSS
    }
    
    async get(moduleId) { /* 三级查找 */ }
    async set(moduleId, content) { /* 存入缓存 */ }
    async invalidate(moduleId) { /* 使缓存失效 */ }
    async warmup(moduleIds) { /* 预热常用模块 */ }
}
```

### 2. WindowResourceRegistry（窗口资源注册表）

```javascript
/**
 * 类 Rust 所有权管理
 * 窗口关闭时自动回收所有资源
 */
class WindowResourceRegistry {
    constructor(windowId) {
        this.windowId = windowId;
        this.listeners = [];      // 事件监听器
        this.timers = [];         // 定时器
        this.subscriptions = [];  // 事件总线订阅
        this.connections = [];    // 网络连接
    }
    
    addListener(element, event, handler) { /* 注册监听器 */ }
    addTimer(timerId, type) { /* 注册定时器 */ }
    addSubscription(eventName, handler) { /* 注册订阅 */ }
    forceCleanup() { /* 强制回收所有资源 */ }
}
```

### 3. CSSInjector（CSS 动态注入器）

```javascript
/**
 * 动态 CSS 注入
 * 防止重复加载
 */
class CSSInjector {
    constructor() {
        this.loaded = new Set();
    }
    
    async inject(moduleId, cssPath) { /* 注入 CSS */ }
    remove(moduleId) { /* 移除 CSS */ }
    isLoaded(moduleId) { /* 检查是否已加载 */ }
}
```

### 4. EventBus（事件总线）

```javascript
/**
 * 发布-订阅模式
 * 应用间解耦通信
 */
class EventBus {
    constructor() {
        this.handlers = new Map();
    }
    
    emit(event, data) { /* 广播事件 */ }
    on(event, handler) { /* 订阅事件 */ }
    off(event, handler) { /* 取消订阅 */ }
    once(event, handler) { /* 一次性订阅 */ }
}
```

### 5. TemplateLoader（HTML 模板加载器）

```javascript
/**
 * HTML 模板动态加载
 * 支持缓存和回退
 */
class TemplateLoader {
    constructor() {
        this.cache = new Map();
    }
    
    async load(moduleId) {
        // 1. 检查缓存
        if (this.cache.has(moduleId)) {
            return this.cache.get(moduleId);
        }
        
        // 2. 尝试加载 template.html
        try {
            const response = await fetch(`./js/${moduleId}/template.html`);
            if (response.ok) {
                const html = await response.text();
                this.cache.set(moduleId, html);
                return html;
            }
        } catch (e) {
            console.warn(`模板 ${moduleId} 加载失败，使用回退`);
        }
        
        // 3. 回退到 JS 内联 content
        return null;
    }
}
```

### 6. DependencyAnalyzer（依赖分析器）

```javascript
/**
 * 原子位置校验
 * 检测循环依赖和位置错误
 */
class DependencyAnalyzer {
    constructor() {
        this.graph = new Map();  // 依赖图
    }
    
    addDependency(from, to) { /* 添加依赖关系 */ }
    detectCycles() { /* 检测循环依赖 */ }
    findMisplacedAtoms() { /* 查找位置错误的原子 */ }
    suggestMigrations() { /* 建议迁移方案 */ }
    generateReport() { /* 生成校验报告 */ }
}
```

### 7. PrefetchManager（智能预取管理器）

```javascript
/**
 * 智能预取
 * 根据用户行为预测并预加载模块
 */
class PrefetchManager {
    constructor() {
        this.rules = new Map();  // 预取规则
        this.prefetched = new Set();  // 已预取
    }
    
    addRule(trigger, targets) {
        this.rules.set(trigger, targets);
    }
    
    onAppOpened(appId) {
        const targets = this.rules.get(appId);
        if (targets) {
            requestIdleCallback(() => {
                targets.forEach(t => this.prefetch(t));
            });
        }
    }
    
    async prefetch(moduleId) {
        if (this.prefetched.has(moduleId)) return;
        await import(`./js/${moduleId}/index.js`);
        this.prefetched.add(moduleId);
    }
}
```

## 数据模型

### manifest.json 结构

```json
{
  "version": "1.0.0",
  "generated": "2024-12-16T00:00:00Z",
  "modules": {
    "system/store": {
      "entry": "store.js",
      "type": "system",
      "atoms": {
        "idb": {
          "file": "store/idb.js",
          "desc": "IndexedDB 操作",
          "exports": ["initDB", "getItem", "setItem", "deleteItem"],
          "lines": 45
        },
        "sync": {
          "file": "store/sync.js",
          "desc": "数据同步",
          "exports": ["syncFromServer", "syncToServer", "syncBackground"],
          "lines": 38
        }
      },
      "css": "store/store.css",
      "dependencies": ["system/config", "system/event_bus"]
    }
  }
}
```

### 资源注册表数据结构

```javascript
{
  windowId: "win-browser",
  listeners: [
    { element: HTMLElement, event: "click", handler: Function },
    { element: HTMLElement, event: "scroll", handler: Function }
  ],
  timers: [
    { id: 123, type: "interval" },
    { id: 456, type: "timeout" }
  ],
  subscriptions: [
    { event: "network:connected", handler: Function }
  ],
  connections: [
    { type: "websocket", instance: WebSocket }
  ]
}
```

## 正确性属性

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 原子模块行数限制
*For any* 原子模块文件，其代码行数应不超过 50 行
**Validates: Requirements 1.2**

### Property 2: 分子入口存在性
*For any* 原子文件夹，其中应存在 index.js 作为分子入口
**Validates: Requirements 1.3**

### Property 3: 向后兼容导入
*For any* 旧的 import 路径（如 `import { store } from './store.js'`），重构后应仍然有效
**Validates: Requirements 1.4, 8.2**

### Property 4: CSS 文件对应性
*For any* 模块文件夹，其中应存在同名 .css 文件
**Validates: Requirements 2.1**

### Property 5: CSS 动态注入唯一性
*For any* 模块，多次加载后 document.head 中只应有一个对应的 CSS 标签
**Validates: Requirements 6.4**

### Property 6: 用户应用独立性
*For any* 用户应用（apps/ 下），其依赖图中不应包含其他用户应用或 system/components/ 外的系统模块
**Validates: Requirements 3.4**

### Property 7: 资源回收完整性
*For any* 窗口关闭操作，该窗口注册的所有事件监听器、定时器、订阅应被清理
**Validates: Requirements 9.1, 9.2**

### Property 8: DOM 清理完整性
*For any* 窗口关闭操作，该窗口的 DOM 元素及其子元素应从文档中移除
**Validates: Requirements 9.3**

### Property 9: 小天使解耦
*For any* 非 angel 模块的代码，不应直接 import angel.js 或其原子
**Validates: Requirements 10.2**

### Property 10: 循环依赖检测
*For any* 模块依赖图，不应存在循环依赖
**Validates: Requirements 11.4**

### Property 11: 命名规范
*For any* 原子文件名，应符合 `动词_名词.js` 或 `名词.js` 格式
**Validates: Requirements 5.4**

### Property 12: manifest.json 完整性
*For any* 模块，manifest.json 中应包含其 entry、atoms、css、dependencies 字段
**Validates: Requirements 7.4**

## 错误处理

### 模块加载失败

```javascript
async function loadModule(id) {
    try {
        // L1 -> L2 -> L3 查找
        return await moduleCache.get(id);
    } catch (error) {
        console.error(`模块 ${id} 加载失败:`, error);
        
        // 降级策略
        if (error.name === 'NetworkError') {
            // 网络错误：使用过期缓存
            return await moduleCache.getStale(id);
        }
        
        // 其他错误：显示错误提示
        bus.emit('system:error', { 
            type: 'module_load_failed', 
            moduleId: id,
            error: error.message 
        });
        
        return null;
    }
}
```

### 资源回收超时

```javascript
async function closeWindow(windowId) {
    const registry = resourceRegistries.get(windowId);
    
    // 设置 5 秒超时
    const timeout = setTimeout(() => {
        console.warn(`窗口 ${windowId} 关闭超时，强制回收`);
        registry.forceCleanup();
    }, 5000);
    
    try {
        // 正常关闭流程
        await registry.gracefulCleanup();
    } finally {
        clearTimeout(timeout);
    }
}
```

## 测试策略

### 单元测试

- 测试 ModuleCache 的三级缓存逻辑
- 测试 WindowResourceRegistry 的资源注册和回收
- 测试 CSSInjector 的注入和去重
- 测试 EventBus 的发布订阅

### 属性测试

使用 fast-check 库进行属性测试：

```javascript
import fc from 'fast-check';

// Property 1: 原子模块行数限制
test('原子模块行数不超过 50 行', () => {
    fc.assert(
        fc.property(
            fc.constantFrom(...getAllAtomFiles()),
            (atomFile) => {
                const lines = fs.readFileSync(atomFile, 'utf-8').split('\n').length;
                return lines <= 50;
            }
        )
    );
});

// Property 5: CSS 动态注入唯一性
test('CSS 不重复注入', () => {
    fc.assert(
        fc.property(
            fc.constantFrom(...getAllModuleIds()),
            fc.integer({ min: 1, max: 10 }),
            async (moduleId, loadCount) => {
                for (let i = 0; i < loadCount; i++) {
                    await cssInjector.inject(moduleId, `${moduleId}.css`);
                }
                const cssCount = document.querySelectorAll(`[data-module="${moduleId}"]`).length;
                return cssCount === 1;
            }
        )
    );
});
```

### 集成测试

- 测试完整的模块加载流程
- 测试窗口打开/关闭的资源管理
- 测试离线模式下的缓存行为
