/**
 * @fileoverview Manual 分子入口
 * @description 说明书应用入口
 * @module apps/manual/index
 */

import { config } from './config.js';

export const VERSION = '1.0.0';
export { config };

class ManualApp {
    constructor() {
        // 说明书是静态内容，无需特殊初始化
    }
}

export const app = new ManualApp();
