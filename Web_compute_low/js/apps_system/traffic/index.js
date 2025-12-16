/**
 * @fileoverview Traffic 分子入口
 * @description 流量监控服务管理
 * @module apps_system/traffic/index
 */

import { createCapsule } from '../../system/capsule_manager.js';
import { bus } from '../../system/event_bus.js';
import { store } from '../../system/store.js';
import { detailConfig, capsuleHtml, updateStats } from './render.js';

export const VERSION = '1.0.0';

export const config = {
    id: 'svc-traffic',
    name: '流量胶囊',
    description: '任务栏流量监控服务',
    icon: detailConfig.icon,
    color: detailConfig.color,
    system: true,
    type: 'service',
    showDesktopIcon: false,
    showTaskbarIcon: false,
    isOpen: true,
    relatedApps: ['win-traffic']
};

export { detailConfig };

export function init() {
    createCapsule({
        serviceConfig: config,
        detailConfig: detailConfig,
        html: capsuleHtml
    });

    // 🧱 [2025-12-17] 修复: 移除自定义定位，使用 createCapsule 的通用贴底定位
    setupStatsListener();
    setupVisibility();
}

function setupStatsListener() {
    let lastStatsUpdate = 0;
    bus.on('net:stats', (stats) => {
        const now = Date.now();
        if (now - lastStatsUpdate < 500) return;
        lastStatsUpdate = now;
        updateStats(stats);
    });
}

function setupVisibility() {
    const updateVisibility = () => {
        const app = store.getApp(config.id);
        const isOpen = app ? app.isOpen : config.isOpen;
        // 🧱 [2025-12-17] 修复: 胶囊ID应为 capsule-svc-traffic
        const el = document.getElementById(`capsule-${config.id}`);
        if (el) el.style.display = isOpen ? 'flex' : 'none';
    };

    bus.on('app:opened', ({ id }) => { if (id === config.id) updateVisibility(); });
    bus.on('app:closed', ({ id }) => { if (id === config.id) updateVisibility(); });
    updateVisibility();
}
