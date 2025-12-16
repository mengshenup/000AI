/**
 * @fileoverview WindowResourceRegistry - 窗口资源注册表
 * @description 类 Rust 所有权管理，窗口关闭时自动回收所有资源
 * @module system/resource_registry
 * @requires system/event_bus
 * 
 * 🎨 代码用途：
 *    管理每个窗口的资源（事件监听器、定时器、订阅、连接），
 *    窗口关闭时自动清理，防止内存泄漏。
 * 
 * 💡 易懂解释：
 *    这是一个"资源管家"。每个窗口开门时，管家会记录它用了哪些东西。
 *    窗口关门时，管家会自动把这些东西都收拾干净。🧹
 */

import { bus } from './event_bus.js';

/**
 * 窗口资源注册表
 */
class WindowResourceRegistry {
    /**
     * @param {string} windowId - 窗口 ID
     */
    constructor(windowId) {
        /** @type {string} 窗口 ID */
        this.windowId = windowId;
        
        /** @type {Array<{element: Element, event: string, handler: Function, options?: any}>} 事件监听器 */
        this.listeners = [];
        
        /** @type {Array<{id: number, type: 'timeout'|'interval'}>} 定时器 */
        this.timers = [];
        
        /** @type {Array<{event: string, handler: Function}>} 事件总线订阅 */
        this.subscriptions = [];
        
        /** @type {Array<{type: string, instance: any}>} 网络连接 */
        this.connections = [];
        
        /** @type {Element|null} 窗口 DOM 元素 */
        this.domElement = null;
        
        /** @type {number} 创建时间戳 */
        this.createdAt = Date.now();
        
        /** @type {number} 最后活跃时间戳 */
        this.lastActiveAt = Date.now();
        
        /** @type {boolean} 是否已清理 */
        this.cleaned = false;
    }

    /**
     * 更新最后活跃时间
     */
    touch() {
        this.lastActiveAt = Date.now();
    }

    /**
     * 设置窗口 DOM 元素
     * @param {Element} element - DOM 元素
     */
    setDOMElement(element) {
        this.domElement = element;
    }

    /**
     * 注册事件监听器
     * @param {Element} element - DOM 元素
     * @param {string} event - 事件名
     * @param {Function} handler - 处理函数
     * @param {any} [options] - addEventListener 选项
     * @returns {Function} 移除监听器的函数
     */
    addListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        this.listeners.push({ element, event, handler, options });
        
        // 返回移除函数
        return () => this.removeListener(element, event, handler);
    }

    /**
     * 移除事件监听器
     * @param {Element} element - DOM 元素
     * @param {string} event - 事件名
     * @param {Function} handler - 处理函数
     */
    removeListener(element, event, handler) {
        element.removeEventListener(event, handler);
        this.listeners = this.listeners.filter(
            l => !(l.element === element && l.event === event && l.handler === handler)
        );
    }

    /**
     * 注册定时器
     * @param {number} timerId - 定时器 ID
     * @param {'timeout'|'interval'} type - 定时器类型
     */
    addTimer(timerId, type) {
        this.timers.push({ id: timerId, type });
    }

    /**
     * 创建并注册 setTimeout
     * @param {Function} callback - 回调函数
     * @param {number} delay - 延迟毫秒数
     * @returns {number} 定时器 ID
     */
    setTimeout(callback, delay) {
        const id = window.setTimeout(callback, delay);
        this.addTimer(id, 'timeout');
        return id;
    }

    /**
     * 创建并注册 setInterval
     * @param {Function} callback - 回调函数
     * @param {number} interval - 间隔毫秒数
     * @returns {number} 定时器 ID
     */
    setInterval(callback, interval) {
        const id = window.setInterval(callback, interval);
        this.addTimer(id, 'interval');
        return id;
    }

    /**
     * 清除定时器
     * @param {number} timerId - 定时器 ID
     */
    clearTimer(timerId) {
        const timer = this.timers.find(t => t.id === timerId);
        if (timer) {
            if (timer.type === 'interval') {
                clearInterval(timerId);
            } else {
                clearTimeout(timerId);
            }
            this.timers = this.timers.filter(t => t.id !== timerId);
        }
    }

    /**
     * 注册事件总线订阅
     * @param {string} event - 事件名
     * @param {Function} handler - 处理函数
     * @returns {Function} 取消订阅的函数
     */
    subscribe(event, handler) {
        bus.on(event, handler);
        this.subscriptions.push({ event, handler });
        
        // 返回取消订阅函数
        return () => this.unsubscribe(event, handler);
    }

    /**
     * 取消事件总线订阅
     * @param {string} event - 事件名
     * @param {Function} handler - 处理函数
     */
    unsubscribe(event, handler) {
        bus.off(event, handler);
        this.subscriptions = this.subscriptions.filter(
            s => !(s.event === event && s.handler === handler)
        );
    }

    /**
     * 注册网络连接
     * @param {string} type - 连接类型 (websocket, fetch, etc.)
     * @param {any} instance - 连接实例
     */
    addConnection(type, instance) {
        this.connections.push({ type, instance });
    }

    /**
     * 移除网络连接
     * @param {any} instance - 连接实例
     */
    removeConnection(instance) {
        this.connections = this.connections.filter(c => c.instance !== instance);
    }

    /**
     * 强制清理所有资源
     */
    forceCleanup() {
        if (this.cleaned) return;
        
        console.log(`🧹 [${this.windowId}] 开始强制清理资源...`);
        
        // 1. 清理事件监听器
        this.listeners.forEach(({ element, event, handler, options }) => {
            try {
                element.removeEventListener(event, handler, options);
            } catch (e) {
                console.warn(`⚠️ 移除监听器失败:`, e);
            }
        });
        this.listeners = [];
        
        // 2. 清理定时器
        this.timers.forEach(({ id, type }) => {
            try {
                if (type === 'interval') {
                    clearInterval(id);
                } else {
                    clearTimeout(id);
                }
            } catch (e) {
                console.warn(`⚠️ 清除定时器失败:`, e);
            }
        });
        this.timers = [];
        
        // 3. 清理事件总线订阅
        this.subscriptions.forEach(({ event, handler }) => {
            try {
                bus.off(event, handler);
            } catch (e) {
                console.warn(`⚠️ 取消订阅失败:`, e);
            }
        });
        this.subscriptions = [];
        
        // 4. 关闭网络连接
        this.connections.forEach(({ type, instance }) => {
            try {
                if (instance && typeof instance.close === 'function') {
                    instance.close();
                } else if (instance && typeof instance.abort === 'function') {
                    instance.abort();
                }
            } catch (e) {
                console.warn(`⚠️ 关闭连接失败:`, e);
            }
        });
        this.connections = [];
        
        // 5. 移除 DOM 元素
        if (this.domElement && this.domElement.parentNode) {
            this.domElement.parentNode.removeChild(this.domElement);
            this.domElement = null;
        }
        
        this.cleaned = true;
        console.log(`✅ [${this.windowId}] 资源清理完成`);
    }

    /**
     * 获取资源统计
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            windowId: this.windowId,
            listeners: this.listeners.length,
            timers: this.timers.length,
            subscriptions: this.subscriptions.length,
            connections: this.connections.length,
            createdAt: this.createdAt,
            lastActiveAt: this.lastActiveAt,
            cleaned: this.cleaned
        };
    }
}

/**
 * 资源注册表管理器（全局单例）
 */
class ResourceRegistryManager {
    constructor() {
        /** @type {Map<string, WindowResourceRegistry>} 所有窗口的注册表 */
        this.registries = new Map();
        
        /** @type {number} 强制关闭超时时间 (毫秒) */
        this.forceCloseTimeout = 5000;
    }

    /**
     * 创建窗口资源注册表
     * @param {string} windowId - 窗口 ID
     * @returns {WindowResourceRegistry} 注册表实例
     */
    create(windowId) {
        if (this.registries.has(windowId)) {
            console.warn(`⚠️ 窗口 ${windowId} 的注册表已存在，将覆盖`);
            this.cleanup(windowId);
        }
        
        const registry = new WindowResourceRegistry(windowId);
        this.registries.set(windowId, registry);
        return registry;
    }

    /**
     * 获取窗口资源注册表
     * @param {string} windowId - 窗口 ID
     * @returns {WindowResourceRegistry|undefined} 注册表实例
     */
    get(windowId) {
        return this.registries.get(windowId);
    }

    /**
     * 清理窗口资源（带超时强制清理）
     * @param {string} windowId - 窗口 ID
     * @returns {Promise<void>}
     */
    async cleanup(windowId) {
        const registry = this.registries.get(windowId);
        if (!registry) return;

        // 设置超时强制清理
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`窗口 ${windowId} 关闭超时`));
            }, this.forceCloseTimeout);
        });

        try {
            // 尝试优雅关闭
            await Promise.race([
                this.gracefulCleanup(registry),
                timeoutPromise
            ]);
        } catch (e) {
            console.warn(`⚠️ ${e.message}，强制回收`);
            registry.forceCleanup();
        }

        this.registries.delete(windowId);
    }

    /**
     * 优雅清理
     * @param {WindowResourceRegistry} registry - 注册表实例
     */
    async gracefulCleanup(registry) {
        registry.forceCleanup();
    }

    /**
     * 获取最久未使用的窗口
     * @param {number} [count=1] - 返回数量
     * @returns {string[]} 窗口 ID 列表
     */
    getLeastRecentlyUsed(count = 1) {
        const sorted = Array.from(this.registries.entries())
            .sort((a, b) => a[1].lastActiveAt - b[1].lastActiveAt);
        
        return sorted.slice(0, count).map(([id]) => id);
    }

    /**
     * 获取所有窗口统计
     * @returns {Object[]} 统计信息数组
     */
    getAllStats() {
        return Array.from(this.registries.values()).map(r => r.getStats());
    }
}

// 导出单例
export const resourceManager = new ResourceRegistryManager();

// 导出类（用于测试）
export { WindowResourceRegistry, ResourceRegistryManager };
