/**
 * @fileoverview Traffic 兼容层
 * @description 保持向后兼容，从 traffic/ 目录导入
 * @module apps_system/traffic
 * @deprecated 请直接使用 './traffic/index.js'
 */

export { VERSION, config, init } from './traffic/index.js';
