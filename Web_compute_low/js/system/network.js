/**
 * @fileoverview Network 兼容层
 * @description 向后兼容的导出入口，实际实现在 network/ 目录下
 * @module system/network
 * @deprecated 请直接使用 './network/index.js'
 */

export { 
    VERSION, 
    Network, 
    network,
    connect,
    getWS,
    isConnected,
    startHeartbeat,
    stopHeartbeat,
    send
} from './network/index.js';
