import { bus } from '../apps_run/event_bus.js';
import { store } from '../apps_run/store.js';

// 💖 详情窗口配置 (点击胶囊后打开的窗口)
const detailConfig = {
    id: 'win-billing',
    name: '金色收获',
    description: '每一分价值都值得被记录',
    icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
    color: '#fdcb6e',
    system: true,
    showDesktopIcon: false,
    showTaskbarIcon: false,
    frameless: true,
    fixed: false,
    width: 200,
    height: 200,
    pos: { x: 0, y: 0 },
    isOpen: false,
    content: `
        <div style="padding: 15px; background: rgba(45, 52, 54, 0.95); color: #dfe6e9; border-radius: 8px; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); height: 100%; display: flex; flex-direction: column;">
            <div style="font-size: 12px; color: #fdcb6e; margin-bottom: 10px; font-weight: bold;">BILLING DETAILS</div>
            
            <div style="flex: 1; overflow-y: auto; margin-bottom: 10px;">
                <div class="bill-row" style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px;">
                    <span style="color: #b2bec3;">Network</span>
                    <span id="pop-net" style="color: #fff;">¥0.00</span>
                </div>
                <div class="bill-row" style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px;">
                    <span style="color: #b2bec3;">AI Compute</span>
                    <span id="ai-cost" style="color: #fff;">¥0.00</span>
                </div>
                <div style="border-top: 1px solid #636e72; margin: 5px 0;"></div>
                <div id="pop-models" style="font-size: 10px; color: #aaa;">
                    <!-- 动态内容 -->
                </div>
            </div>

            <div style="border-top: 1px solid #636e72; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px;">TOTAL</span>
                <span id="pop-total" style="color: #fdcb6e; font-weight: bold; font-size: 16px;">¥0.00</span>
            </div>
        </div>
    `,
    contentStyle: 'background: transparent; padding: 0; box-shadow: none; border: none;'
};

// 💖 服务配置 (任务管理器中显示的条目，控制胶囊显示)
export const config = {
    id: 'svc-billing',
    name: '金色收获',
    description: '任务栏计费监控服务',
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
    // 注册详情窗口配置
    store.setAppMetadata(detailConfig.id, detailConfig);

    // 1. 动态创建胶囊 DOM
    const container = document.getElementById('taskbar-status');
    if (container) {
        const el = document.createElement('div');
        el.id = 'bar-billing';
        el.className = 'status-capsule';
        el.title = '点击查看账单详情';
        el.style.display = 'none'; // 默认隐藏
        el.innerHTML = `
            <span style="color: #fdcb6e; font-weight: bold;">¥</span>
            <span id="bar-total">0.00</span>
        `;
        
        // 插入到时钟之前 (或者流量之前，保持顺序)
        // 这里简单处理，直接插入到 container，顺序取决于 init 执行顺序
        // 为了保持一致性，可以尝试插入到最前面
        if (container.firstChild) container.insertBefore(el, container.firstChild);
        else container.appendChild(el);

        // 绑定点击事件
        el.addEventListener('click', () => {
            const wm = window.wm;
            if (!wm) return;
            
            const appId = detailConfig.id;
            const app = store.getApp(appId);
            
            if (app && app.isOpen) {
                wm.closeApp(appId);
            } else {
                wm.openApp(appId, false);
                setTimeout(() => {
                    const win = document.getElementById(appId);
                    if (win) {
                        const cRect = el.getBoundingClientRect();
                        const wRect = win.getBoundingClientRect();
                        let left = cRect.left + (cRect.width / 2) - (wRect.width / 2);
                        let top = cRect.top - wRect.height - 10;
                        
                        if (left + wRect.width > window.innerWidth) left = window.innerWidth - wRect.width - 10;
                        if (left < 10) left = 10;
                        if (top < 10) top = 10;

                        win.style.left = `${left}px`;
                        win.style.top = `${top}px`;
                        store.updateApp(appId, { winPos: { x: left, y: top } });
                    }
                }, 0);
            }
        });
    }

    // 监听网络统计数据更新 (费用)
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
        update('bar-total', stats.cost.total);

        // 更新详情窗口数据
        update('pop-total', stats.cost.total);
        update('pop-net', stats.cost.net);
        update('ai-cost', stats.cost.ai);
        
        // 更新模型详情
        const modelsDiv = document.getElementById('pop-models');
        if (modelsDiv && stats.cost.models) {
            modelsDiv.innerHTML = Object.entries(stats.cost.models)
                .map(([m, c]) => `<div style="display:flex; justify-content:space-between;"><span>${m}</span><span>¥${c}</span></div>`)
                .join('');
        }
    });

    // 监听服务开启/关闭事件，控制胶囊显示
    const updateVisibility = () => {
        const app = store.getApp(config.id);
        const isOpen = app ? app.isOpen : config.isOpen;
        const el = document.getElementById('bar-billing');
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
