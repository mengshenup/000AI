/**
 * @fileoverview 性能统计原子
 * @description 处理应用性能统计和日志记录
 * @module system/process_manager/stats
 */

// 性能统计存储
export const stats = new Map();

/**
 * 获取应用性能统计数据
 * @param {string} appId - 应用ID
 * @returns {Object} 统计数据
 */
export function getAppStats(appId) {
    if (!stats.has(appId)) {
        return {
            cpuTime: 0,
            lastActive: 0,
            startTime: Date.now(),
            longTasks: 0,
            longTaskTime: 0,
            logs: []
        };
    }
    return stats.get(appId);
}

/**
 * 初始化应用统计
 * @param {string} appId - 应用ID
 */
export function initStats(appId) {
    stats.set(appId, {
        cpuTime: 0,
        lastActive: Date.now(),
        startTime: Date.now(),
        longTasks: 0,
        longTaskTime: 0,
        logs: []
    });
}

/**
 * 记录日志
 * @param {string} appId - 应用ID
 * @param {string} type - 日志类型
 * @param {string} message - 日志消息
 */
export function log(appId, type, message) {
    if (!stats.has(appId)) {
        initStats(appId);
    }
    const stat = stats.get(appId);
    const time = new Date().toLocaleTimeString();
    stat.logs.unshift(`[${time}] [${type}] ${message}`);
    if (stat.logs.length > 50) stat.logs.pop();
}

/**
 * 测量函数执行时间
 * @param {string} appId - 应用ID
 * @param {Function} fn - 要执行的函数
 */
export function measure(appId, fn) {
    const start = performance.now();
    try {
        fn();
    } finally {
        const end = performance.now();
        const duration = end - start;

        if (!stats.has(appId)) {
            initStats(appId);
        }
        const stat = stats.get(appId);
        stat.cpuTime += duration;
        stat.lastActive = end;

        // 检测长任务 (>50ms)
        if (duration > 50) {
            stat.longTasks++;
            stat.longTaskTime += duration;
        }
    }
}
