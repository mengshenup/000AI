/**
 * @fileoverview 应用上下文原子
 * @description 为应用提供沙箱化的资源申请接口
 * @module system/process_manager/context
 */

import { bus } from '../event_bus.js';
import { getQueue, initQueue } from './queue.js';
import { initStats, log, measure } from './stats.js';

/**
 * 获取应用上下文
 * @param {string} appId - 应用ID
 * @returns {Object} 应用上下文对象
 */
export function getContext(appId) {
    // 重置性能统计
    initStats(appId);
    log(appId, 'SYS', '进程启动，性能统计已重置');

    // 初始化队列
    initQueue(appId);

    return {
        id: appId,

        // 定时器
        setInterval: (callback, delay) => {
            const wrappedCallback = () => measure(appId, callback);
            const id = window.setInterval(wrappedCallback, delay);
            getQueue(appId).intervals.add(id);
            log(appId, 'RES', `申请定时器 (ID: ${id}, Delay: ${delay}ms)`);
            return id;
        },

        // 延时器
        setTimeout: (callback, delay) => {
            const wrappedCallback = () => {
                getQueue(appId).timeouts.delete(id);
                measure(appId, callback);
            };
            const id = window.setTimeout(wrappedCallback, delay);
            getQueue(appId).timeouts.add(id);
            log(appId, 'RES', `申请延时器 (ID: ${id}, Delay: ${delay}ms)`);
            return id;
        },

        // 动画帧
        requestAnimationFrame: (callback) => {
            const wrappedCallback = (t) => {
                getQueue(appId).animations.delete(id);
                measure(appId, () => callback(t));
            };
            const id = window.requestAnimationFrame(wrappedCallback);
            getQueue(appId).animations.add(id);
            return id;
        },

        // DOM 事件监听
        addEventListener: (target, type, listener, options) => {
            const wrappedListener = (e) => measure(appId, () => listener(e));
            target.addEventListener(type, wrappedListener, options);
            getQueue(appId).events.push({ target, type, listener: wrappedListener, options });
            log(appId, 'RES', `监听 DOM 事件 (${type})`);
        },

        // EventBus 监听
        on: (event, callback) => {
            const wrappedCallback = (data) => measure(appId, () => callback(data));
            bus.on(event, wrappedCallback);
            getQueue(appId).busListeners.push({ event, callback: wrappedCallback });
            log(appId, 'RES', `订阅总线事件 (${event})`);
        },

        // 注册清理函数
        onCleanup: (callback) => {
            getQueue(appId).cleanups.push(callback);
            log(appId, 'INFO', `注册清理钩子`);
        },

        // 手动清理
        clearInterval: (id) => {
            window.clearInterval(id);
            getQueue(appId).intervals.delete(id);
            log(appId, 'FREE', `释放定时器 (ID: ${id})`);
        },

        clearTimeout: (id) => {
            window.clearTimeout(id);
            getQueue(appId).timeouts.delete(id);
            log(appId, 'FREE', `释放延时器 (ID: ${id})`);
        },

        cancelAnimationFrame: (id) => {
            window.cancelAnimationFrame(id);
            getQueue(appId).animations.delete(id);
        },

        off: (event, callback) => {
            bus.off(event, callback);
            const q = getQueue(appId);
            q.busListeners = q.busListeners.filter(
                l => l.event !== event || l.callback !== callback
            );
            log(appId, 'FREE', `取消订阅事件 (${event})`);
        }
    };
}
