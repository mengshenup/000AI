/**
 * @fileoverview Network 分子入口
 * @description 网络管理模块
 * @module system/network/index
 */

import { connect, getWS, isConnected } from './websocket.js';
import { startHeartbeat, stopHeartbeat } from './heartbeat.js';
import { send } from './send.js';

export const VERSION = '1.0.0';

/**
 * 网络管理类
 */
export class Network {
    constructor() {
        this.ws = null;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
    }

    connect() { connect(); }
    
    startHeartbeat() { startHeartbeat(getWS()); }
    
    send(arg1, arg2 = {}) { send(arg1, arg2); }

    get isConnected() { return isConnected(); }
}

export const network = new Network();

// 导出原子
export { connect, getWS, isConnected } from './websocket.js';
export { startHeartbeat, stopHeartbeat } from './heartbeat.js';
export { send } from './send.js';
