/**
 * @fileoverview MemoryPressureMonitor - 内存压力监控
 * @description 监控内存使用，自动关闭最久未使用的后台窗口
 * @module system/memory_monitor
 * @requires system/resource_registry
 * @requires system/event_bus
 * 
 * 🎨 代码用途：
 *    监控浏览器内存使用情况，当内存压力过大时，
 *    自动关闭最久未使用的后台窗口，释放资源。
 * 
 * 💡 易懂解释：
 *    这是一个"内存管家"。当房子（内存）快满了，
 *    管家会把最久没人用的房间（窗口）清理掉。🏠
 */

import { resourceManager } from './resource_registry.js';
import { bus } from './event_bus.js';

/**
 * 内存压力监控器
 */
class MemoryPressureMonitor {
    constructor() {
        /** @type {number} 检查间隔 (毫秒) */
        this.checkInterval = 30000; // 30 秒
        
        /** @type {number} 内存压力阈值 (MB) */
        this.pressureThreshold = 500;
        
        /** @type {number} 定时器 ID */
        this.timerId = null;
        
        /** @type {boolean} 是否正在运行 */
        this.running = false;
        
        /** @type {Function|null} 关闭窗口的回调 */
        this.closeWindowCallback = null;
    }

    /**
     * 启动监控
     * @param {Function} [closeWindowCallback] - 关闭窗口的回调函数
     */
    start(closeWindowCallback) {
        if (this.running) return;
        
        this.closeWindowCallback = closeWindowCallback;
        this.running = true;
        
        // 定期检查
        this.timerId = setInterval(() => {
            this.check();
        }, this.checkInterval);
        
        console.log('🔍 内存监控已启动');
    }

    /**
     * 停止监控
     */
    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.running = false;
        console.log('🔍 内存监控已停止');
    }

    /**
     * 检查内存压力
     */
    async check() {
        const memoryInfo = this.getMemoryInfo();
        
        if (!memoryInfo) {
            return; // 浏览器不支持内存 API
        }

        const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
        const limitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);
        const usagePercent = (usedMB / limitMB) * 100;

        // 如果使用超过 80% 或超过阈值
        if (usagePercent > 80 || usedMB > this.pressureThreshold) {
            console.warn(`⚠️ 内存压力: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);
            await this.releaseMemory();
        }
    }

    /**
     * 获取内存信息
     * @returns {Object|null} 内存信息
     */
    getMemoryInfo() {
        // Chrome/Edge 支持 performance.memory
        if (performance && performance.memory) {
            return performance.memory;
        }
        return null;
    }

    /**
     * 释放内存（关闭最久未使用的窗口）
     */
    async releaseMemory() {
        // 获取最久未使用的窗口
        const lruWindows = resourceManager.getLeastRecentlyUsed(1);
        
        if (lruWindows.length === 0) {
            console.log('📭 没有可关闭的后台窗口');
            return;
        }

        const windowId = lruWindows[0];
        console.log(`🧹 内存压力：关闭最久未使用的窗口: ${windowId}`);

        // 通知系统关闭窗口
        if (this.closeWindowCallback) {
            await this.closeWindowCallback(windowId);
        } else {
            // 默认：通过事件总线通知
            bus.emit('system:close_window', { windowId, reason: 'memory_pressure' });
        }

        // 清理资源
        await resourceManager.cleanup(windowId);
    }

    /**
     * 手动触发内存释放
     * @param {number} [count=1] - 要关闭的窗口数量
     */
    async forceRelease(count = 1) {
        const lruWindows = resourceManager.getLeastRecentlyUsed(count);
        
        for (const windowId of lruWindows) {
            console.log(`🧹 强制释放: ${windowId}`);
            
            if (this.closeWindowCallback) {
                await this.closeWindowCallback(windowId);
            } else {
                bus.emit('system:close_window', { windowId, reason: 'force_release' });
            }
            
            await resourceManager.cleanup(windowId);
        }
    }

    /**
     * 获取当前内存状态
     * @returns {Object} 内存状态
     */
    getStatus() {
        const memoryInfo = this.getMemoryInfo();
        
        if (!memoryInfo) {
            return {
                supported: false,
                message: '浏览器不支持内存 API'
            };
        }

        const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
        const totalMB = memoryInfo.totalJSHeapSize / (1024 * 1024);
        const limitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);

        return {
            supported: true,
            usedMB: usedMB.toFixed(1),
            totalMB: totalMB.toFixed(1),
            limitMB: limitMB.toFixed(1),
            usagePercent: ((usedMB / limitMB) * 100).toFixed(1),
            windowCount: resourceManager.registries.size
        };
    }

    /**
     * 设置配置
     * @param {Object} config - 配置对象
     */
    configure(config) {
        if (config.checkInterval) {
            this.checkInterval = config.checkInterval;
        }
        if (config.pressureThreshold) {
            this.pressureThreshold = config.pressureThreshold;
        }
        
        // 如果正在运行，重启以应用新配置
        if (this.running) {
            this.stop();
            this.start(this.closeWindowCallback);
        }
    }
}

// 导出单例
export const memoryMonitor = new MemoryPressureMonitor();

// 默认导出类（用于测试）
export default MemoryPressureMonitor;
