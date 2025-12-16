/**
 * @fileoverview Loader 分子入口
 * @description 组合所有 loader 原子，提供系统启动接口
 * @module system/loader/index
 */

import { initSystem } from './init.js';
import { setupUIBindings, startClock, exposeDebugFunctions } from './ui.js';
import { setupBusinessLogic } from './business.js';
import { fetchAppsList, getOfflineApps } from './fetch.js';
import { loadApp, checkUpdate } from './apps.js';
import { store } from '../store.js';

export const VERSION = '1.0.0';

// 系统启动入口
window.onload = async () => {
    await initSystem();
    setupUIBindings();
    startClock();
    exposeDebugFunctions();
};

// 🧱 [2025-12-17] 修复: 页面关闭前强制保存数据，确保窗口位置等状态不丢失
window.addEventListener('beforeunload', () => {
    store.saveNow();
});

// 页面隐藏时也保存（移动端切换应用）
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        store.saveNow();
    }
});

// 导出原子
export { initSystem };
export { setupUIBindings, startClock, exposeDebugFunctions };
export { setupBusinessLogic };
export { fetchAppsList, getOfflineApps };
export { loadApp, checkUpdate };
