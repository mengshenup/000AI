/**
 * @fileoverview CapsuleManager 分子入口
 * @description 组合所有胶囊管理原子，提供统一接口
 * @module system/capsule_manager/index
 */

import { createCapsule } from './create.js';
import { enableDrag } from './drag.js';

export const VERSION = '1.0.0';

// 导出原子
export { createCapsule, enableDrag };
