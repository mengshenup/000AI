/**
 * @fileoverview Heartbeat - 心跳机制原子
 * @description WebSocket 心跳保活
 * @module system/network/heartbeat
 */

/** @type {number|null} */
let heartbeatTimer = null;

/**
 * 启动心跳
 * @param {WebSocket} ws - WebSocket 实例
 */
export function startHeartbeat(ws) {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
        }
    }, 30000);
}

/**
 * 停止心跳
 */
export function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}
