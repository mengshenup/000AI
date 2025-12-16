/**
 * @fileoverview On - 监听事件原子
 * @description 事件订阅功能
 * @module system/event_bus/on
 */

/**
 * 订阅事件
 * @param {Object} listeners - 监听器字典
 * @param {string} event - 事件名
 * @param {Function} callback - 回调函数
 */
export function on(listeners, event, callback) {
    if (!listeners[event]) {
        listeners[event] = [];
    }
    listeners[event].push(callback);
}
