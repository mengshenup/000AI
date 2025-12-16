/**
 * @fileoverview Billing 兼容层
 * @description 保持向后兼容，从 billing/ 目录导入
 * @module apps_system/billing
 * @deprecated 请直接使用 './billing/index.js'
 */

export { VERSION, config, init } from './billing/index.js';
