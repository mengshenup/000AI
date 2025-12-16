/**
 * @fileoverview Login 兼容层
 * @description 保持向后兼容，从 login/ 目录导入
 * @module apps_system/login
 * @deprecated 请直接使用 './login/index.js'
 */

export { VERSION, config, loginApp, init } from './login/index.js';
