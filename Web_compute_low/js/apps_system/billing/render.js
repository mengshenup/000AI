/**
 * @fileoverview Render - 计费渲染原子
 * @description 计费界面渲染和更新
 * @module apps_system/billing/render
 */

import { store } from '../../system/store.js';

/**
 * 更新计费显示
 */
export function updateBillingDisplay(stats) {
    if (!stats || !stats.cost) return;

    const update = (id, val) => {
        document.querySelectorAll(`#${id}`).forEach(el => el.innerText = val);
    };

    update('bar-total', stats.cost.total);
    update('pop-total', stats.cost.total);
    update('pop-net', stats.cost.net);
    update('ai-cost', stats.cost.ai);

    const modelsDiv = document.getElementById('pop-models');
    if (modelsDiv && stats.cost.models) {
        modelsDiv.innerHTML = Object.entries(stats.cost.models)
            .map(([m, c]) => `<div style="display:flex; justify-content:space-between;"><span>${m}</span><span>${c}</span></div>`)
            .join('');
    }
}

/**
 * 定位计费窗口
 * 🧱 [2025-12-17] 修复: 胶囊ID应为 capsule-svc-billing
 */
export function positionBillingWindow(detailConfig) {
    const win = document.getElementById(detailConfig.id);
    const capsule = document.getElementById('capsule-svc-billing');
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
        store.updateApp(detailConfig.id, { winPos: { x: left, y: top } });
    }
}

/**
 * 更新胶囊可见性
 * 🧱 [2025-12-17] 修复: 胶囊ID应为 capsule-svc-billing
 */
export function updateCapsuleVisibility(config) {
    const app = store.getApp(config.id);
    const isOpen = app ? app.isOpen : config.isOpen;
    const el = document.getElementById('capsule-svc-billing');
    if (el) el.style.display = isOpen ? 'flex' : 'none';
}
