/**
 * @fileoverview TemplateLoader - HTML 模板加载器
 * @description 动态加载 HTML 模板，支持缓存和回退
 * @module system/template_loader
 * 
 * 🎨 代码用途：
 *    从模块文件夹加载 template.html，支持内存缓存。
 *    如果模板不存在，回退到 JS 内联的 content 字段。
 * 
 * 💡 易懂解释：
 *    这是一个"模板快递员"。需要 HTML 时，先看看仓库有没有，
 *    没有就去取货（网络请求），取到后存到仓库下次用。📦
 */

/**
 * HTML 模板加载器
 */
class TemplateLoader {
    constructor() {
        /** @type {Map<string, string>} 模板缓存 (moduleId -> HTML) */
        this.cache = new Map();
        
        /** @type {Map<string, Promise<string|null>>} 正在加载的模板 */
        this.loading = new Map();
        
        /** @type {Set<string>} 已知不存在的模板（避免重复请求） */
        this.notFound = new Set();
    }

    /**
     * 加载模板
     * @param {string} moduleId - 模块 ID (如 "apps/browser", "apps_system/desktop")
     * @returns {Promise<string|null>} HTML 内容，不存在返回 null
     */
    async load(moduleId) {
        // 1. 检查缓存
        if (this.cache.has(moduleId)) {
            return this.cache.get(moduleId);
        }

        // 2. 检查是否已知不存在
        if (this.notFound.has(moduleId)) {
            return null;
        }

        // 3. 检查是否正在加载
        if (this.loading.has(moduleId)) {
            return this.loading.get(moduleId);
        }

        // 4. 发起加载
        const loadPromise = this.fetchTemplate(moduleId);
        this.loading.set(moduleId, loadPromise);

        try {
            const html = await loadPromise;
            if (html !== null) {
                this.cache.set(moduleId, html);
            } else {
                this.notFound.add(moduleId);
            }
            return html;
        } finally {
            this.loading.delete(moduleId);
        }
    }

    /**
     * 从网络获取模板
     * @param {string} moduleId - 模块 ID
     * @returns {Promise<string|null>}
     */
    async fetchTemplate(moduleId) {
        const path = this.resolveTemplatePath(moduleId);
        
        try {
            const response = await fetch(path);
            if (response.ok) {
                const html = await response.text();
                console.log(`📄 模板已加载: ${moduleId}`);
                return html;
            } else {
                console.log(`📄 模板不存在: ${moduleId} (使用回退)`);
                return null;
            }
        } catch (e) {
            console.warn(`⚠️ 模板加载失败: ${moduleId}`, e);
            return null;
        }
    }

    /**
     * 解析模板路径
     * @param {string} moduleId - 模块 ID
     * @returns {string} 模板文件路径
     */
    resolveTemplatePath(moduleId) {
        return `./js/${moduleId}/template.html`;
    }

    /**
     * 预加载模板
     * @param {string[]} moduleIds - 模块 ID 列表
     */
    async preload(moduleIds) {
        await Promise.all(moduleIds.map(id => this.load(id)));
    }

    /**
     * 设置缓存（用于内联模板）
     * @param {string} moduleId - 模块 ID
     * @param {string} html - HTML 内容
     */
    set(moduleId, html) {
        this.cache.set(moduleId, html);
        this.notFound.delete(moduleId);
    }

    /**
     * 清除缓存
     * @param {string} [moduleId] - 模块 ID，不传则清除全部
     */
    clear(moduleId) {
        if (moduleId) {
            this.cache.delete(moduleId);
            this.notFound.delete(moduleId);
        } else {
            this.cache.clear();
            this.notFound.clear();
        }
    }

    /**
     * 检查是否已缓存
     * @param {string} moduleId - 模块 ID
     * @returns {boolean}
     */
    has(moduleId) {
        return this.cache.has(moduleId);
    }

    /**
     * 获取缓存统计
     * @returns {Object}
     */
    getStats() {
        return {
            cached: this.cache.size,
            notFound: this.notFound.size,
            loading: this.loading.size
        };
    }
}

// 导出单例
export const templateLoader = new TemplateLoader();

// 默认导出类（用于测试）
export default TemplateLoader;
