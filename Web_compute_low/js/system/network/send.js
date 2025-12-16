/**
 * @fileoverview Send - 发送消息原子
 * @description WebSocket 消息发送
 * @module system/network/send
 */

import { bus } from '../event_bus.js';
import { getWS, isConnected } from './websocket.js';

/**
 * 发送消息
 * @param {string|Object} arg1 - 类型或完整对象
 * @param {Object} arg2 - 负载数据
 */
export function send(arg1, arg2 = {}) {
    let type, payload;
    
    if (typeof arg1 === 'object') {
        type = arg1.type;
        payload = arg1;
    } else {
        type = arg1;
        payload = arg2;
    }

    const ws = getWS();
    if (ws && ws.readyState === 1) {
        const data = { ...payload, type };
        ws.send(JSON.stringify(data));
    } else {
        bus.emit('system:speak', "网络未连接，无法发送指令❌");
    }
}
