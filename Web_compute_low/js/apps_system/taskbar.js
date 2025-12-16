/**
 * @fileoverview Taskbar 兼容层
 * @description 保持向后兼容，从 taskbar/ 目录导入
 * @module apps_system/taskbar
 * @deprecated 请直接使用 './taskbar/index.js'
 */

// 从原子模块导入并导出
export { VERSION, config, init, updateApps, renderTrayIcons, bindStartButton } from './taskbar/index.js';
