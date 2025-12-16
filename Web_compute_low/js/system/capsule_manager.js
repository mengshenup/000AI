/**
 * @fileoverview CapsuleManager 兼容层
 * @description 保持向后兼容，从 capsule_manager/ 目录导入
 * @module system/capsule_manager
 * @deprecated 请直接使用 './capsule_manager/index.js'
 */

// 导出版本号
export const VERSION = '1.0.0';

// 从原子模块导入并导出
export { createCapsule, enableDrag } from './capsule_manager/index.js';
