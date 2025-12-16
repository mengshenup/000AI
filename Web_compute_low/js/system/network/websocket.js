/**
 * @fileoverview WebSocket - 连接管理原子
 * @description WebSocket 连接建立和管理
 * @module system/network/websocket
 */

import { WS_URL } from '../config.js';
import { bus } from '../event_bus.js';
import { startHeartbeat, stopHeartbeat } from './heartbeat.js';

/** @type {WebSocket|null} */
let ws = null;

/** @type {number|null} */
let reconnectTimer = null;

/** @type {number} 重连次数 */
let reconnectCount = 0;

/** @type {number} 最大重连次数 */
const MAX_RECONNECT = 10;

/** @type {number} 基础重连间隔(毫秒) */
const BASE_RECONNECT_DELAY = 3000;

/** @type {number} 最大重连间隔(毫秒) */
const MAX_RECONNECT_DELAY = 60000;

/**
 * 计算重连延迟（指数退避）
 * @returns {number} 延迟毫秒数
 */
function getReconnectDelay() {
    // 指数退避: 3s, 6s, 12s, 24s, 48s, 60s(max)
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectCount), MAX_RECONNECT_DELAY);
    return delay;
}

/**
 * 建立 WebSocket 连接
 * 
 * 🧱 踩坑记录:
 *    1. [2025-12-17] [已修复] 连接前先清理旧的重连定时器，避免多个定时器同时运行
 */
export function connect() {
    // 清理旧的重连定时器
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    
    // 清理旧连接
    if (ws) {
        try {
            ws.onclose = null; // 防止触发重连
            ws.close();
        } catch (e) { }
        ws = null;
    }
    
    try {
        const userId = localStorage.getItem('current_user_id');
        const token = localStorage.getItem('angel_auth_token');

        if (!userId || !token) {
            console.warn("🚫 未登录或无 Token，跳过 WebSocket 连接");
            return;
        }

        console.log(`🆔 Current User ID: ${userId}`);

        const baseUrl = WS_URL.endsWith('/') ? WS_URL : WS_URL + '/';
        const finalUrl = `${baseUrl}${userId}?token=${encodeURIComponent(token)}`;
        
        ws = new WebSocket(finalUrl);

        ws.onopen = () => {
            console.log("✅ WS Connected");
            reconnectCount = 0; // 重置重连计数
            startHeartbeat(ws);
            bus.emit('system:speak', "网络接通！信号满格📶");
            bus.emit('network:connected');
        };

        ws.onerror = (err) => {
            // 🧱 [2025-12-17] 修复: 首次连接失败时减少日志噪音
            if (reconnectCount === 0) {
                console.log("⚠️ WS 连接失败 (Agent服务器可能未启动)");
            }
        };

        ws.onmessage = (e) => {
            const raw = e.data;
            if (!raw || typeof raw !== 'string') return;
            
            const trimmed = raw.trim();
            if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
                console.log(`[WS] 收到非JSON消息: ${trimmed.substring(0, 50)}`);
                return;
            }
            
            let d;
            try {
                d = JSON.parse(raw);
            } catch (err) {
                console.warn(`[WS] JSON解析失败: ${raw.substring(0, 100)}`);
                return;
            }

            if (d._stats) bus.emit('net:stats', d._stats);
            if (d.type === 'log') bus.emit('system:speak', d.msg);
            if (d.type === 'debug') console.log(`🔧 [Server]: ${d.msg}`);
            if (d.type === 'vision') bus.emit('net:frame', d.frame);
            if (d.type === 'frame_update') bus.emit('net:frame', d.image);
            if (d.type === 'new_intel') bus.emit('net:intel', d.data);
            if (d.type === 'url_update') bus.emit('net:url_update', d.url);
            if (d.type === 'status') bus.emit('net:status', d.msg);
        };

        ws.onclose = (event) => {
            console.log(`⚠️ WS Closed (code: ${event.code})`);
            stopHeartbeat();
            
            // 检查是否超过最大重连次数
            if (reconnectCount >= MAX_RECONNECT) {
                console.warn("❌ 达到最大重连次数，停止重连");
                bus.emit('system:speak', "网络连接失败，请检查服务器");
                return;
            }
            
            reconnectCount++;
            const delay = getReconnectDelay();
            console.log(`🔄 将在 ${delay/1000} 秒后重连 (第 ${reconnectCount}/${MAX_RECONNECT} 次)`);
            
            if (reconnectCount === 1) {
                bus.emit('system:speak', "网络中断，正在重连...📡");
            }

            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => connect(), delay);
        };
    } catch (e) {
        console.error("❌ WebSocket 连接异常:", e);
        
        // 异常时也进行重连
        reconnectCount++;
        if (reconnectCount < MAX_RECONNECT) {
            const delay = getReconnectDelay();
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => connect(), delay);
        }
    }
}

/**
 * 获取 WebSocket 实例
 * @returns {WebSocket|null}
 */
export function getWS() {
    return ws;
}

/**
 * 检查连接状态
 * @returns {boolean}
 */
export function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
}
