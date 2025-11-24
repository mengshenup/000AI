import { store } from './store.js';

export class TaskbarManager {
    constructor(wm) {
        this.wm = wm;
    }

    update() {
        const container = document.getElementById('taskbar-apps');
        if (!container) return;
        container.innerHTML = '';

        Object.entries(store.apps).forEach(([id, app]) => {
            if (app.isSystem) return;
            if (app.showTaskbarIcon === false) return;

            const win = document.getElementById(id);
            const div = document.createElement('div');
            div.className = 'task-app';
            div.dataset.id = id;
            div.title = app.name || id;
            const iconPath = app.icon || app.iconPath;
            div.innerHTML = `<svg style="width:24px;fill:${app.color}" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>`;

            if (win && win.classList.contains('open')) {
                div.classList.add('running');
                if (!win.classList.contains('minimized') && this.wm.activeWindowId === id) {
                    div.classList.add('active');
                }
            }
            container.appendChild(div);
        });
    }
}