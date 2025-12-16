/**
 * @fileoverview KeyManager 兼容层
 * @description 保持向后兼容，从 key_manager/ 目录导入
 * @module apps_system/key_manager
 * @deprecated 请直接使用 './key_manager/index.js'
 */

export { VERSION, config, init } from './key_manager/index.js';
