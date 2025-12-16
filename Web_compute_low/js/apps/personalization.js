/**
 * @fileoverview Personalization 兼容层
 * @description 保持向后兼容，从 personalization/ 目录导入
 * @module apps/personalization
 * @deprecated 请直接使用 './personalization/index.js'
 */

export { config, WALLPAPERS, APP_NAME, app, init } from './personalization/index.js';
