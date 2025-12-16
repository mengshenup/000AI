/**
 * @fileoverview WindowManager 兼容层
 * @description 向后兼容的导出入口，实际实现在 window_manager/ 目录下
 * @module system/window_manager
 * @deprecated 请直接使用 './window_manager/index.js'
 * 
 * 🎨 代码用途：
 *    这是一个兼容层，保持旧的 import 路径可用。
 *    实际实现已拆分到 window_manager/ 目录下的原子模块。
 * 
 * 使用方式：
 *    旧代码: import { wm } from './window_manager.js'  ✅ 仍然有效
 *    新代码: import { openApp } from './window_manager/open.js'  ✅ 更细粒度
 */

// 从分子入口重新导出所有内容
export { 
    VERSION,
    WindowManager,
    wm,
    // 原子导出
    createWindow,
    openApp,
    closeApp,
    killApp,
    minimizeApp,
    restoreApp,
    bringToFront,
    handleWindowClick,
    loadWallpaper,
    changeWallpaper,
    dragState,
    startDrag,
    handleMouseMove,
    handleMouseUp
} from './window_manager/index.js';
