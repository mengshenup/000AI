/**
 * @fileoverview TaskManager 操作原子
 * @description 任务管理器操作逻辑
 * @module apps/task_manager/actions
 */

import { wm } from '../../system/window_manager.js';
import { store } from '../../system/store.js';

/**
 * 处理应用操作（启动/停止）
 * @param {Object} app - 应用对象
 * @param {Map} pendingStates - 待处理状态
 * @param {Function} onRender - 渲染回调
 */
export function handleAction(app, pendingStates, onRender) {
    if (pendingStates.has(app.id)) return;

    if (app.isOpen) {
        pendingStates.set(app.id, { type: 'stopping', startTime: Date.now() });
        const progressTimer = setInterval(() => {
            if (!pendingStates.has(app.id)) {
                clearInterval(progressTimer);
                return;
            }
            onRender();
        }, 100);
        setTimeout(() => wm.closeApp(app.id), 500);
    } else {
        pendingStates.set(app.id, { type: 'starting', startTime: Date.now() });
        onRender();
        setTimeout(() => wm.openApp(app.id), 50);
    }
}

/**
 * 更新行数据
 * @param {Object} app - 应用对象
 * @param {Object} cache - DOM 缓存
 * @param {Map} pendingStates - 待处理状态
 * @param {Object} rowData - 行数据
 */
export function updateRowData(app, cache, pendingStates, rowData) {
    const { refs, lastState } = cache;
    const { cpuUsage, resUsage, statusColor, lagHtml, btnColor, btnText, btnDisabled } = rowData;

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
    
    const pendingAction = pendingStates.get(app.id);
    if (lastState.isOpen !== app.isOpen || lastState.pendingAction !== pendingAction) {
        refs.status.style.background = statusColor;
        refs.btn.style.background = btnColor;
        refs.btn.innerText = btnText;
        refs.btn.disabled = !!btnDisabled;
        lastState.isOpen = app.isOpen;
        lastState.pendingAction = pendingAction;
    }
}

/**
 * 分类应用
 * @param {Object} apps - 应用列表
 * @returns {{ userApps: Array, systemApps: Array }}
 * 
 * 🧱 [2025-12-17] 修复: 只显示有实际文件的应用（在 lazyRegistry 中注册的）
 */
export function categorizeApps(apps) {
    const userApps = [];
    const systemApps = [];
    
    // 获取有实际文件的应用 ID（在 lazyRegistry 中注册的）
    const lazyRegistry = store.lazyRegistry || {};
    const validAppIds = new Set(Object.keys(lazyRegistry));
    
    // 合并 apps 和 installedApps，但只保留有效的应用
    const installedApps = store.installedApps || {};
    const mergedApps = {};
    
    // 只添加有实际文件的应用
    Object.entries(installedApps).forEach(([id, app]) => {
        if (validAppIds.has(id)) {
            mergedApps[id] = { ...app };
        }
    });
    
    // apps 中的状态优先（这些是已经打开过的应用，肯定有效）
    Object.entries(apps).forEach(([id, app]) => {
        // 跳过没有注册的应用（可能是旧数据）
        if (!validAppIds.has(id) && !app.isSystem) return;
        mergedApps[id] = { ...mergedApps[id], ...app };
    });
    
    Object.entries(mergedApps).forEach(([id, app]) => {
        if (app.hideInTaskMgr) return;
        // 🧱 [2025-12-17] 修复: 只跳过非系统的服务类型应用（如胶囊服务）
        // 系统应用（isSystem: true）即使是 service 类型也应该显示
        if (app.type === 'service' && !app.isSystem) return;
        const appData = { id, ...app };
        if (app.isSystem) {
            systemApps.push(appData);
        } else {
            userApps.push(appData);
        }
    });
    
    userApps.sort((a, b) => a.id.localeCompare(b.id));
    systemApps.sort((a, b) => a.id.localeCompare(b.id));
    
    return { userApps, systemApps };
}
