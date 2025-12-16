/**
 * @fileoverview Cache - 缓存管理原子
 * @description 管理应用状态的内存缓存
 * @module system/store/cache
 * 
 * 🎨 代码用途：
 *    管理应用状态的内存缓存，提供快速的读写操作。
 * 
 * 💡 易懂解释：
 *    这是一个"快速记事本"，记录每个应用的状态。📝
 */

/**
 * 应用缓存管理器
 */
class AppCache {
    constructor() {
        /** @type {Object} 应用状态缓存 */
        this.apps = {};
        
        /** @type {Object} 懒加载注册表 */
        this.lazyRegistry = {};
        
        /** @type {Object} 已安装应用缓存 */
        this.installedApps = {};
    }

    /**
     * 获取应用信息
     * @param {string} id - 应用 ID
     * @returns {Object|undefined}
     */
    getApp(id) {
        return this.apps[id];
    }

    /**
     * 更新应用信息
     * @param {string} id - 应用 ID
     * @param {Object} data - 新数据
     * 
     * 🧱 [2025-12-17] 修复: 添加调试日志
     */
    updateApp(id, data) {
        console.log(`[Cache] updateApp: ${id}, data:`, JSON.stringify(data));
        
        if (!this.apps[id]) {
            const installed = this.installedApps[id];
            if (installed) {
                this.apps[id] = { ...installed, ...data };
            } else {
                this.apps[id] = { ...data };
            }
        } else {
            this.apps[id] = { ...this.apps[id], ...data };
        }
        
        console.log(`[Cache] updateApp 完成: ${id}, winPos:`, this.apps[id].winPos, 'pos:', this.apps[id].pos);
    }

    /**
     * 设置应用元数据
     * @param {string} id - 应用 ID
     * @param {Object} metadata - 元数据
     * 
     * 🧱 [2025-12-17] 修复: 保留用户自定义的运行时状态（winPos, pos, isOpen, customName 等）
     * 🧱 [2025-12-17] 修复: 只保留有效值（非 undefined），避免覆盖 IndexedDB 加载的数据
     */
    setAppMetadata(id, metadata) {
        console.log(`[Cache] setAppMetadata: ${id}, hasContent: ${!!metadata.content}`);
        
        if (this.apps[id]) {
            // 🧱 [2025-12-17] 修复: 保留所有用户自定义的运行时状态
            // 只保留有效值（非 undefined），避免用 undefined 覆盖有效数据
            const existing = this.apps[id];
            const preserved = {};
            
            // 只有当值存在时才保留
            if (existing.isOpen !== undefined) preserved.isOpen = existing.isOpen;
            if (existing.winPos !== undefined) preserved.winPos = existing.winPos;
            if (existing.pos !== undefined) preserved.pos = existing.pos;
            if (existing.customName !== undefined) preserved.customName = existing.customName;
            if (existing.capsuleOffsetX !== undefined) preserved.capsuleOffsetX = existing.capsuleOffsetX;
            if (existing.zIndex !== undefined) preserved.zIndex = existing.zIndex;
            if (existing.content !== undefined) preserved.content = existing.content;
            if (existing.contentStyle !== undefined) preserved.contentStyle = existing.contentStyle;
            
            // 用新的 metadata 替换，但保留运行时状态
            this.apps[id] = { 
                ...metadata,
                ...preserved  // 运行时状态优先
            };
            
            // 如果有自定义名称，使用自定义名称
            if (this.apps[id].customName) {
                this.apps[id].name = this.apps[id].customName;
            }
            
            console.log(`[Cache] setAppMetadata 保留: winPos=${JSON.stringify(preserved.winPos)}, pos=${JSON.stringify(preserved.pos)}`);
        } else {
            this.apps[id] = { ...metadata, isOpen: false };
        }
        
        console.log(`[Cache] setAppMetadata 完成: ${id}, content长度: ${this.apps[id].content?.length || 0}`);
    }

    /**
     * 注册懒加载应用
     * @param {string} id - 应用 ID
     * @param {string} path - 脚本路径
     * @param {Object} metadata - 元数据
     */
    registerLazyApp(id, path, metadata = {}) {
        this.lazyRegistry[id] = path;
        if (metadata.name) {
            this.installedApps[id] = { ...metadata, path };
        }
    }

    /**
     * 获取懒加载路径
     * @param {string} id - 应用 ID
     * @returns {string|undefined}
     */
    getLazyAppPath(id) {
        return this.lazyRegistry[id];
    }

    /**
     * 清理僵尸数据
     * @param {string[]} validIds - 有效 ID 列表
     * @returns {boolean} 是否有变更
     * 
     * 🧱 [2025-12-17] 修复: 同时清理 apps 和 installedApps 中的僵尸数据
     */
    prune(validIds) {
        const validSet = new Set(validIds);
        let changed = false;
        
        console.log(`[Cache] prune 开始，validIds:`, Array.from(validSet).slice(0, 10), '...');
        console.log(`[Cache] 当前 apps:`, Object.keys(this.apps));
        
        // 清理 apps 中的僵尸数据
        Object.keys(this.apps).forEach(id => {
            if (!validSet.has(id)) {
                console.log(`[Cache] 清理僵尸应用数据: ${id}`);
                delete this.apps[id];
                changed = true;
            }
        });
        
        // 清理 installedApps 中的僵尸数据
        Object.keys(this.installedApps).forEach(id => {
            if (!validSet.has(id)) {
                console.log(`[Cache] 清理僵尸安装记录: ${id}`);
                delete this.installedApps[id];
                changed = true;
            }
        });

        return changed;
    }

    /**
     * 重置所有缓存
     * 🧱 [2025-12-17] 修复: 同时重置 lazyRegistry
     */
    reset() {
        this.apps = {};
        this.installedApps = {};
        this.lazyRegistry = {};
    }

    /**
     * 加载数据
     * @param {Object} data - 数据对象
     */
    load(data) {
        if (data.apps) this.apps = data.apps;
        if (data.installedApps) this.installedApps = data.installedApps;
    }

    /**
     * 导出数据
     * @returns {Object}
     * 
     * 🧱 [2025-12-17] 修复: 不再排除 content 和 contentStyle，确保胶囊详情窗口内容被持久化
     */
    export() {
        return {
            apps: this.apps,
            installedApps: this.installedApps
        };
    }
}

// 导出单例
export const appCache = new AppCache();

// 导出类（用于测试）
export default AppCache;
