/**
 * @fileoverview Personalization 分子入口
 * @description 组合所有个性化原子，提供统一接口
 * @module apps/personalization/index
 */

import { wm } from '../../system/window_manager.js';
import { bus } from '../../system/event_bus.js';
import { cssInjector } from '../../system/css_injector.js';
import { config, WALLPAPERS } from './config.js';

export const VERSION = '1.0.0';
export { config, WALLPAPERS };
export const APP_NAME = 'Workshop';

// 🧱 [2025-12-17] 修复: 确保 CSS 被加载
cssInjector.inject('apps/personalization', 'js/apps/personalization/personalization.css');

/**
 * 🧱 [2025-12-17] 修复: 彻底重写初始化逻辑
 * 问题: app:ready 事件可能在监听器注册之前就已经触发
 * 解决: 使用 MutationObserver 监听 DOM 变化，确保壁纸一定会被加载
 */
class SettingsApp {
    constructor() {
        console.log('[Personalization] SettingsApp 构造函数执行');
        
        // 🧱 [2025-12-17] 修复: 监听 app:ready 和 app:opened 两个事件
        bus.on(`app:ready:${config.id}`, () => {
            console.log('[Personalization] 收到 app:ready 事件');
            this.initWithRetry();
        });
        
        // 每次打开窗口都重新初始化
        bus.on('app:opened', (data) => {
            if (data.id === config.id) {
                console.log('[Personalization] 收到 app:opened 事件');
                this.initWithRetry();
            }
        });
    }

    /**
     * 🧱 [2025-12-17] 修复: 带重试的初始化，确保 DOM 就绪
     */
    initWithRetry(retries = 10) {
        const grid = document.getElementById('wp-grid');
        if (!grid) {
            if (retries > 0) {
                console.log(`[Personalization] #wp-grid 不存在，重试中... (${retries})`);
                setTimeout(() => this.initWithRetry(retries - 1), 50);
            } else {
                console.error('[Personalization] #wp-grid 始终不存在，放弃初始化');
            }
            return;
        }
        this.initWallpaperGrid();
        this.bindEvents();
    }

    initIfNeeded() {
        this.initWithRetry();
    }

    bindEvents() {
        document.getElementById('btn-custom-wp')?.addEventListener('click', () => {
            const url = document.getElementById('custom-wp')?.value;
            if (url) wm.changeWallpaper(url);
        });
    }

    initWallpaperGrid() {
        console.log('[Personalization] ========== initWallpaperGrid 开始 ==========');
        console.log('[Personalization] WALLPAPERS:', WALLPAPERS);
        console.log('[Personalization] WALLPAPERS.length:', WALLPAPERS?.length);
        
        const grid = document.getElementById('wp-grid');
        console.log('[Personalization] #wp-grid 元素:', grid);
        
        if (!grid) {
            console.error('[Personalization] #wp-grid 元素不存在！');
            return;
        }
        
        // 清空现有内容
        grid.innerHTML = '';
        console.log('[Personalization] 已清空 grid');

        if (!WALLPAPERS || WALLPAPERS.length === 0) {
            console.error('[Personalization] WALLPAPERS 数组为空！');
            return;
        }

        console.log('[Personalization] 开始添加壁纸...');
        WALLPAPERS.forEach((wp, i) => {
            console.log(`[Personalization] 添加壁纸 ${i}: ${wp.url}`);
            const el = document.createElement('div');
            el.className = 'wp-item';
            el.style.backgroundImage = `url('${wp.url}')`;
            el.style.minHeight = '60px';  // 确保有高度
            el.onclick = () => {
                console.log(`[Personalization] 点击壁纸: ${wp.url}`);
                wm.changeWallpaper(wp.url, el);
            };
            grid.appendChild(el);
        });
        
        console.log(`[Personalization] 壁纸加载完成，grid.children.length: ${grid.children.length}`);
        console.log('[Personalization] grid.innerHTML 长度:', grid.innerHTML.length);
    }
}

export const app = new SettingsApp();

// 🧱 [2025-12-17] 修复: 导出 init 函数，供 loader 调用
export function init() {
    console.log('[Personalization] init() 被调用');
    // 延迟初始化，确保 DOM 已经创建
    setTimeout(() => app.initIfNeeded(), 0);
}
