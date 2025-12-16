/**
 * @fileoverview TaskManager 分子入口
 * @description 组合所有任务管理器原子，提供统一接口
 * @module apps/task_manager/index
 */

import { store } from '../../system/store.js';
import { bus } from '../../system/event_bus.js';
import { pm } from '../../system/process_manager.js';
import { config } from './config.js';
import { createRowElement, calculateRowData, renderDetails } from './render.js';
import { handleAction, updateRowData, categorizeApps } from './actions.js';

export const VERSION = '1.0.0';
export { config };
export const APP_NAME = 'Vitality Source';

export class TaskManagerApp {
    constructor() {
        this.id = 'win-taskmgr';
        this.listContainer = null;
        this.updateInterval = null;
        this.ctx = pm.getContext(this.id);
        this.selectedAppId = null;
        this.pendingStates = new Map();
        this.isSystemAppsCollapsed = true;
        this.domCache = new Map();

        // 🧱 [2025-12-17] 修复: 监听 app:ready 和 app:opened 两个事件
        bus.on(`app:ready:${config.id}`, () => this.initWithRetry());
        bus.on('app:opened', (data) => {
            if (data.id === config.id) {
                // 每次打开窗口都重新初始化
                this.initWithRetry();
            }
            this.onAppStateChange(data.id);
        });
        bus.on('app:closed', (data) => this.onAppStateChange(data.id));
        this.ctx.onCleanup(() => this.onClose());
    }

    onAppStateChange(id) {
        if (this.pendingStates.has(id)) {
            this.pendingStates.delete(id);
            this.render();
        }
    }

    /**
     * 🧱 [2025-12-17] 修复: 带重试的初始化，确保 DOM 就绪
     */
    initWithRetry(retries = 10) {
        const container = document.getElementById('task-list');
        if (!container) {
            if (retries > 0) {
                console.log(`[TaskManager] #task-list 不存在，重试中... (${retries})`);
                setTimeout(() => this.initWithRetry(retries - 1), 50);
            } else {
                console.error('[TaskManager] #task-list 始终不存在，放弃初始化');
            }
            return;
        }
        this.init();
    }

    init() {
        this.listContainer = document.getElementById('task-list');
        this.domCache.clear();
        this.onOpen();
    }

    render() {
        if (!this.listContainer) this.listContainer = document.getElementById('task-list');
        if (!this.listContainer) return;

        if (this.selectedAppId) {
            renderDetails(this.selectedAppId, this.listContainer, () => {
                this.selectedAppId = null;
                this.render();
            });
            return;
        }

        this.ensureContainers();
        this.updateContainerVisibility();
        this.renderApps();
    }

    ensureContainers() {
        if (this.listContainer.children.length === 0 || this.listContainer.querySelector('#btn-back')) {
            this.listContainer.innerHTML = '';
            this.domCache.clear();
            
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
            
            const header = this.listContainer.querySelector('#system-apps-header');
            header.onclick = () => {
                this.isSystemAppsCollapsed = !this.isSystemAppsCollapsed;
                this.render();
            };
        }
    }

    updateContainerVisibility() {
        const systemContainer = this.listContainer.querySelector('#system-apps-container');
        const toggleIcon = this.listContainer.querySelector('#system-apps-toggle-icon');
        
        if (systemContainer && toggleIcon) {
            systemContainer.style.display = this.isSystemAppsCollapsed ? 'none' : 'block';
            toggleIcon.innerText = this.isSystemAppsCollapsed ? '▶' : '▼';
        }
    }

    renderApps() {
        const userContainer = this.listContainer.querySelector('#user-apps-container');
        const systemContainer = this.listContainer.querySelector('#system-apps-container');
        const { userApps, systemApps } = categorizeApps(store.apps);
        const activeIds = new Set();

        userApps.forEach(app => {
            activeIds.add(app.id);
            this.updateRow(app, userContainer);
        });
        
        systemApps.forEach(app => {
            activeIds.add(app.id);
            this.updateRow(app, systemContainer);
        });

        for (const [id, cache] of this.domCache) {
            if (!activeIds.has(id)) {
                cache.el.remove();
                this.domCache.delete(id);
            }
        }
    }

    updateRow(app, targetContainer) {
        const rowData = calculateRowData(app, this.pendingStates);

        if (!this.domCache.has(app.id)) {
            const { el, refs, lastState } = createRowElement(
                app,
                (id) => { this.selectedAppId = id; this.render(); },
                (app) => handleAction(app, this.pendingStates, () => this.render()),
                this.pendingStates
            );

            if (targetContainer) {
                targetContainer.appendChild(el);
            } else {
                this.listContainer.appendChild(el);
            }

            this.domCache.set(app.id, { el, refs, lastState });
        } else {
            const cache = this.domCache.get(app.id);
            if (targetContainer && cache.el.parentElement !== targetContainer) {
                targetContainer.appendChild(cache.el);
            }
            updateRowData(app, cache, this.pendingStates, rowData);
        }
    }

    onOpen() {
        this.render();
        this.updateInterval = this.ctx.setInterval(() => this.render(), 1000);
    }

    onClose() {
        this.updateInterval = null;
        this.selectedAppId = null;
    }
}

export const app = new TaskManagerApp();
