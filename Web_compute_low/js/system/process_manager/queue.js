/**
 * @fileoverview 资源队列原子
 * @description 管理应用的资源队列
 * @module system/process_manager/queue
 */

import { log } from './stats.js';

// 资源队列存储
export const queues = new Map();

/**
 * 创建新的资源队列
 * @returns {Object} 资源队列对象
 */
export function createQueue() {
    return {
        intervals: new Set(),
        timeouts: new Set(),
        animations: new Set(),
        events: [],
        busListeners: [],
        cleanups: []
    };
}

/**
 * 获取或创建资源队列
 * @param {string} appId - 应用ID
 * @returns {Object} 资源队列
 */
export function getQueue(appId) {
    let queue = queues.get(appId);
    if (!queue) {
        queue = createQueue();
        queues.set(appId, queue);
        log(appId, 'INFO', '进程上下文已重建 (复活)');
    }
    return queue;
}

/**
 * 初始化应用队列
 * @param {string} appId - 应用ID
 */
export function initQueue(appId) {
    if (!queues.has(appId)) {
        queues.set(appId, createQueue());
        log(appId, 'INFO', '进程上下文已创建');
    }
}

/**
 * 删除应用队列
 * @param {string} appId - 应用ID
 */
export function deleteQueue(appId) {
    queues.delete(appId);
}

/**
 * 获取应用资源计数
 * @param {string} appId - 应用ID
 * @returns {Object} 资源计数
 */
export function getResourceCount(appId) {
    const queue = queues.get(appId);
    if (!queue) {
        return { timers: 0, events: 0, animations: 0, total: 0 };
    }
    const timers = queue.intervals.size + queue.timeouts.size;
    const events = queue.events.length + queue.busListeners.length;
    const animations = queue.animations.size;
    return {
        timers,
        events,
        animations,
        total: timers + events + animations
    };
}
