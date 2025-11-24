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
        this.listContainer = null; // 💖 列表容器 DOM 元素
        this.updateInterval = null; // 💖 自动刷新定时器 ID
        this.ctx = pm.getContext(this.id); // 💖 获取进程上下文
        this.selectedAppId = null; // 💖 当前选中的应用 ID
        this.pendingStates = new Map(); // 💖 记录正在操作中的应用状态 (id -> 'starting' | 'stopping')
        this.isSystemAppsCollapsed = true; // 💖 系统应用折叠状态
        
        // 🚀 性能优化：DOM 缓存池
        // Map<AppId, { el: HTMLElement, refs: Object }>
        // 用于增量更新，避免每秒重建 DOM 导致 1000+ 进程时卡死
        this.domCache = new Map();

        // 监听窗口就绪事件
        bus.on(`app:ready:${config.id}`, () => this.init());
        
        // 监听应用状态变更，清除 pending 状态
        bus.on('app:opened', (data) => {
            if (this.pendingStates.has(data.id)) {
                this.pendingStates.delete(data.id);
                this.render(); // 立即刷新 UI
            }
        });
        bus.on('app:closed', (data) => {
            if (this.pendingStates.has(data.id)) {
                this.pendingStates.delete(data.id);
                this.render(); // 立即刷新 UI
            }
        });
        
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
        this.domCache.clear(); // 🧹 初始化时清空缓存，防止引用失效 DOM
        // 启动自动刷新
        this.onOpen(); // 💖 立即执行一次打开逻辑
    }

    // =================================
    //  🎉 渲染列表 (高性能版)
    //
    //  🎨 代码用途：
    //     使用增量更新策略渲染任务列表
    //
    //  💡 易懂解释：
    //     不再每次把花名册撕了重写，而是只改动有变化的数据！
    //     这样就算有 1000 个员工，也能瞬间更新状态。⚡
    // =================================
    render() {
        if (!this.listContainer) this.listContainer = document.getElementById('task-list');
        if (!this.listContainer) return;

        // 💖 如果有选中的应用，渲染详情页 (详情页结构简单，全量刷新无妨)
        if (this.selectedAppId) {
            this.renderDetails(this.selectedAppId);
            return;
        }

        // 🛡️ 视图状态检查：如果容器为空（刚打开）或包含详情页元素（刚返回），强制重置
        if (this.listContainer.children.length === 0 || this.listContainer.querySelector('#btn-back')) {
            this.listContainer.innerHTML = ''; // 清理可能存在的详情页
            this.domCache.clear(); // 清空缓存，强制重建列表
            
            // 🏗️ 创建分组容器结构
            this.listContainer.innerHTML = `
                <div id="user-apps-container"></div>
                <div id="system-apps-header" style="
                    padding: 10px; margin-top: 15px; margin-bottom: 5px;
                    background: #f1f2f6; border-radius: 5px; cursor: pointer;
                    display: flex; justify-content: space-between; align-items: center;
                    font-weight: bold; color: #636e72; font-size: 0.9em;
                ">
                    <span>🛡️ 系统核心进程</span>
                    <span id="system-apps-toggle-icon">▶</span>
                </div>
                <div id="system-apps-container" style="display: none;"></div>
            `;
            
            // 绑定折叠点击事件
            const header = this.listContainer.querySelector('#system-apps-header');
            header.onclick = () => {
                this.isSystemAppsCollapsed = !this.isSystemAppsCollapsed;
                this.render(); // 重新渲染以更新显示状态
            };
        }

        // 获取容器引用
        const userContainer = this.listContainer.querySelector('#user-apps-container');
        const systemContainer = this.listContainer.querySelector('#system-apps-container');
        const toggleIcon = this.listContainer.querySelector('#system-apps-toggle-icon');
        
        // 更新折叠状态 UI
        if (systemContainer && toggleIcon) {
            systemContainer.style.display = this.isSystemAppsCollapsed ? 'none' : 'block';
            toggleIcon.innerText = this.isSystemAppsCollapsed ? '▶' : '▼';
        }

        const apps = store.apps;
        const activeIds = new Set(); // 记录本次渲染存在的 ID

        // 1. 准备数据列表 (分离系统和用户应用)
        const userApps = [];
        const systemApps = [];
        
        Object.entries(apps).forEach(([id, app]) => {
            const appData = { id, ...app };
            if (app.isSystem) {
                systemApps.push(appData);
            } else {
                userApps.push(appData);
            }
        });
        
        // 排序：按 ID 排序
        userApps.sort((a, b) => a.id.localeCompare(b.id));
        systemApps.sort((a, b) => a.id.localeCompare(b.id));

        // 2. 增量更新 DOM
        // 渲染用户应用
        userApps.forEach(app => {
            activeIds.add(app.id);
            this.updateRow(app, userContainer);
        });
        
        // 渲染系统应用 (即使折叠也要更新数据，或者可以选择不更新以节省性能？这里选择更新以保持状态同步)
        // 优化：如果折叠了，其实可以不更新 DOM，但是为了简单起见，先更新
        systemApps.forEach(app => {
            activeIds.add(app.id);
            this.updateRow(app, systemContainer);
        });

        // 3. 清理已移除的应用 DOM
        for (const [id, cache] of this.domCache) {
            if (!activeIds.has(id)) {
                cache.el.remove();
                this.domCache.delete(id);
            }
        }
    }

    /**
     * 🔄 更新单行数据 (核心优化)
     */
    updateRow(app, targetContainer) {
        // 📊 计算数据
        let stats = { cpuTime: 0, startTime: Date.now(), longTasks: 0 };
        let resCount = { total: 0 };
        if (pm) {
            if (typeof pm.getAppStats === 'function') stats = pm.getAppStats(app.id);
            if (typeof pm.getAppResourceCount === 'function') resCount = pm.getAppResourceCount(app.id);
        }
        
        const cpuUsage = stats.cpuTime > 0 ? (stats.cpuTime / (performance.now() - stats.startTime) * 100).toFixed(1) : '0.0';
        const resUsage = app.isOpen ? resCount.total : 0;
        const statusColor = app.isOpen ? '#2ecc71' : '#b2bec3';
        
        // 💖 处理 Pending 状态
        const pendingAction = this.pendingStates.get(app.id);
        let btnColor, btnText, btnDisabled;
        
        if (pendingAction) {
            btnColor = '#b2bec3';
            btnDisabled = true;
            if (pendingAction.type === 'stopping') {
                // 模拟进度显示 (因为 pm.kill 是同步的，这里只是为了 UX)
                const progress = Math.min(100, Math.floor((Date.now() - pendingAction.startTime) / 10)); 
                btnText = `清理中 ${progress}%`;
            } else {
                btnText = '启动中...';
            }
        } else {
            btnColor = app.isOpen ? '#ff7675' : '#0984e3';
            btnText = app.isOpen ? '结束' : '启动';
            btnDisabled = false;
        }
        
        // 🐢 卡顿指标 HTML
        const lagHtml = stats.longTasks > 0 
            ? `<span style="color:#e17055; font-weight:bold;">⚠ ${stats.longTasks}</span>` 
            : `<span style="color:#00b894;">✓</span>`;

        // 🅰️ 情况 A: DOM 不存在 -> 创建
        if (!this.domCache.has(app.id)) {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex; align-items: center; padding: 10px;
                border-bottom: 1px solid #eee; background: white;
                margin-bottom: 5px; border-radius: 5px; cursor: pointer;
                transition: background 0.2s;
            `;
            item.onmouseover = () => item.style.background = '#f8f9fa';
            item.onmouseout = () => item.style.background = 'white';
            item.onclick = (e) => {
                if (e.target.tagName === 'BUTTON') return;
                this.selectedAppId = app.id;
                this.render();
            };

            // 使用 innerHTML 填充结构，并保存关键节点的引用
            item.innerHTML = `
                <div data-ref="status" style="width:10px; height:10px; border-radius:50%; background:${statusColor}; margin-right:10px;"></div>
                <div style="flex:1;">
                    <div style="font-weight:bold; color:#2d3436; display:flex; justify-content:space-between;">
                        <span>${app.customName || app.name}</span>
                        <span data-ref="cpu" style="font-size:0.8em; color:#636e72; font-weight:normal;">CPU: ${cpuUsage}%</span>
                    </div>
                    <div style="font-size:0.75em; color:#999; margin-top:4px; display:flex; gap:15px;">
                        <span data-ref="res">资源: ${resUsage}</span>
                        <span data-ref="lag">卡顿: ${lagHtml}</span>
                    </div>
                </div>
                <button data-ref="btn" class="task-action-btn" style="
                    padding: 4px 12px; border: none; border-radius: 4px;
                    background: ${btnColor}; color: white; cursor: pointer;
                    font-size: 0.8em; margin-left: 10px;
                ">${btnText}</button>
            `;

            // 绑定按钮事件
            const btn = item.querySelector('[data-ref="btn"]');
            btn.onclick = (e) => {
                e.stopPropagation();
                if (this.pendingStates.has(app.id)) return; // 防止重复点击

                // 移除超时重置机制，改为进度显示
                
                if (app.isOpen) {
                    this.pendingStates.set(app.id, { type: 'stopping', startTime: Date.now() });
                    
                    // 启动一个定时器来更新进度条文字
                    const progressTimer = setInterval(() => {
                        if (!this.pendingStates.has(app.id)) {
                            clearInterval(progressTimer);
                            return;
                        }
                        this.render(); // 触发重绘以更新百分比
                    }, 100);

                    // 模拟一点延迟让用户看清状态，也给 UI 线程喘息机会
                    setTimeout(() => {
                        wm.closeApp(app.id);
                        // closeApp 是同步的，执行完就意味着清理完毕
                        // 但为了让用户看到 100%，我们稍微延迟一点移除 pending 状态
                        // 注意：wm.closeApp 会触发 app:closed 事件，我们在 bus.on 里处理了移除 pending
                        // 所以这里不需要手动移除，只需要确保 bus 事件能触发
                    }, 500); // 增加延迟以展示进度效果
                } else {
                    this.pendingStates.set(app.id, { type: 'starting', startTime: Date.now() });
                    this.render(); // 立即刷新显示“启动中...”
                    setTimeout(() => wm.openApp(app.id), 50);
                }
            };
            if (btnDisabled) btn.disabled = true;

            // 💖 关键修改：添加到指定容器
            if (targetContainer) {
                targetContainer.appendChild(item);
            } else {
                // 兜底：如果没传容器，就加到主列表（兼容旧逻辑，虽然现在应该都有容器）
                this.listContainer.appendChild(item);
            }

            // 缓存引用
            this.domCache.set(app.id, {
                el: item,
                refs: {
                    status: item.querySelector('[data-ref="status"]'),
                    cpu: item.querySelector('[data-ref="cpu"]'),
                    res: item.querySelector('[data-ref="res"]'),
                    lag: item.querySelector('[data-ref="lag"]'),
                    btn: btn
                },
                lastState: { cpuUsage, resUsage, lagHtml, isOpen: app.isOpen, pendingAction } // 用于对比
            });
        } 
        // 🅱️ 情况 B: DOM 已存在 -> 更新
        else {
            const cache = this.domCache.get(app.id);
            const { refs, lastState, el } = cache;

            // 💖 确保元素在正确的容器中 (防止从系统变用户或反之，虽然很少见)
            if (targetContainer && el.parentElement !== targetContainer) {
                targetContainer.appendChild(el);
            }

            // 仅当数据变化时才操作 DOM (极致性能)
            if (lastState.cpuUsage !== cpuUsage) {
                refs.cpu.innerText = `CPU: ${cpuUsage}%`;
                lastState.cpuUsage = cpuUsage;
            }
            if (lastState.resUsage !== resUsage) {
                refs.res.innerText = `资源: ${resUsage}`;
                lastState.resUsage = resUsage;
            }
            if (lastState.lagHtml !== lagHtml) {
                refs.lag.innerHTML = `卡顿: ${lagHtml}`;
                lastState.lagHtml = lagHtml;
            }
            // 检查状态或 pending 状态是否变化
            if (lastState.isOpen !== app.isOpen || lastState.pendingAction !== pendingAction) {
                refs.status.style.background = statusColor;
                refs.btn.style.background = btnColor;
                refs.btn.innerText = btnText;
                refs.btn.disabled = !!btnDisabled;
                
                lastState.isOpen = app.isOpen;
                lastState.pendingAction = pendingAction;
            }
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

        // 💾 保存滚动位置 (防止刷新时跳动)
        const mainScroll = this.listContainer.scrollTop;
        const logContainer = this.listContainer.querySelector('.log-container');
        const logScroll = logContainer ? logContainer.scrollTop : 0;

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
                <div class="log-container" style="background:#2d3436; color:#dfe6e9; padding:10px; border-radius:5px; height:200px; overflow-y:auto; font-family:monospace; font-size:0.8em;">
                    ${stats.logs.length > 0 ? stats.logs.map(log => `<div>${log}</div>`).join('') : '<div style="color:#636e72; text-align:center; margin-top:20px;">暂无日志</div>'}
                </div>
            </div>
        `;

        // 🔄 恢复滚动位置
        this.listContainer.scrollTop = mainScroll;
        const newLogContainer = this.listContainer.querySelector('.log-container');
        if (newLogContainer) newLogContainer.scrollTop = logScroll;

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
