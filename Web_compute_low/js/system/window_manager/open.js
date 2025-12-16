/**
 * @fileoverview Open - 打开窗口原子
 * @description 处理应用打开逻辑，包括懒加载和 CSS 动态注入
 * @module system/window_manager/open
 */

import { store } from '../store.js';
import { bus } from '../event_bus.js';
import { cssInjector } from '../css_injector.js';
import { createWindow } from './create.js';
import { bringToFront } from './focus.js';

/**
 * 为应用注入 CSS（如果存在）
 * @param {string} id - 应用 ID
 * @param {string} modulePath - 模块路径
 * 
 * 🧱 踩坑记录:
 *    1. [2025-12-17] [已修复] 增强路径匹配正则，支持更多路径格式
 */
async function injectAppCSS(id, modulePath) {
    // 从模块路径推断 CSS 路径
    // 支持的格式:
    //   ../../apps/browser/index.js -> js/apps/browser/browser.css
    //   ../apps/browser/index.js -> js/apps/browser/browser.css
    //   ../../apps/browser.js -> js/apps/browser/browser.css (单文件应用)
    
    // 尝试匹配目录结构: apps/appName/
    let match = modulePath.match(/(?:\.\.\/)+([^/]+)\/([^/]+)\//);
    
    // 如果没匹配到，尝试匹配单文件结构: apps/appName.js
    if (!match) {
        const singleFileMatch = modulePath.match(/(?:\.\.\/)+([^/]+)\/([^/]+)\.js$/);
        if (singleFileMatch) {
            const [, category, appName] = singleFileMatch;
            if (category === 'apps') {
                // 单文件应用的 CSS 路径: js/apps/appName/appName.css
                const cssPath = `js/${category}/${appName}/${appName}.css`;
                const moduleId = `${category}/${appName}`;
                try {
                    await cssInjector.inject(moduleId, cssPath);
                } catch (e) {
                    console.debug(`[CSS] ${id} 无独立样式文件`);
                }
            }
            return;
        }
    }
    
    if (match) {
        const [, category, appName] = match;
        // 只为 apps/ 目录注入 CSS，apps_system/ 已在 styles.css 预加载
        if (category === 'apps') {
            const cssPath = `js/${category}/${appName}/${appName}.css`;
            const moduleId = `${category}/${appName}`;
            
            try {
                await cssInjector.inject(moduleId, cssPath);
            } catch (e) {
                // CSS 不存在是正常的，不是所有应用都有 CSS
                console.debug(`[CSS] ${id} 无独立样式文件`);
            }
        }
    }
}

/**
 * 打开应用
 * @param {string} id - 应用 ID
 * @param {boolean} speak - 是否播放语音
 */
export function openApp(id, speak = true) {
    console.log(`[openApp] ========== 尝试打开: ${id} ==========`);
    let win = document.getElementById(id);
    console.log(`[openApp] 窗口DOM存在: ${!!win}`);
    
    if (!win) {
        let appInfo = store.getApp(id);
        console.log(`[openApp] appInfo 完整对象:`, appInfo);
        console.log(`[openApp] appInfo:`, appInfo ? { 
            id: appInfo.id, 
            hasContent: !!appInfo.content, 
            contentLength: appInfo.content?.length || 0,
            type: appInfo.type,
            frameless: appInfo.frameless
        } : 'null');
        
        // 懒加载检查
        if (!appInfo) {
            const lazyPath = store.getLazyAppPath(id);
            if (lazyPath) {
                console.log(`[WindowManager] 触发懒加载: ${id} -> ${lazyPath}`);
                bus.emit('system:speak', "正在安装应用...");
                
                import(lazyPath).then(async m => {
                    const config = m.config || (m.default && m.default.config);
                    if (config) {
                        // 注入应用 CSS（如果存在）
                        await injectAppCSS(id, lazyPath);
                        
                        store.setAppMetadata(config.id, config);
                        if (typeof m.init === 'function') {
                            try { m.init(); } catch (e) { console.error(e); }
                        }
                        if (config.id !== id) {
                            openApp(config.id, speak);
                            return;
                        }
                        openApp(id, speak);
                    } else {
                        console.error(`[WindowManager] 模块 ${id} 缺少 config 导出`);
                        bus.emit('system:speak', "应用文件损坏");
                    }
                }).catch(err => {
                    console.error(`无法懒加载应用 ${id}:`, err);
                    bus.emit('system:speak', "应用安装失败");
                });
                return;
            }
        }

        if (appInfo) {
            // 服务类型不需要窗口
            if (appInfo.type === 'service') {
                store.updateApp(id, { isOpen: true });
                bus.emit('app:opened', { id });
                return;
            }

            // 🧱 [2025-12-17] 修复: 只有当没有 content 且有懒加载路径时才触发懒加载
            // 对于胶囊详情窗口等已经有 content 的应用，直接创建窗口
            if (!appInfo.content) {
                console.log(`[openApp] 应用 ${id} 没有 content`);
                const lazyPath = store.getLazyAppPath(id);
                console.log(`[openApp] 懒加载路径: ${lazyPath || '无'}`);
                if (lazyPath) {
                    console.log(`[openApp] 触发懒加载: ${id}`);
                    import(lazyPath).then(async m => {
                        const config = m.config || (m.default && m.default.config);
                        if (config) {
                            // 注入应用 CSS（如果存在）
                            await injectAppCSS(id, lazyPath);
                            
                            store.setAppMetadata(config.id, config);
                            if (typeof m.init === 'function') {
                                try { m.init(); } catch (e) { console.error(e); }
                            }
                            openApp(id, speak);
                        }
                    }).catch(err => console.error(`加载应用 ${id} 失败:`, err));
                    return;
                } else {
                    console.warn(`[openApp] 应用 ${id} 没有 content 也没有懒加载路径，尝试直接创建窗口`);
                }
            } else {
                console.log(`[openApp] 应用 ${id} 有 content，长度: ${appInfo.content.length}`);
            }

            console.log(`[openApp] 创建窗口: ${id}`);
            const createdWin = createWindow(id, appInfo);
            console.log(`[openApp] createWindow 返回: ${createdWin ? 'DOM元素' : 'null'}`);
            win = document.getElementById(id);
            console.log(`[openApp] 窗口DOM查找结果: ${!!win}`);
        } else {
            console.error(`无法打开应用 ${id}: 配置不存在`);
            return;
        }
    }

    if (!win) return;

    win.classList.remove('minimized');
    win.classList.add('open');
    bringToFront(id);
    store.updateApp(id, { isOpen: true });
    bus.emit('app:opened', { id });
}
