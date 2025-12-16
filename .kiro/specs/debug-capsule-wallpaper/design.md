# Design Document

## Overview

通过逐步追踪代码执行流程，定位并修复胶囊体和壁纸选择器的 BUG。

## Architecture

### 胶囊体数据流

```
billing/index.js init()
    ↓
store.setAppMetadata(detailConfig.id, detailConfig)  // 注册 win-billing
    ↓
createCapsule({ detailConfig })
    ↓
store.setAppMetadata(detailConfig.id, detailConfig)  // 再次注册
    ↓
用户点击胶囊
    ↓
wm.openApp(detailConfig.id)  // 打开 win-billing
    ↓
store.getApp('win-billing')  // 获取配置
    ↓
createWindow('win-billing', appInfo)  // 创建窗口
```

### 壁纸选择器数据流

```
用户点击桌面图标
    ↓
wm.openApp('win-personalization')
    ↓
懒加载 personalization.js
    ↓
SettingsApp 构造函数执行，注册 app:ready 监听器
    ↓
store.setAppMetadata(config.id, config)
    ↓
createWindow('win-personalization', appInfo)
    ↓
bus.emit('app:ready:win-personalization')
    ↓
SettingsApp.init() → initWallpaperGrid()
```

## Components and Interfaces

### 需要检查的关键函数

1. `store.setAppMetadata(id, metadata)` - 是否正确保存 content
2. `store.getApp(id)` - 是否正确返回 content
3. `createWindow(id, app)` - 是否正确使用 content
4. `createCapsule(options)` - 是否正确传递 detailConfig
5. `initWallpaperGrid()` - 是否被调用，DOM 是否存在

## Data Models

### detailConfig 结构
```javascript
{
    id: 'win-billing',
    content: '<div>...</div>',  // 关键字段
    frameless: true,
    width: 200,
    height: 200,
    // ...
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Content 保持不变
*For any* detailConfig 传入 setAppMetadata，调用 getApp 后返回的对象 SHALL 包含相同的 content
**Validates: Requirements 1.2**

### Property 2: 壁纸网格初始化
*For any* 打开个性化设置窗口的操作，initWallpaperGrid SHALL 被调用且 #wp-grid 元素存在
**Validates: Requirements 2.1**

## Error Handling

- 如果 content 为空，记录错误日志
- 如果 #wp-grid 不存在，记录错误日志

## Testing Strategy

### 调试步骤

1. 在浏览器控制台检查日志输出
2. 手动验证 store.getApp('win-billing').content 是否存在
3. 手动验证 document.getElementById('wp-grid') 是否存在
4. 逐步追踪函数调用链
