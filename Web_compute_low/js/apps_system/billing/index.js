/**
 * @fileoverview Billing 分子入口
 * @description 计费服务管理
 * @module apps_system/billing/index
 */

import { createCapsule } from '../../system/capsule_manager.js';
import { bus } from '../../system/event_bus.js';
import { store } from '../../system/store.js';
import { detailConfig, serviceConfig } from './config.js';
import { updateBillingDisplay, positionBillingWindow, updateCapsuleVisibility } from './render.js';

export const VERSION = '1.0.0';
export const config = serviceConfig;

export function init() {
    // 🧱 [DEBUG] 验证 detailConfig.content 存在
    console.log(`[Billing] init() 开始`);
    console.log(`[Billing] detailConfig.id: ${detailConfig.id}`);
    console.log(`[Billing] detailConfig.content 存在: ${!!detailConfig.content}`);
    console.log(`[Billing] detailConfig.content 长度: ${detailConfig.content?.length || 0}`);
    
    store.setAppMetadata(detailConfig.id, detailConfig);
    
    // 🧱 [DEBUG] 验证 setAppMetadata 后 content 是否保存
    const saved = store.getApp(detailConfig.id);
    console.log(`[Billing] setAppMetadata 后 getApp 结果:`);
    console.log(`[Billing]   - content 存在: ${!!saved?.content}`);
    console.log(`[Billing]   - content 长度: ${saved?.content?.length || 0}`);

    createCapsule({
        serviceConfig: config,
        detailConfig: detailConfig,
        html: `
            <span style="color: #fdcb6e; font-weight: bold;">$</span>
            <span id="bar-total">0.00</span>
        `
    });

    bus.on('app:opened', ({ id }) => {
        if (id === detailConfig.id) {
            setTimeout(() => positionBillingWindow(detailConfig), 0);
        }
        if (id === config.id) updateCapsuleVisibility(config);
    });

    bus.on('app:closed', ({ id }) => {
        if (id === config.id) updateCapsuleVisibility(config);
    });

    let lastStatsUpdate = 0;
    bus.on('net:stats', (stats) => {
        const now = Date.now();
        if (now - lastStatsUpdate < 500) return;
        lastStatsUpdate = now;
        updateBillingDisplay(stats);
    });

    updateCapsuleVisibility(config);
}

// 导出原子
export { detailConfig, serviceConfig } from './config.js';
export { updateBillingDisplay, positionBillingWindow, updateCapsuleVisibility } from './render.js';
