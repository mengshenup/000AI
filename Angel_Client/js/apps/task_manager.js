export const config = {
    // =================================
    //  🎉 任务管理器配置 (ID, 名称, 图标...)
    //
    //  🎨 代码用途：
    //     定义“灵魂棱镜”任务管理器的基础元数据和界面结构
    //
    //  💡 易懂解释：
    //     这是你的“水晶球”！透过它，你可以看到所有正在运行的灵魂（应用），并决定它们的去留~ 🔮
    //
    //  ⚠️ 警告：
    //     列表容器 ID 为 task-list。
    // =================================
    id: 'win-taskmgr', // 💖 窗口的唯一标识符
    name: '活力源泉', // 💖 窗口标题栏显示的名称
    description: '掌控系统能量的指挥中心', // 💖 功能描述
    icon: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z', // 💖 SVG 图标路径（列表形状）
    color: '#d63031', // 💖 窗口的主题颜色（红色）
    pos: { x: 20, y: 380 }, // 💖 桌面图标的默认位置
    winPos: { x: 300, y: 300 }, // 💖 窗口打开时的默认屏幕坐标
    // openMsg: "活力源泉已启动，系统能量充沛！💪", // 💖 已移除，统一由 angel.js 管理
    content: `
        <!-- 💖 任务列表容器 -->
        <div id="task-list" style="height:100%; overflow-y:auto; padding:10px;">
            <!-- 任务列表由 JS 动态生成 -->
        </div>
    `
};

import { store } from '../store.js'; // 💖 导入全局状态存储
import { bus } from '../event_bus.js'; // 💖 导入事件总线
import { wm } from '../window_manager.js'; // 💖 导入窗口管理器

export const APP_NAME = 'Vitality Source'; // 💖 导出应用名称常量
// export const APP_OPEN_MSG = "活力源泉已启动，系统能量充沛！💪"; // 💖 已移除

export class TaskManagerApp {
    // =================================
    //  🎉 灵魂棱镜类 (无参数)
    //
    //  🎨 代码用途：
    //     管理“灵魂棱镜”应用的逻辑，显示和控制系统进程列表
    //
    //  💡 易懂解释：
    //     这是系统的“管家婆”！谁在干活，谁在偷懒，一眼就能看出来，还能随时叫停或者叫醒它们~ 👮‍♀️
    //
    //  ⚠️ 警告：
    //     无
    // =================================
    constructor() {
        this.id = 'win-taskmgr'; // 💖 应用 ID
        this.listContainer = null; // 💖 列表容器 DOM 元素，稍后获取
        this.updateInterval = null; // 💖 自动刷新定时器 ID
        // 监听窗口就绪事件，替代 setTimeout
        bus.on(`app:ready:${config.id}`, () => this.init()); // 💖 注册初始化回调
    }

    // =================================
    //  🎉 初始化函数 (无参数)
    //
    //  🎨 代码用途：
    //     获取列表容器并启动自动刷新
    //
    //  💡 易懂解释：
    //     管家婆上岗啦！拿起花名册（列表），开始点名~ 📝
    //
    //  ⚠️ 警告：
    //     依赖 DOM 元素 ID task-list。
    // =================================
    init() {
        this.listContainer = document.getElementById('task-list'); // 💖 获取列表容器 DOM

        // 启动自动刷新
        this.onOpen(); // 💖 立即执行一次打开逻辑
    }

    // =================================
    //  🎉 渲染列表 (无参数)
    //
    //  🎨 代码用途：
    //     读取 store 中的应用状态，动态生成并更新任务列表 DOM
    //
    //  💡 易懂解释：
    //     把花名册上的名字一个个念出来，看看谁是绿灯（运行中），谁是灰灯（睡觉中）~ 🚦
    //
    //  ⚠️ 警告：
    //     频繁操作 DOM，如果应用数量非常多可能会有性能压力。
    // =================================
    render() {
        if (!this.listContainer) this.listContainer = document.getElementById('task-list'); // 💖 再次尝试获取容器
        if (!this.listContainer) return; // 💖 容器不存在则返回

        const apps = store.apps; // 💖 从全局状态中获取所有应用信息
        this.listContainer.innerHTML = ''; // 💖 清空列表

        // 💖 分组应用
        const systemApps = [];
        const userApps = [];
        Object.entries(apps).forEach(([id, app]) => {
            if (app.system) {
                systemApps.push({ id, ...app });
            } else {
                userApps.push({ id, ...app });
            }
        });

        // 💖 辅助渲染函数
        const renderGroup = (title, list) => {
            if (list.length === 0) return '';
            return `
                <div class="task-group-title">${title}</div>
                ${list.map(app => `
                    <div class="task-item">
                        <div class="task-info">
                            <div class="task-icon">
                                <svg style="width:20px;height:20px;fill:${app.color}" viewBox="0 0 24 24"><path d="${app.icon || app.iconPath}"/></svg>
                            </div>
                            <div class="task-details">
                                <div class="task-name">${app.name}</div>
                                <div class="task-status">
                                    <span class="status-dot ${app.isOpen ? 'active' : ''}"></span>
                                    ${app.isOpen ? '运行中' : '休眠'}
                                </div>
                            </div>
                        </div>
                        <div class="task-actions">
                            ${app.isOpen ? 
                                `<button class="task-btn btn-kill" onclick="window.wm.killApp('${app.id}')">结束</button>` : 
                                `<button class="task-btn btn-switch" onclick="window.wm.openApp('${app.id}')">启动</button>`
                            }
                        </div>
                    </div>
                `).join('')}
            `;
        };

        this.listContainer.innerHTML = renderGroup('用户应用', userApps) + renderGroup('系统进程', systemApps);
    }

    // =================================
    //  🎉 开启自动刷新 (无参数)
    //
    //  🎨 代码用途：
    //     启动定时器，定期刷新任务列表状态
    //
    //  💡 易懂解释：
    //     管家婆每隔一秒钟就看一眼花名册，确保信息是最新的！⏱️
    //
    //  ⚠️ 警告：
    //     需要在窗口打开时调用。
    // =================================
    onOpen() {
        this.render(); // 💖 立即渲染一次
        // 开启自动刷新 (每秒刷新一次状态)
        if (this.updateInterval) clearInterval(this.updateInterval); // 💖 清除旧的定时器
        this.updateInterval = setInterval(() => this.render(), 1000); // 💖 设置新的定时器
    }

    // =================================
    //  🎉 关闭自动刷新 (无参数)
    //
    //  🎨 代码用途：
    //     清除定时器，停止刷新
    //
    //  💡 易懂解释：
    //     管家婆下班啦，不再盯着花名册看了~ 💤
    //
    //  ⚠️ 警告：
    //     需要在窗口关闭时调用，防止内存泄漏。
    // =================================
    onClose() {
        if (this.updateInterval) clearInterval(this.updateInterval); // 💖 清除定时器
    }
}

export const app = new TaskManagerApp(); // 💖 导出应用实例
