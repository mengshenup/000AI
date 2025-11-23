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
import { pm } from '../process_manager.js'; // 💖 导入进程管理器

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
        this.ctx = pm.getContext(this.id); // 💖 获取进程上下文
        this.selectedAppId = null; // 💖 当前选中的应用 ID (用于详情页)
        
        // 监听窗口就绪事件，替代 setTimeout
        bus.on(`app:ready:${config.id}`, () => this.init()); // 💖 注册初始化回调
        
        // 注册清理
        this.ctx.onCleanup(() => this.onClose());
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

        // 💖 如果有选中的应用，渲染详情页
        if (this.selectedAppId) {
            this.renderDetails(this.selectedAppId);
            return;
        }

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

        // 💖 辅助函数：生成列表项 HTML
        const createItem = (app) => {
            const statusColor = app.isOpen ? '#2ecc71' : '#b2bec3'; // 🟢 运行中 / ⚪ 已停止
            const statusText = app.isOpen ? '运行中' : '已停止';
            
            // 📊 获取性能数据 (添加容错，防止旧版缓存导致崩溃)
            let stats = { cpuTime: 0, startTime: Date.now(), longTasks: 0 };
            let resCount = { total: 0 };
            
            if (pm) {
                if (typeof pm.getAppStats === 'function') stats = pm.getAppStats(app.id);
                if (typeof pm.getAppResourceCount === 'function') resCount = pm.getAppResourceCount(app.id);
            }
            
            const cpuUsage = stats.cpuTime > 0 ? (stats.cpuTime / (performance.now() - stats.startTime) * 100).toFixed(1) : '0.0';
            
            // 💾 真实资源占用：显示持有的句柄数 (定时器+监听器)
            const resUsage = app.isOpen ? resCount.total : 0;
            
            // 🐢 卡顿指标
            const lagIndicator = stats.longTasks > 0 ? `<span style="color:#e17055; font-weight:bold;">⚠ ${stats.longTasks}</span>` : `<span style="color:#00b894;">✓</span>`;

            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid #eee;
                background: white;
                margin-bottom: 5px;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            item.onmouseover = () => item.style.background = '#f8f9fa';
            item.onmouseout = () => item.style.background = 'white';
            item.onclick = (e) => {
                // 如果点击的是按钮，不进入详情
                if (e.target.tagName === 'BUTTON') return;
                this.selectedAppId = app.id;
                this.render(); // 重新渲染以显示详情
            };
            
            item.innerHTML = `
                <div style="width:10px; height:10px; border-radius:50%; background:${statusColor}; margin-right:10px;" title="${statusText}"></div>
                <div style="flex:1;">
                    <div style="font-weight:bold; color:#2d3436; display:flex; justify-content:space-between;">
                        <span>${app.customName || app.name}</span>
                        <span style="font-size:0.8em; color:#636e72; font-weight:normal;">CPU: ${cpuUsage}%</span>
                    </div>
                    <div style="font-size:0.75em; color:#999; margin-top:4px; display:flex; gap:15px;">
                        <span title="持有的资源句柄数">资源: ${resUsage}</span>
                        <span title="长任务(卡顿)次数">卡顿: ${lagIndicator}</span>
                    </div>
                </div>
                <button class="task-action-btn" style="
                    padding: 4px 12px;
                    border: none;
                    border-radius: 4px;
                    background: ${app.isOpen ? '#ff7675' : '#0984e3'};
                    color: white;
                    cursor: pointer;
                    font-size: 0.8em;
                    margin-left: 10px;
                ">${app.isOpen ? '结束' : '启动'}</button>
            `;

            // 绑定按钮事件
            const btn = item.querySelector('.task-action-btn');
            btn.onclick = (e) => {
                e.stopPropagation(); // 阻止冒泡
                if (app.isOpen) {
                    wm.closeApp(app.id); // ❌ 关闭
                } else {
                    wm.openApp(app.id); // 🚀 启动
                }
                setTimeout(() => this.render(), 100); 
            };

            return item;
        };

        // 渲染系统应用
        if (systemApps.length > 0) {
            const title = document.createElement('div');
            title.innerText = '系统进程';
            title.style.cssText = 'font-size:0.8em; color:#999; margin:10px 0 5px 0; font-weight:bold;';
            this.listContainer.appendChild(title);
            systemApps.forEach(app => this.listContainer.appendChild(createItem(app)));
        }

        // 渲染用户应用
        if (userApps.length > 0) {
            const title = document.createElement('div');
            title.innerText = '用户应用';
            title.style.cssText = 'font-size:0.8em; color:#999; margin:15px 0 5px 0; font-weight:bold;';
            this.listContainer.appendChild(title);
            userApps.forEach(app => this.listContainer.appendChild(createItem(app)));
        }
    }

    // =================================
    //  🎉 渲染详情页
    // =================================
    renderDetails(appId) {
        const app = store.getApp(appId);
        if (!app) {
            this.selectedAppId = null;
            this.render();
            return;
        }

        let stats = { cpuTime: 0, startTime: Date.now(), longTasks: 0, longTaskTime: 0, logs: [] };
        let resCount = { timers: 0, events: 0, animations: 0, total: 0 };
        
        if (pm) {
            if (typeof pm.getAppStats === 'function') stats = pm.getAppStats(appId);
            if (typeof pm.getAppResourceCount === 'function') resCount = pm.getAppResourceCount(appId);
        }

        const cpuUsage = stats.cpuTime > 0 ? (stats.cpuTime / (performance.now() - stats.startTime) * 100).toFixed(2) : '0.00';
        const runTime = app.isOpen ? Math.floor((Date.now() - stats.startTime) / 1000) : 0;

        this.listContainer.innerHTML = `
            <div style="padding:5px;">
                <button id="btn-back" style="margin-bottom:10px; padding:5px 10px; cursor:pointer; border:1px solid #ddd; background:white; border-radius:4px;">← 返回列表</button>
                
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-bottom:15px;">
                    <h3 style="margin:0 0 10px 0; color:#2d3436;">${app.customName || app.name}</h3>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.9em;">
                        <div>状态: <span style="color:${app.isOpen ? '#00b894' : '#b2bec3'}">${app.isOpen ? '运行中' : '已停止'}</span></div>
                        <div>运行时间: ${runTime}s</div>
                        <div>CPU 占用: <b>${cpuUsage}%</b></div>
                        <div>卡顿次数: <b style="color:${stats.longTasks > 0 ? '#d63031' : '#00b894'}">${stats.longTasks}</b></div>
                        <div>卡顿总耗时: ${stats.longTaskTime.toFixed(0)}ms</div>
                    </div>
                </div>

                <h4 style="margin:10px 0; border-bottom:1px solid #eee; padding-bottom:5px;">资源持有详情</h4>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <div style="flex:1; background:#e1f5fe; padding:10px; border-radius:5px; text-align:center;">
                        <div style="font-size:1.5em; color:#0984e3;">${resCount.timers}</div>
                        <div style="font-size:0.8em; color:#666;">定时器</div>
                    </div>
                    <div style="flex:1; background:#fff3e0; padding:10px; border-radius:5px; text-align:center;">
                        <div style="font-size:1.5em; color:#e67e22;">${resCount.events}</div>
                        <div style="font-size:0.8em; color:#666;">监听器</div>
                    </div>
                    <div style="flex:1; background:#e8f5e9; padding:10px; border-radius:5px; text-align:center;">
                        <div style="font-size:1.5em; color:#00b894;">${resCount.animations}</div>
                        <div style="font-size:0.8em; color:#666;">动画帧</div>
                    </div>
                </div>

                <h4 style="margin:10px 0; border-bottom:1px solid #eee; padding-bottom:5px;">资源操作日志 (最近50条)</h4>
                <div style="background:#2d3436; color:#dfe6e9; padding:10px; border-radius:5px; height:200px; overflow-y:auto; font-family:monospace; font-size:0.8em;">
                    ${stats.logs.length > 0 ? stats.logs.map(log => `<div>${log}</div>`).join('') : '<div style="color:#636e72; text-align:center; margin-top:20px;">暂无日志</div>'}
                </div>
            </div>
        `;

        document.getElementById('btn-back').onclick = () => {
            this.selectedAppId = null;
            this.render();
        };
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
        // 使用 ctx.setInterval 自动管理
        this.updateInterval = this.ctx.setInterval(() => this.render(), 1000); // 每秒刷新一次
    }

    // =================================
    //  🎉 关闭时触发
    // =================================
    onClose() {
        // 这里的清理工作由 pm 自动完成 (clearInterval)
        // 但为了逻辑清晰，我们也可以手动置空
        this.updateInterval = null;
        this.selectedAppId = null; // 重置选中状态
    }
}

export const app = new TaskManagerApp(); // 💖 导出应用实例
