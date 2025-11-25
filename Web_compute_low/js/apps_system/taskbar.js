import { store } from '../system/store.js';
import { bus } from '../system/event_bus.js';

export const VERSION = '1.0.0'; // 💖 版本号

export const config = {
    id: 'sys-taskbar',
    name: '任务栏',
    version: '1.0.0', // 🆕 版本号
    type: 'service',
    isSystem: true,
    description: '系统任务栏管理器'
};

export function init() {
    // 初始渲染
    update();
    renderTrayIcons();
    bindStartButton(); // 🆕 绑定开始按钮

    // 监听事件
    bus.on('app:opened', () => update());
    bus.on('app:closed', () => update());
    bus.on('window:focus', () => update());
}

// 🆕 绑定开始按钮事件
function bindStartButton() {
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
        btnStart.onclick = () => {
            // 触发打开登录界面事件
            bus.emit('system:open_login');
        };
    }
}

function update() {
    const container = document.getElementById('taskbar-apps');
    if (!container) return;
    container.innerHTML = '';

    // 获取全局 WM 实例以检查活动窗口
    const wm = window.wm;

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
            if (wm && !win.classList.contains('minimized') && wm.activeWindowId === id) {
                div.classList.add('active');
            }
        }
        
        // 绑定点击事件 (恢复/最小化)
        div.onclick = () => {
            if (wm) {
                // 使用 toggleApp 统一处理
                wm.toggleApp(id);
            }
        };

        container.appendChild(div);
    });
}

function renderTrayIcons() {
    const container = document.getElementById('tray-icons');
    if (!container) return;
    container.innerHTML = '';

    const wm = window.wm;

    Object.entries(store.apps).forEach(([id, app]) => {
        // 💖 只渲染标记为系统应用且未明确禁止显示的应用
        if (app.system === true) {
            const div = document.createElement('div');
            div.className = 'tray-icon';
            div.dataset.id = id;
            div.title = app.name;
            div.style.cursor = 'pointer';
            div.style.width = '20px';
            div.style.height = '20px';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            
            // 🎨 插入图标 SVG
            const iconPath = app.icon || app.iconPath;
            div.innerHTML = `<svg style="width:16px; height:16px; fill:${app.color || '#ccc'}" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>`;
            
            // 🖱️ 绑定点击事件
            div.onclick = () => {
                if (wm) wm.toggleApp(id);
            };
            
            container.appendChild(div);
        }
    });
}
