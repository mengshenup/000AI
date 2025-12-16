/**
 * @fileoverview Angel 兼容层
 * @description 保持向后兼容，从 angel/ 目录导入
 * @module apps_system/angel
 * @deprecated 请直接使用 './angel/index.js'
 */

// 从原子模块导入并导出
export { VERSION, config, AngelApp, app } from './angel/index.js';
