/**
 * @fileoverview 进程终止原子
 * @description 处理应用进程的强制终止和资源清理
 * @module system/process_manager/kill
 */

import { bus } from '../event_bus.js';
import { queues, deleteQueue } from './queue.js';
import { log } from './stats.js';

/**
 * 终止应用进程
 * @param {string} appId - 应用ID
 */
export function kill(appId) {
    const queue = queues.get(appId);
    if (!queue) return;

    log(appId, 'WARN', `正在强制终止进程...`);
    console.log(`[ProcessManager] 正在清理进程 ${appId} 的资源队列...`);

    // 1. 执行自定义清理函数
    if (queue.cleanups) {
        queue.cleanups.forEach(cb => {
            try {
                cb();
            } catch (e) {
                console.error(`[ProcessManager] Cleanup error for ${appId}:`, e);
            }
        });
    }

    // 2. 清理定时器
    queue.intervals.forEach(id => window.clearInterval(id));
    const timerCount = queue.intervals.size + queue.timeouts.size;
    queue.intervals.clear();

    // 3. 清理延时器
    queue.timeouts.forEach(id => window.clearTimeout(id));
    queue.timeouts.clear();

    // 4. 清理动画帧
    queue.animations.forEach(id => window.cancelAnimationFrame(id));
    queue.animations.clear();

    // 5. 清理 DOM 事件监听
    queue.events.forEach(({ target, type, listener, options }) => {
        if (target && typeof target.removeEventListener === 'function') {
            target.removeEventListener(type, listener, options);
        }
    });
    const eventCount = queue.events.length + queue.busListeners.length;
    queue.events = [];

    // 6. 清理 EventBus 监听
    if (queue.busListeners) {
        queue.busListeners.forEach(({ event, callback }) => {
            bus.off(event, callback);
        });
        queue.busListeners = [];
    }

    // 7. 删除队列
    deleteQueue(appId);

    log(appId, 'SUCCESS', `进程已终止，回收资源: 定时器 ${timerCount}, 监听器 ${eventCount}`);
    console.log(`[ProcessManager] 进程 ${appId} 清理完毕 ✨`);
}
