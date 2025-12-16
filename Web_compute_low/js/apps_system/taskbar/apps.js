/**
 * @fileoverview 任务栏应用图标原子
 * @description 处理任务栏应用图标的渲染
 * @module apps_system/taskbar/apps
 */

import { store } from '../../system/store.js';
import { bus } from '../../system/event_bus.js';
import { contextMenuApp } from '../context_menu.js';

/**
 * 更新任务栏应用图标
 */
export function updateApps() {
    const container = document.getElementById('taskbar-apps');
    if (!container) return;
    container.innerHTML = '';

    const wm = window.wm;

    Object.entries(store.apps).forEach(([id, app]) => {
        if (app.isSystem) return;
        if (app.skipTaskbar) return;

        const win = document.getElementById(id);
        const isPinned = app.showTaskbarIcon !== false;
        const isRunning = app.isOpen && win && win.classList.contains('open');

        if (!isPinned && !isRunning) return;

        const div = document.createElement('div');
        div.className = 'task-app';
        div.dataset.id = id;
        div.title = app.name || id;
        const iconPath = app.icon || app.iconPath;
        div.innerHTML = `<svg style="width:24px;fill:${app.color}" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>`;

        if (isRunning) {
            div.classList.add('running');
            if (wm && !win.classList.contains('minimized') && wm.activeWindowId === id) {
                div.classList.add('active');
            }
        }

        // 右键菜单
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const menuItems = [
                {
                    label: '打开/最小化',
                    icon: '🔄',
                    action: () => window.wm.toggleApp(id)
                }
            ];

            if (isPinned) {
                menuItems.push({
                    label: '取消固定',
                    icon: '🗑️',
                    action: () => {
                        store.updateApp(id, { showTaskbarIcon: false });
                        updateApps();
                        bus.emit('system:speak', "已取消固定");
                    }
                });
            } else {
                menuItems.push({
                    label: '固定到任务栏',
                    icon: '📌',
                    action: () => {
                        store.updateApp(id, { showTaskbarIcon: true });
                        updateApps();
                        bus.emit('system:speak', "已固定");
                    }
                });
            }

            contextMenuApp.show(e.clientX, e.clientY, menuItems);
        });

        container.appendChild(div);
    });
}
