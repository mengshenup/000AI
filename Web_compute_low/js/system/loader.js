/**
 * @fileoverview Loader 兼容层
 * @description 保持向后兼容，从 loader/ 目录导入
 * @module system/loader
 * @deprecated 请直接使用 './loader/index.js'
 */

// 直接导入并执行 loader/index.js
// 该模块会自动设置 window.onload
import './loader/index.js';

// 导出版本号
export const VERSION = '1.0.0';

// 导出原子（用于细粒度导入）
export { initSystem } from './loader/init.js';
export { setupUIBindings, startClock, exposeDebugFunctions } from './loader/ui.js';
export { setupBusinessLogic } from './loader/business.js';
export { fetchAppsList, getOfflineApps } from './loader/fetch.js';
export { loadApp, checkUpdate } from './loader/apps.js';
