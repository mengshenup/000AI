import { store } from '../system/store.js';
import { bus } from '../system/event_bus.js';

export const config = {
    id: 'sys-desktop',
    name: '桌面',
    version: '1.0.0', // 🆕 版本号
    type: 'service',
    isSystem: true,
    description: '系统桌面图标管理器'
};

export function init() {
    render();
    
    // 监听应用重命名事件
    bus.on('app:renamed', () => render());
}

function render() {
    const dt = document.getElementById('desktop');
    if (!dt) return;
    
    // 🧹 清除旧的图标元素 (保留 drag-overlay)
    dt.querySelectorAll('.desktop-icon').forEach(e => e.remove());

    // 💖 渲染逻辑升级：优先使用 installedApps (包含所有已安装应用)，如果没有则回退到 store.apps
    // 这样即使应用从未打开过 (store.apps 里没有)，只要安装了 (installedApps 里有)，也能显示图标
    const source = Object.keys(store.installedApps).length > 0 ? store.installedApps : store.apps;

    Object.entries(source).forEach(([id, app]) => {
        const pathData = app.icon || app.iconPath;
        if (!pathData) return;
        
        // 💖 过滤掉系统应用
        if (app.isSystem) return;

        // 💖 过滤掉显式配置不显示的应用
        if (app.showDesktopIcon === false) return;
        
        // 💖 获取位置信息 (优先从 store.apps 获取用户自定义位置，否则用默认位置)
        const userState = store.apps[id] || {};
        const pos = userState.pos || app.pos || { x: 20, y: 20 };

        const el = document.createElement('div');
        el.className = 'desktop-icon';
        el.id = `icon-${id}`;
        el.style.left = `${pos.x}px`;
        el.style.top = `${pos.y}px`;
        el.dataset.id = id;
        el.dataset.type = 'icon';

        el.innerHTML = `
            <svg class="icon-svg" viewBox="0 0 24 24" fill="${app.color || '#ccc'}">
                <path d="${pathData}"/>
            </svg>
            <div class="icon-text">${app.name}</div>
        `;
        
        dt.appendChild(el);
    });
}
