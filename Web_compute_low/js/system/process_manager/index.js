/**
 * @fileoverview ProcessManager 分子入口
 * @description 组合所有进程管理原子，提供统一接口
 * @module system/process_manager/index
 */

import { getAppStats, stats } from './stats.js';
import { getResourceCount, queues } from './queue.js';
import { getContext } from './context.js';
import { kill } from './kill.js';

export const VERSION = '1.0.0';

/**
 * 进程管理器类
 */
class ProcessManager {
    constructor() {
        // 使用原子模块的存储
    }

    get queues() { return queues; }
    get stats() { return stats; }

    /**
     * 获取应用性能统计
     */
    getAppStats(appId) {
        return getAppStats(appId);
    }

    /**
     * 获取应用资源计数
     */
    getAppResourceCount(appId) {
        return getResourceCount(appId);
    }

    /**
     * 获取应用上下文
     */
    getContext(appId) {
        return getContext(appId);
    }

    /**
     * 终止应用进程
     */
    kill(appId) {
        kill(appId);
    }
}

// 导出单例
export const pm = new ProcessManager();

// 导出原子
export { getAppStats } from './stats.js';
export { getResourceCount, getQueue } from './queue.js';
export { getContext } from './context.js';
export { kill } from './kill.js';
