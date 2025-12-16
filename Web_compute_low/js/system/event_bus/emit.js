/**
 * @fileoverview Emit - 发送事件原子
 * @description 事件发布功能
 * @module system/event_bus/emit
 */

/**
 * 触发事件
 * @param {Object} listeners - 监听器字典
 * @param {string} event - 事件名
 * @param {any} data - 事件数据
 */
export function emit(listeners, event, data) {
    if (listeners[event]) {
        listeners[event].forEach(callback => callback(data));
    }
}
