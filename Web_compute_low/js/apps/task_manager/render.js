/**
 * @fileoverview 任务管理器渲染原子
 * @description 处理任务列表的渲染逻辑
 * @module apps/task_manager/render
 */

import { store } from '../../system/store.js';
import { pm } from '../../system/process_manager.js';

/**
 * 创建行 DOM 元素
 */
export function createRowElement(app, onSelect, onAction, pendingStates) {
    const { cpuUsage, resUsage, statusColor, lagHtml, btnColor, btnText, btnDisabled } = 
        calculateRowData(app, pendingStates);

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
        onSelect(app.id);
    };

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

    const btn = item.querySelector('[data-ref="btn"]');
    btn.onclick = (e) => {
        e.stopPropagation();
        onAction(app);
    };
    if (btnDisabled) btn.disabled = true;

    return {
        el: item,
        refs: {
            status: item.querySelector('[data-ref="status"]'),
            cpu: item.querySelector('[data-ref="cpu"]'),
            res: item.querySelector('[data-ref="res"]'),
            lag: item.querySelector('[data-ref="lag"]'),
            btn: btn
        },
        lastState: { cpuUsage, resUsage, lagHtml, isOpen: app.isOpen, pendingAction: pendingStates.get(app.id) }
    };
}

/**
 * 计算行数据
 */
export function calculateRowData(app, pendingStates) {
    let stats = { cpuTime: 0, startTime: Date.now(), longTasks: 0 };
    let resCount = { total: 0 };
    if (pm) {
        if (typeof pm.getAppStats === 'function') stats = pm.getAppStats(app.id);
        if (typeof pm.getAppResourceCount === 'function') resCount = pm.getAppResourceCount(app.id);
    }
    
    const cpuUsage = stats.cpuTime > 0 ? (stats.cpuTime / (performance.now() - stats.startTime) * 100).toFixed(1) : '0.0';
    const resUsage = app.isOpen ? resCount.total : 0;
    const statusColor = app.isOpen ? '#2ecc71' : '#b2bec3';
    
    const pendingAction = pendingStates.get(app.id);
    let btnColor, btnText, btnDisabled;
    
    if (pendingAction) {
        btnColor = '#b2bec3';
        btnDisabled = true;
        if (pendingAction.type === 'stopping') {
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
    
    const lagHtml = stats.longTasks > 0 
        ? `<span style="color:#e17055; font-weight:bold;">⚠ ${stats.longTasks}</span>` 
        : `<span style="color:#00b894;">✓</span>`;

    return { cpuUsage, resUsage, statusColor, lagHtml, btnColor, btnText, btnDisabled };
}

/**
 * 渲染详情页
 */
export function renderDetails(appId, listContainer, onBack) {
    const app = store.getApp(appId);
    if (!app) {
        onBack();
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

    listContainer.innerHTML = `
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

    document.getElementById('btn-back').onclick = onBack;
}
