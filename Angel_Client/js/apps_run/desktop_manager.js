import { store } from './store.js';
import { contextMenuApp } from '../apps_system/context_menu.js';

export class DesktopManager {
    constructor(wm) {
        this.wm = wm;
    }

    render() {
        const dt = document.getElementById('desktop');
        if (!dt) return;
        // 🧹 清除旧的图标元素
        dt.querySelectorAll('.desktop-icon').forEach(e => e.remove());

        Object.entries(store.apps).forEach(([id, app]) => {
            const pathData = app.icon || app.iconPath;
            if (!pathData) return;
            
            // 💖 过滤掉系统应用
            if (app.isSystem) return;

            // 💖 过滤掉显式配置不显示的应用
            if (app.showDesktopIcon === false) return;

            const el = document.createElement('div');
            el.className = 'desktop-icon';
            el.id = `icon-${id}`;
            el.style.left = `${app.pos.x}px`;
            el.style.top = `${app.pos.y}px`;
            el.dataset.id = id;
            el.dataset.type = 'icon';

            el.innerHTML = `
                <svg class="icon-svg" viewBox="0 0 24 24" fill="${app.color}">
                    <path d="${pathData}"/>
                </svg>
                <div class="icon-text">${app.name}</div>
            `;
            dt.appendChild(el);
        });
    }
}