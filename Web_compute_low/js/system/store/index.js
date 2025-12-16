/**
 * @fileoverview Store 分子入口
 * @description 组合所有 store 原子，提供统一的状态管理接口
 * @module system/store/index
 * 
 * 🎨 代码用途：
 *    这是 store 模块的分子入口，组合 idb、sync、cache 三个原子。
 * 
 * 💡 易懂解释：
 *    这是"记事本"的封面，打开它就能用里面所有的功能。📔
 */

import { initDB, getItem, setItem, deleteItem } from './idb.js';
import { syncFromClientDB, syncFromServer, syncToServer, resetData } from './sync.js';
import { appCache } from './cache.js';
import { bus } from '../event_bus.js';

export const VERSION = '1.0.0';

/**
 * Store 类 - 状态管理
 * 
 * 🧱 踩坑记录:
 *    1. [2025-12-17] [已修复] ready() 方法现在会自动触发初始化，避免时序问题
 */
class Store {
    constructor() {
        this.readyPromise = null;
        this._isInitialized = false;
        this._saveTimer = null;
        this._saveDelay = 500; // 🧱 [2025-12-17] 修复: 防抖保存，500ms 内的多次更新合并为一次
    }

    /** @returns {Object} 应用状态 */
    get apps() { return appCache.apps; }
    set apps(value) { appCache.apps = value; }

    /** @returns {Object} 懒加载注册表 */
    get lazyRegistry() { return appCache.lazyRegistry; }

    /** @returns {Object} 已安装应用 */
    get installedApps() { return appCache.installedApps; }
    set installedApps(value) { appCache.installedApps = value; }

    /**
     * 初始化并同步数据
     */
    async init() {
        if (this._isInitialized) return this.readyPromise;
        this._isInitialized = true;
        this.readyPromise = this.syncFromClientDB();
        return this.readyPromise;
    }

    /**
     * 等待初始化完成
     * 如果尚未初始化，会自动触发初始化
     */
    async ready() {
        if (!this.readyPromise) {
            // 自动触发初始化，避免时序问题
            await this.init();
        }
        await this.readyPromise;
    }

    /**
     * 从客户端数据库同步
     * 🧱 [2025-12-17] 修复: 添加调试日志
     */
    async syncFromClientDB() {
        const userId = localStorage.getItem('current_user_id') || 'default';
        console.log(`[Store] syncFromClientDB 开始, userId: ${userId}`);
        const data = await syncFromClientDB(userId);
        console.log(`[Store] syncFromClientDB 完成, apps数量: ${Object.keys(data.apps || {}).length}`);
        
        // 检查是否有 winPos 数据
        const appsWithWinPos = Object.entries(data.apps || {}).filter(([id, app]) => app.winPos);
        console.log(`[Store] 有 winPos 的应用: ${appsWithWinPos.map(([id]) => id).join(', ') || '无'}`);
        
        appCache.load(data);
    }

    /**
     * 注册懒加载应用
     */
    registerLazyApp(id, path, metadata = {}) {
        appCache.registerLazyApp(id, path, metadata);
    }

    /**
     * 获取懒加载路径
     */
    getLazyAppPath(id) {
        return appCache.getLazyAppPath(id);
    }

    /**
     * 获取应用信息
     */
    getApp(id) {
        return appCache.getApp(id);
    }

    /**
     * 更新应用信息
     */
    updateApp(id, data) {
        appCache.updateApp(id, data);
        this.save();
    }

    /**
     * 设置应用元数据
     */
    setAppMetadata(id, metadata) {
        appCache.setAppMetadata(id, metadata);
        this.save();
    }

    /**
     * 清理僵尸数据
     */
    prune(validIds) {
        const changed = appCache.prune(validIds);
        if (changed) this.save();
    }

    /**
     * 版本检查（暂时禁用）
     */
    checkVersion(metadataMap) {
        // 暂时禁用
    }

    /**
     * 保存数据（防抖）
     * 🧱 [2025-12-17] 修复: 使用防抖避免频繁保存，同时确保数据不丢失
     */
    save() {
        // 清除之前的定时器
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }
        
        // 延迟保存
        this._saveTimer = setTimeout(() => {
            this._doSave();
        }, this._saveDelay);
    }
    
    /**
     * 立即保存数据
     * 🧱 [2025-12-17] 修复: 添加详细日志追踪保存过程
     */
    async _doSave() {
        try {
            const userId = localStorage.getItem('current_user_id') || 'default';
            const data = appCache.export();
            
            // 检查有 winPos/pos 的应用
            const appsWithWinPos = Object.entries(data.apps || {})
                .filter(([id, app]) => app.winPos)
                .map(([id, app]) => `${id}:{x:${app.winPos.x},y:${app.winPos.y}}`);
            const appsWithPos = Object.entries(data.apps || {})
                .filter(([id, app]) => app.pos)
                .map(([id, app]) => `${id}:{x:${app.pos.x},y:${app.pos.y}}`);
            
            console.log(`[Store] 保存数据到 IndexedDB, userId: ${userId}`);
            console.log(`[Store] 有 winPos 的应用: ${appsWithWinPos.join(', ') || '无'}`);
            console.log(`[Store] 有 pos 的应用: ${appsWithPos.join(', ') || '无'}`);
            
            await syncToServer(userId, data);
            console.log('[Store] 保存完成');
        } catch (e) {
            console.error("无法保存布局:", e);
        }
    }
    
    /**
     * 强制立即保存（用于页面关闭前）
     */
    async saveNow() {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        await this._doSave();
    }

    /**
     * 重置所有状态
     */
    async reset() {
        console.log("正在重置所有应用状态...");
        appCache.reset();
        
        const userId = localStorage.getItem('current_user_id') || 'default';
        await resetData(userId);
    }
}

// 导出单例
export const store = new Store();

// 导出原子（用于细粒度导入）
export { initDB, getItem, setItem, deleteItem } from './idb.js';
export { syncFromClientDB, syncFromServer, syncToServer, resetData } from './sync.js';
export { appCache } from './cache.js';
