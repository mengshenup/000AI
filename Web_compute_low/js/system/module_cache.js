/**
 * @fileoverview ModuleCache - 三级缓存管理器
 * @description 实现 L1 内存 > L2 IndexedDB > L3 网络 的三级缓存架构
 * @module system/module_cache
 * @requires system/event_bus
 * 
 * 🎨 代码用途：
 *    管理模块的加载和缓存，优先使用内存缓存，其次 IndexedDB，最后网络请求。
 *    实现 Stale-While-Revalidate 策略，提升加载速度。
 * 
 * 💡 易懂解释：
 *    这是一个"三层保险柜"：
 *    - L1 内存：最快，但刷新就没了
 *    - L2 IndexedDB：稍慢，但永久保存
 *    - L3 网络：最慢，但总能拿到最新的
 */

import { bus } from './event_bus.js';

// =================================
//  🎉 IndexedDB 工具类 (模块缓存专用)
// =================================
const ModuleIDB = {
    DB_NAME: 'AngelModuleCache',
    STORE_NAME: 'modules',
    DB_VERSION: 1,
    db: null,

    async init() {
        if (this.db) return this.db;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => {
                console.error('❌ ModuleCache IndexedDB 打开失败:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    },

    async get(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORE_NAME, 'readonly');
            const store = tx.objectStore(this.STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    async set(id, data, metadata = {}) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);
            const request = store.put({
                id,
                data,
                timestamp: Date.now(),
                ...metadata
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async delete(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clear() {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

/**
 * 三级缓存管理器
 */
class ModuleCache {
    constructor() {
        /** @type {Map<string, any>} L1 内存缓存 */
        this.memory = new Map();
        
        /** @type {Set<string>} 已加载的 CSS 模块 */
        this.loadedCSS = new Set();
        
        /** @type {number} 缓存过期时间 (毫秒)，默认 24 小时 */
        this.maxAge = 24 * 60 * 60 * 1000;
        
        /** @type {boolean} 是否已初始化 */
        this.initialized = false;
    }

    /**
     * 初始化缓存管理器
     */
    async init() {
        if (this.initialized) return;
        await ModuleIDB.init();
        this.initialized = true;
        console.log('✅ ModuleCache 已初始化');
    }

    /**
     * 获取模块（三级缓存查找）
     * @param {string} moduleId - 模块 ID
     * @returns {Promise<any>} 模块数据
     */
    async get(moduleId) {
        // L1: 内存缓存命中 (~0.001ms)
        if (this.memory.has(moduleId)) {
            console.log(`📦 [L1] 内存命中: ${moduleId}`);
            return this.memory.get(moduleId);
        }

        // L2: IndexedDB 缓存命中 (~1-10ms)
        try {
            const cached = await ModuleIDB.get(moduleId);
            if (cached && cached.data) {
                // 检查是否过期
                const isExpired = Date.now() - cached.timestamp > this.maxAge;
                
                // 提升到 L1
                this.memory.set(moduleId, cached.data);
                console.log(`📦 [L2] IndexedDB 命中: ${moduleId}${isExpired ? ' (已过期，后台更新)' : ''}`);
                
                // 如果过期，后台静默更新
                if (isExpired) {
                    this.refreshInBackground(moduleId);
                }
                
                return cached.data;
            }
        } catch (e) {
            console.warn(`⚠️ IndexedDB 读取失败: ${moduleId}`, e);
        }

        // L3: 网络请求 (~100-1000ms)
        return await this.fetchAndCache(moduleId);
    }

    /**
     * 从网络获取并缓存
     * @param {string} moduleId - 模块 ID
     * @returns {Promise<any>} 模块数据
     */
    async fetchAndCache(moduleId) {
        console.log(`🌐 [L3] 网络请求: ${moduleId}`);
        
        try {
            // 动态导入模块
            const modulePath = this.resolveModulePath(moduleId);
            const module = await import(modulePath);
            
            // 存入 L1 和 L2
            this.memory.set(moduleId, module);
            await ModuleIDB.set(moduleId, module);
            
            return module;
        } catch (error) {
            console.error(`❌ 模块加载失败: ${moduleId}`, error);
            
            // 尝试使用过期缓存
            const stale = await this.getStale(moduleId);
            if (stale) {
                console.warn(`⚠️ 使用过期缓存: ${moduleId}`);
                return stale;
            }
            
            // 通知错误
            bus.emit('system:error', {
                type: 'module_load_failed',
                moduleId,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * 获取过期缓存（降级策略）
     * @param {string} moduleId - 模块 ID
     * @returns {Promise<any|null>} 过期的缓存数据
     */
    async getStale(moduleId) {
        try {
            const cached = await ModuleIDB.get(moduleId);
            return cached ? cached.data : null;
        } catch {
            return null;
        }
    }

    /**
     * 后台静默刷新
     * @param {string} moduleId - 模块 ID
     */
    async refreshInBackground(moduleId) {
        try {
            const modulePath = this.resolveModulePath(moduleId);
            const module = await import(modulePath + '?t=' + Date.now()); // 强制刷新
            
            this.memory.set(moduleId, module);
            await ModuleIDB.set(moduleId, module);
            
            console.log(`🔄 [后台] 已更新: ${moduleId}`);
        } catch (e) {
            console.warn(`⚠️ [后台] 更新失败: ${moduleId}`, e);
        }
    }

    /**
     * 解析模块路径
     * @param {string} moduleId - 模块 ID (如 "system/store", "apps/browser")
     * @returns {string} 完整路径
     */
    resolveModulePath(moduleId) {
        // 如果已经是完整路径，直接返回
        if (moduleId.startsWith('./') || moduleId.startsWith('/')) {
            return moduleId;
        }
        // 否则拼接基础路径
        return `./js/${moduleId}/index.js`;
    }

    /**
     * 存入缓存
     * @param {string} moduleId - 模块 ID
     * @param {any} data - 模块数据
     */
    async set(moduleId, data) {
        this.memory.set(moduleId, data);
        await ModuleIDB.set(moduleId, data);
    }

    /**
     * 使缓存失效
     * @param {string} moduleId - 模块 ID
     */
    async invalidate(moduleId) {
        this.memory.delete(moduleId);
        await ModuleIDB.delete(moduleId);
        console.log(`🗑️ 缓存已失效: ${moduleId}`);
    }

    /**
     * 清空所有缓存
     */
    async clear() {
        this.memory.clear();
        await ModuleIDB.clear();
        console.log('🧹 所有缓存已清空');
    }

    /**
     * 预热常用模块
     * @param {string[]} moduleIds - 要预热的模块 ID 列表
     */
    async warmup(moduleIds) {
        console.log(`🔥 开始预热 ${moduleIds.length} 个模块...`);
        
        const results = await Promise.allSettled(
            moduleIds.map(id => this.get(id))
        );
        
        const success = results.filter(r => r.status === 'fulfilled').length;
        console.log(`🔥 预热完成: ${success}/${moduleIds.length} 成功`);
    }

    /**
     * 获取缓存统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            memorySize: this.memory.size,
            loadedCSS: this.loadedCSS.size
        };
    }
}

// 导出单例
export const moduleCache = new ModuleCache();

// 默认导出类（用于测试）
export default ModuleCache;
