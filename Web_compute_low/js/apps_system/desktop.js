/**
 * @fileoverview Desktop 兼容层
 * @description 保持向后兼容，从 desktop/ 目录导入
 * @module apps_system/desktop
 * @deprecated 请直接使用 './desktop/index.js'
 */

// 从原子模块导入并导出
export { VERSION, config, init, render } from './desktop/index.js';
