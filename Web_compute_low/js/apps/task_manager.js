/**
 * @fileoverview TaskManager 兼容层
 * @description 保持向后兼容，从 task_manager/ 目录导入
 * @module apps/task_manager
 * @deprecated 请直接使用 './task_manager/index.js'
 */

export { config, APP_NAME, TaskManagerApp, app } from './task_manager/index.js';
