export const config = {
    id: 'win-taskmgr',
    name: 'Soul Prism',
    icon: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
    color: '#d63031',
    pos: { x: 20, y: 380 },
    winPos: { x: 300, y: 300 },
    openMsg: "灵魂棱镜已展开，正在审视系统状态... 📊",
    content: `
        <div id="task-list" style="height:100%; overflow-y:auto; padding:10px;">
            <!-- 任务列表由 JS 动态生成 -->
        </div>
    `
};

import { store } from '../store.js';
import { bus } from '../event_bus.js';
import { wm } from '../window_manager.js';

export const APP_NAME = 'Soul Prism';
export const APP_OPEN_MSG = "灵魂棱镜已展开，正在审视系统状态... 📊";

export class TaskManagerApp {
    // ---------------------------------------------------------------- //
    //  灵魂棱镜类 (Task Manager)
    //
    //  函数用处：
    //     管理“灵魂棱镜”应用的逻辑，显示系统进程列表。
    //
    //  易懂解释：
    //     这是你的“水晶球”。透过它，你可以看到所有正在运行的灵魂（应用），并决定它们的去留。
    // ---------------------------------------------------------------- //

    constructor() {
        this.id = 'win-taskmgr';
        this.listContainer = null;
        this.updateInterval = null;
        // 监听窗口就绪事件，替代 setTimeout
        bus.on(`app:ready:${config.id}`, () => this.init());
    }

    init() {
        // ---------------------------------------------------------------- //
        //  初始化()
        // ---------------------------------------------------------------- //
        this.listContainer = document.getElementById('task-list');

        // 启动自动刷新
        this.onOpen();
    }

    render() {
        // ---------------------------------------------------------------- //
        //  渲染列表()
        //
        //  函数用处：
        //     读取 store 中的应用状态，生成列表项。
        // ---------------------------------------------------------------- //
        if (!this.listContainer) this.listContainer = document.getElementById('task-list');
        if (!this.listContainer) return;

        const apps = store.apps;
        this.listContainer.innerHTML = '';

        Object.entries(apps).forEach(([id, app]) => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.padding = '10px';
            item.style.marginBottom = '5px';
            item.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            item.style.borderRadius = '4px';

            const statusColor = app.isOpen ? '#55efc4' : '#b2bec3';
            const statusText = app.isOpen ? '运行中' : '休眠中';

            item.innerHTML = `
                <div style="display:flex; alignItems:center; gap:10px;">
                    <svg style="width:20px; height:20px; fill:${app.color}" viewBox="0 0 24 24">
                        <path d="${app.iconPath}"/>
                    </svg>
                    <div>
                        <div style="font-weight:bold;">${app.name}</div>
                        <div style="font-size:12px; color:${statusColor};">${statusText}</div>
                    </div>
                </div>
                <div style="display:flex; gap:5px;">
                    ${app.isOpen ?
                    `<button class="tm-btn-close" data-id="${id}" style="padding:4px 8px; background:#ff7675; border:none; border-radius:4px; color:white; cursor:pointer;">终止</button>` :
                    `<button class="tm-btn-open" data-id="${id}" style="padding:4px 8px; background:#0984e3; border:none; border-radius:4px; color:white; cursor:pointer;">唤醒</button>`
                }
                </div>
            `;

            // 绑定按钮事件
            const closeBtn = item.querySelector('.tm-btn-close');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    wm.closeApp(id);
                    this.render(); // 立即刷新
                };
            }

            const openBtn = item.querySelector('.tm-btn-open');
            if (openBtn) {
                openBtn.onclick = () => {
                    wm.openApp(id);
                    this.render(); // 立即刷新
                };
            }

            this.listContainer.appendChild(item);
        });
    }

    // 当应用被打开时调用 (需要在 main.js 或 window_manager 中触发)
    onOpen() {
        this.render();
        // 开启自动刷新 (每秒刷新一次状态)
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.updateInterval = setInterval(() => this.render(), 1000);
    }

    onClose() {
        if (this.updateInterval) clearInterval(this.updateInterval);
    }
}

export const app = new TaskManagerApp();
