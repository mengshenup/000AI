/**
 * @fileoverview Off - 取消监听原子
 * @description 取消事件订阅功能
 * @module system/event_bus/off
 */

/**
 * 取消订阅
 * @param {Object} listeners - 监听器字典
 * @param {string} event - 事件名
 * @param {Function} callback - 回调函数
 */
export function off(listeners, event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
}
