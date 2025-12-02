import { createCapsule } from '../system/capsule_manager.js?v=1';
import { bus } from '../system/event_bus.js';
import { store } from '../system/store.js';

export const VERSION = '1.0.0'; // 💖 版本号

// 💖 详情窗口配置 (点击胶囊后打开的窗口)
const detailConfig = {
    // =================================
    //  🎉 计费详情窗口配置
    //
    //  🎨 代码用途：
    //     定义点击任务栏胶囊后弹出的详细账单窗口的元数据和 HTML 结构。
    //
    //  💡 易懂解释：
    //     这是你的“账本”！点一下任务栏上的钱袋子，
    //     它就会弹出来告诉你钱都花哪儿去了。💸
    //
    //  ⚠️ 警告：
    //     这是一个无边框窗口 (frameless: true)，样式完全由 content 内部控制。
    // =================================
    id: 'win-billing',
    name: '金色收获',
    version: '1.0.0', // 🆕 版本号
    description: '每一分价值都值得被记录',
    icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
    color: '#fdcb6e',
    system: true,
    showDesktopIcon: false,
    showTaskbarIcon: false,
    frameless: true, // 💖 无边框模式
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
    // =================================
    //  🎉 计费服务配置
    //
    //  🎨 代码用途：
    //     定义计费服务的元数据，用于在任务管理器中显示和控制后台逻辑。
    //
    //  💡 易懂解释：
    //     这是“会计师”的工作证！虽然你看不到他的人（没有窗口），
    //     但他一直在后台默默算账哦。🧮
    //
    //  ⚠️ 警告：
    //     type: 'service' 表示它是一个后台服务，不会出现在任务栏的应用列表中。
    // =================================
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
// =================================
//  🎉 初始化函数 (无参数)
//
//  🎨 代码用途：
//     创建任务栏胶囊，并设置事件监听以更新费用数据和窗口位置。
//
//  💡 易懂解释：
//     会计师上岗啦！他在任务栏上摆了个小摊位（胶囊），
//     随时准备告诉你今天花了多少钱。💰
//
//  ⚠️ 警告：
//     依赖 capsule_manager.js 来创建 UI。
// =================================
export function init() {
    // 注册详情窗口配置到 Store，确保 wm.openApp 能找到它
    store.setAppMetadata(detailConfig.id, detailConfig); // 💖 注册应用配置

    createCapsule({
        serviceConfig: config,
        detailConfig: detailConfig,
        html: `
            <span style="color: #fdcb6e; font-weight: bold;">¥</span>
            <span id="bar-total">0.00</span>
        `
    });

    // 监听窗口打开事件，自动定位到胶囊上方
    bus.on('app:opened', ({ id }) => {
        if (id === detailConfig.id) {
            setTimeout(() => {
                const win = document.getElementById(detailConfig.id);
                const capsule = document.getElementById('bar-billing');
                if (win && capsule) {
                    const cRect = capsule.getBoundingClientRect();
                    const wRect = win.getBoundingClientRect();
                    let left = cRect.left + (cRect.width / 2) - (wRect.width / 2);
                    let top = cRect.top - wRect.height - 10;
                    
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

    // 监听网络统计数据更新 (费用)
    let lastStatsUpdate = 0;
    bus.on('net:stats', (stats) => {
        const now = Date.now();
        if (now - lastStatsUpdate < 500) return; // 500ms 节流
        lastStatsUpdate = now;

        // 🛡️ 安全检查：确保数据结构完整
        if (!stats || !stats.cost) return;

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
