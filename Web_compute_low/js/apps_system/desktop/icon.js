/**
 * @fileoverview 图标创建原子
 * @description 处理桌面图标 DOM 的创建
 * @module apps_system/desktop/icon
 */

import { DEFAULT_APPS } from '../../system/config.js';

// 默认图标路径
const DEFAULT_ICON = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';

/**
 * 获取有效的图标路径
 * @param {string} id - 应用ID
 * @param {Object} app - 应用配置
 * @returns {Object} {pathData, iconColor}
 */
export function getIconData(id, app) {
    const defaultApp = DEFAULT_APPS[id];
    let pathData = app.icon || app.iconPath || (defaultApp && defaultApp.icon) || DEFAULT_ICON;
    let iconColor = app.color || (defaultApp && defaultApp.color) || '#ccc';

    // 验证 pathData 是否是有效的 SVG path
    if (!pathData || typeof pathData !== 'string' || !pathData.trim().startsWith('M')) {
        if (defaultApp && defaultApp.icon && defaultApp.icon.trim().startsWith('M')) {
            pathData = defaultApp.icon;
        } else {
            console.warn(`[Desktop] 应用 ${id} 的图标路径无效，使用默认图标`);
            pathData = DEFAULT_ICON;
        }
    }

    return { pathData, iconColor };
}

/**
 * 创建图标元素
 * @param {string} id - 应用ID
 * @param {Object} app - 应用配置
 * @param {Object} pos - 位置 {x, y}
 * @returns {HTMLElement} 图标元素
 */
export function createIconElement(id, app, pos) {
    const { pathData, iconColor } = getIconData(id, app);
    const defaultApp = DEFAULT_APPS[id];

    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.id = `icon-${id}`;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.dataset.id = id;
    el.dataset.type = 'icon';

    el.innerHTML = `
        <svg class="icon-svg" viewBox="0 0 24 24" fill="${iconColor}">
            <path d="${pathData}"/>
        </svg>
        <div class="icon-text">${app.name || (defaultApp && defaultApp.name) || id}</div>
    `;

    return el;
}
