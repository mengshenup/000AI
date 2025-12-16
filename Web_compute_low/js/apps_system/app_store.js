/**
 * @fileoverview AppStore 兼容层
 * @description 保持向后兼容，从 app_store/ 目录导入
 * @module apps_system/app_store
 * @deprecated 请直接使用 './app_store/index.js'
 */

export { config, appStoreApp, init, VERSION } from './app_store/index.js';
