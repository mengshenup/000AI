/**
 * @fileoverview 托盘图标原子
 * @description 处理系统托盘图标的渲染
 * @module apps_system/taskbar/tray
 */

import { store } from '../../system/store.js';

// 隐藏的系统应用列表
const HIDDEN_SYSTEM_APPS = [
    'sys-desktop', 'sys-taskbar', 'sys-context-menu',
    'app-login', 'win-companion',
    'svc-traffic', 'svc-billing', 'svc-fps'
];

/**
 * 渲染托盘图标
 */
export function renderTrayIcons() {
    const container = document.getElementById('tray-icons');
    if (!container) return;
    container.innerHTML = '';

    const wm = window.wm;

    Object.entries(store.apps).forEach(([id, app]) => {
        if (app.showTrayIcon === false) return;
        if (app.isSystem !== true) return;
        if (HIDDEN_SYSTEM_APPS.includes(id)) return;

        const iconPath = app.icon || app.iconPath;
        if (!iconPath) return;

        const div = document.createElement('div');
        div.className = 'tray-icon';
        div.dataset.id = id;
        div.title = app.name;
        div.style.cssText = `
            cursor: pointer;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        div.innerHTML = `<svg style="width:16px; height:16px; fill:${app.color || '#ccc'}" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>`;

        div.onclick = () => {
            if (wm) wm.toggleApp(id);
        };

        container.appendChild(div);
    });
}
