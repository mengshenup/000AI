import { createCapsule } from '../system/capsule_manager.js?v=1';

export const VERSION = '1.0.0'; // 💖 版本号

// 💖 详情窗口配置 (点击胶囊后打开的窗口)
const detailConfig = {
    id: 'win-traffic',
    name: '脉动监测',
    version: '1.0.0', // 🆕 版本号
    description: '感受数据的每一次跳动',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    color: '#00cec9',
    system: true,
    showDesktopIcon: false,
    showTaskbarIcon: false,
    frameless: true,
    fixed: false,
    width: 200,
    height: 120,
    pos: { x: 0, y: 0 },
    isOpen: false,
    openMsg: "",
    content: `
        <div style="padding: 15px; background: rgba(30, 39, 46, 0.95); color: #fff; border-radius: 8px; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); height: 100%;">
            <div style="font-size: 12px; color: #00cec9; margin-bottom: 10px; font-weight: bold;">NETWORK MONITOR</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #aaa; font-size: 11px;">UPLOAD</span>
                <span id="tx-stat" style="color: #74b9ff; font-family: monospace;">0 KB/s</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #aaa; font-size: 11px;">DOWNLOAD</span>
                <span id="rx-stat" style="color: #55efc4; font-family: monospace;">0 KB/s</span>
            </div>
            <div style="margin-top: 10px; height: 2px; background: #333; border-radius: 1px; overflow: hidden;">
                <div style="width: 50%; height: 100%; background: #00cec9; animation: pulse 2s infinite;"></div>
            </div>
        </div>
    `,
    contentStyle: 'background: transparent; padding: 0; box-shadow: none; border: none;'
};

// 💖 服务配置 (任务管理器中显示的条目，控制胶囊显示)
export const config = {
    id: 'svc-traffic',
    name: '流量胶囊',
    description: '任务栏流量监控服务',
    icon: detailConfig.icon,
    color: detailConfig.color,
    system: true,
    type: 'service', // 💖 标记为服务类型，不创建窗口
    showDesktopIcon: false,
    showTaskbarIcon: false,
    isOpen: true // 默认开启服务
};

// 💖 导出初始化函数，由 loader.js 调用
export function init() {
    createCapsule({
        serviceConfig: config,
        detailConfig: detailConfig,
        html: `
            <span style="color: #aaa;">▲</span>
            <span id="bar-tx">0B</span>
            <span style="width: 1px; height: 10px; background: rgba(0,0,0,0.2); margin: 0 5px;"></span>
            <span style="color: #aaa;">▼</span>
            <span id="bar-rx">0B</span>
        `
        // 不需要 onMount，因为 traffic 的数据更新逻辑在 loader.js 或 network.js 中通过 id 查找 DOM
        // 只要 ID 匹配 (bar-tx, bar-rx)，现有的更新逻辑就能工作
    });

    // 监听窗口打开事件，自动定位到胶囊上方
    bus.on('app:opened', ({ id }) => {
        if (id === detailConfig.id) {
            setTimeout(() => {
                const win = document.getElementById(detailConfig.id);
                const capsule = document.getElementById('bar-traffic');
                if (win && capsule) {
                    const cRect = capsule.getBoundingClientRect();
                    const wRect = win.getBoundingClientRect();
                    let left = cRect.left + (cRect.width / 2) - (wRect.width / 2);
                    let top = cRect.top - wRect.height - 10;
                    
                    // 边界检查
                    if (left + wRect.width > window.innerWidth) left = window.innerWidth - wRect.width - 10;
                    if (left < 10) left = 10;
                    if (top < 10) top = 10;

                    win.style.left = `${left}px`;
                    win.style.top = `${top}px`;
                    store.updateApp(id, { winPos: { x: left, y: top } });
                }
            }, 0);
        }
    });
}

    // 监听网络统计数据更新 (上传/下载速度)
    let lastStatsUpdate = 0;
    bus.on('net:stats', (stats) => {
        const now = Date.now();
        if (now - lastStatsUpdate < 500) return; // 500ms 节流
        lastStatsUpdate = now;

        // 辅助函数：安全更新 DOM 文本
        const update = (id, val) => { 
            const els = document.querySelectorAll(`#${id}`);
            els.forEach(el => el.innerText = val);
        }; 
        
        // 更新任务栏胶囊数据
        update('bar-tx', stats.net.up);
        update('bar-rx', stats.net.down);

        // 更新详情窗口数据
        update('tx-stat', stats.net.up);    // ⬆️ 更新上传速度
        update('rx-stat', stats.net.down);  // ⬇️ 更新下载速度
    });

    // 监听服务开启/关闭事件，控制胶囊显示
    const updateVisibility = () => {
        const app = store.getApp(config.id);
        const isOpen = app ? app.isOpen : config.isOpen;
        const el = document.getElementById('bar-traffic');
        if (el) el.style.display = isOpen ? 'flex' : 'none';
    };

    bus.on('app:opened', ({ id }) => {
        if (id === config.id) updateVisibility();
    });

    bus.on('app:closed', ({ id }) => {
        if (id === config.id) updateVisibility();
    });
    
    // 初始状态
    updateVisibility();
}
