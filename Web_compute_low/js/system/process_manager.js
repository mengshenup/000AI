/**
 * @fileoverview ProcessManager 兼容层
 * @description 保持向后兼容，从 process_manager/ 目录导入
 * @module system/process_manager
 * @deprecated 请直接使用 './process_manager/index.js'
 */

// 导出版本号
export const VERSION = '1.0.0';

// 从原子模块导入并导出
export { pm } from './process_manager/index.js';
export { getAppStats } from './process_manager/stats.js';
export { getResourceCount, getQueue } from './process_manager/queue.js';
export { getContext } from './process_manager/context.js';
export { kill } from './process_manager/kill.js';
