/**
 * @fileoverview 智能预取管理器
 * @description 基于用户行为预测，在空闲时预加载可能需要的模块
 * @module system/prefetch_manager
 */

import { bus } from './event_bus.js';

/**
 * 预取规则配置
 * 定义应用之间的关联关系，用于预测用户下一步操作
 */
const PREFETCH_RULES = {
    // 打开桌面后，预加载常用应用
    'sys-desktop': ['win-manual', 'win-personalization', 'win-taskmgr'],
    // 打开浏览器后，预加载情报站
    'win-angel': ['win-intelligence'],
    // 打开设置后，预加载性能调优
    'win-personalization': ['win-performance'],
    // 打开任务管理器后，预加载性能调优
    'win-taskmgr': ['win-performance']
};

/**
 * 预取管理器类
 */
class PrefetchManager {
    constructor() {
        this.prefetched = new Set(); // 已预取的模块
        this.pending = new Set(); // 正在预取的模块
        this.enabled = true;
        
        // 监听应用打开事件
        bus.on('app:opened', (data) => this.onAppOpened(data.id));
    }

    /**
     * 应用打开时触发预取
     */
    onAppOpened(appId) {
        if (!this.enabled) return;
        
        const relatedApps = PREFETCH_RULES[appId];
        if (!relatedApps) return;
        
        // 使用 requestIdleCallback 在空闲时预取
        this.schedulePreload(relatedApps);
    }

    /**
     * 调度预加载
     */
    schedulePreload(appIds) {
        const callback = (deadline) => {
            for (const appId of appIds) {
                // 如果时间不够了，下次再继续
                if (deadline.timeRemaining() < 10) {
                    this.schedulePreload(appIds.filter(id => !this.prefetched.has(id)));
                    return;
                }
                
                if (!this.prefetched.has(appId) && !this.pending.has(appId)) {
                    this.preloadApp(appId);
                }
            }
        };
        
        // 使用 requestIdleCallback，如果不支持则使用 setTimeout
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout: 2000 });
        } else {
            setTimeout(() => callback({ timeRemaining: () => 50 }), 100);
        }
    }

    /**
     * 预加载单个应用
     */
    async preloadApp(appId) {
        this.pending.add(appId);
        
        try {
            // 获取应用的懒加载路径
            const { store } = await import('./store.js');
            const path = store.getLazyAppPath(appId);
            
            if (path) {
                // 动态导入模块（浏览器会缓存）
                await import(path);
                this.prefetched.add(appId);
                console.log(`[Prefetch] 预加载完成: ${appId}`);
            }
        } catch (e) {
            console.warn(`[Prefetch] 预加载失败: ${appId}`, e);
        } finally {
            this.pending.delete(appId);
        }
    }

    /**
     * 手动预取指定模块
     */
    prefetch(appIds) {
        this.schedulePreload(Array.isArray(appIds) ? appIds : [appIds]);
    }

    /**
     * 启用/禁用预取
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 清除预取缓存记录
     */
    clear() {
        this.prefetched.clear();
        this.pending.clear();
    }
}

// 导出单例
export const prefetchManager = new PrefetchManager();

// requestIdleCallback polyfill for Safari
if (!('requestIdleCallback' in window)) {
    window.requestIdleCallback = (callback, options) => {
        const start = Date.now();
        return setTimeout(() => {
            callback({
                didTimeout: false,
                timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
            });
        }, options?.timeout || 1);
    };
    
    window.cancelIdleCallback = (id) => clearTimeout(id);
}
