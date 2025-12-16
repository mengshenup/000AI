/**
 * @fileoverview CSSInjector - 动态 CSS 注入器
 * @description 动态加载和注入模块 CSS，防止重复加载
 * @module system/css_injector
 * 
 * 🎨 代码用途：
 *    管理模块 CSS 的动态加载，确保每个模块的样式只加载一次。
 *    支持按需加载和卸载，减少首屏加载时间。
 * 
 * 💡 易懂解释：
 *    这是一个"化妆师"。每个模块需要化妆（样式）时，
 *    化妆师会检查是不是已经化过了，避免重复化妆。💄
 */

/**
 * CSS 注入器
 */
class CSSInjector {
    constructor() {
        /** @type {Set<string>} 已加载的模块 ID */
        this.loaded = new Set();
        
        /** @type {Map<string, HTMLLinkElement>} 模块 ID -> link 元素映射 */
        this.elements = new Map();
        
        /** @type {Map<string, Promise<void>>} 正在加载的 CSS */
        this.loading = new Map();
    }

    /**
     * 注入 CSS
     * @param {string} moduleId - 模块 ID
     * @param {string} [cssPath] - CSS 文件路径（可选，默认根据 moduleId 推断）
     * @returns {Promise<void>}
     */
    async inject(moduleId, cssPath) {
        // 已加载，跳过
        if (this.loaded.has(moduleId)) {
            return;
        }

        // 正在加载，等待
        if (this.loading.has(moduleId)) {
            return this.loading.get(moduleId);
        }

        // 推断路径
        const path = cssPath || this.resolveCSSPath(moduleId);
        
        // 创建加载 Promise
        const loadPromise = this.loadCSS(moduleId, path);
        this.loading.set(moduleId, loadPromise);

        try {
            await loadPromise;
            this.loaded.add(moduleId);
        } finally {
            this.loading.delete(moduleId);
        }
    }

    /**
     * 加载 CSS 文件
     * @param {string} moduleId - 模块 ID
     * @param {string} cssPath - CSS 文件路径
     * @returns {Promise<void>}
     */
    loadCSS(moduleId, cssPath) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssPath;
            link.dataset.module = moduleId; // 标记所属模块
            
            link.onload = () => {
                console.log(`🎨 CSS 已加载: ${moduleId}`);
                resolve();
            };
            
            link.onerror = () => {
                console.warn(`⚠️ CSS 加载失败: ${cssPath}`);
                // CSS 加载失败不阻塞，只是警告
                resolve();
            };

            document.head.appendChild(link);
            this.elements.set(moduleId, link);
        });
    }

    /**
     * 注入内联 CSS
     * @param {string} moduleId - 模块 ID
     * @param {string} cssText - CSS 文本内容
     */
    injectInline(moduleId, cssText) {
        // 已加载，跳过
        if (this.loaded.has(moduleId)) {
            return;
        }

        const style = document.createElement('style');
        style.textContent = cssText;
        style.dataset.module = moduleId;
        
        document.head.appendChild(style);
        this.elements.set(moduleId, style);
        this.loaded.add(moduleId);
        
        console.log(`🎨 内联 CSS 已注入: ${moduleId}`);
    }

    /**
     * 移除 CSS
     * @param {string} moduleId - 模块 ID
     */
    remove(moduleId) {
        const element = this.elements.get(moduleId);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
            this.elements.delete(moduleId);
            this.loaded.delete(moduleId);
            console.log(`🗑️ CSS 已移除: ${moduleId}`);
        }
    }

    /**
     * 检查是否已加载
     * @param {string} moduleId - 模块 ID
     * @returns {boolean}
     */
    isLoaded(moduleId) {
        return this.loaded.has(moduleId);
    }

    /**
     * 解析 CSS 路径
     * @param {string} moduleId - 模块 ID (如 "system/store", "apps/browser")
     * @returns {string} CSS 文件路径
     */
    resolveCSSPath(moduleId) {
        // 提取模块名（最后一部分）
        const parts = moduleId.split('/');
        const moduleName = parts[parts.length - 1];
        
        // 拼接路径: js/{moduleId}/{moduleName}.css
        return `./js/${moduleId}/${moduleName}.css`;
    }

    /**
     * 批量注入 CSS
     * @param {string[]} moduleIds - 模块 ID 列表
     * @returns {Promise<void>}
     */
    async injectBatch(moduleIds) {
        await Promise.all(moduleIds.map(id => this.inject(id)));
    }

    /**
     * 获取已加载的模块数量
     * @returns {number}
     */
    getLoadedCount() {
        return this.loaded.size;
    }

    /**
     * 获取所有已加载的模块 ID
     * @returns {string[]}
     */
    getLoadedModules() {
        return Array.from(this.loaded);
    }

    /**
     * 清空所有 CSS
     */
    clear() {
        this.elements.forEach((element, moduleId) => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        this.elements.clear();
        this.loaded.clear();
        console.log('🧹 所有 CSS 已清空');
    }
}

// 导出单例
export const cssInjector = new CSSInjector();

// 默认导出类（用于测试）
export default CSSInjector;
