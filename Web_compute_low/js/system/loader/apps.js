/**
 * @fileoverview 应用加载原子
 * @description 处理应用的动态加载和版本检查
 * @module system/loader/apps
 */

import { store } from '../store.js';
import { WEB_API_URL, DEFAULT_APPS } from '../config.js';

/**
 * 检查应用是否需要更新
 * @param {Object} serverApp - 服务器返回的应用信息
 * @param {Object} cachedApp - 本地缓存的应用信息
 * @returns {boolean} 是否需要更新
 */
export function checkUpdate(serverApp, cachedApp) {
    if (!cachedApp) return true;
    
    // 优先对比代码行数
    if (serverApp.line_count !== undefined && cachedApp.line_count !== undefined) {
        if (serverApp.line_count !== cachedApp.line_count) {
            console.warn(`[Security] 文件行数变更: ${serverApp.filename || serverApp.id}`);
            return true;
        }
    }
    
    // 检查版本号
    if (serverApp.version !== cachedApp.version) {
        return true;
    }
    
    return false;
}

/**
 * 动态加载应用模块
 * @param {string} path - 模块路径
 * @param {boolean} isSystem - 是否为系统应用
 * @returns {Promise<Object|null>} 加载的模块信息
 */
export async function loadApp(path, isSystem) {
    try {
        console.log(`⏳ 正在加载应用: ${path}`);
        const url = `${path}?v=${Date.now()}`;
        const m = await import(url);
        
        if (m.config) {
            console.log(`✅ 应用加载成功: ${m.config.id}`);
            return { id: m.config.id, config: m.config, isSystem, init: m.init };
        } else {
            console.warn(`⚠️ 应用 ${path} 缺少 config 导出`);
        }
    } catch (e) {
        console.error(`❌ 无法加载应用 ${path}:`, e);
    }
    return null;
}
