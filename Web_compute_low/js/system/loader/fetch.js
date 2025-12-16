/**
 * @fileoverview 应用列表获取原子
 * @description 从服务器获取应用列表，支持离线回退
 * @module system/loader/fetch
 */

import { WEB_API_URL, DEFAULT_APPS } from '../config.js';

/**
 * 获取应用列表
 * @returns {Promise<Object>} 应用列表数据
 * 
 * 🧱 [2025-12-17] 优化: 直接返回离线模式，后台静默同步
 */
export async function fetchAppsList() {
    // 立即返回离线数据，急速进界面
    const offlineData = getOfflineApps();
    
    // 后台静默同步服务器数据
    fetchAppsListBackground();
    
    return offlineData;
}

/**
 * 后台静默获取应用列表
 */
async function fetchAppsListBackground() {
    try {
        const res = await fetch(`${WEB_API_URL}/get_apps_list`);
        const data = await res.json();
        if (data && data.apps && data.apps.length > 0) {
            console.log("☁️ [后台] 应用列表已从服务器获取");
            // 可以在这里触发更新，但通常应用列表变化不大
        }
    } catch (e) {
        console.warn("☁️ [后台] 获取应用列表失败 (非致命):", e.message);
    }
}

/**
 * 获取离线应用列表
 * @returns {Object} 离线应用数据
 */
export function getOfflineApps() {
    return {
        apps: Object.values(DEFAULT_APPS),
        system_apps: [
            { id: "sys-taskbar", filename: "taskbar.js", version: "1.0.0" },
            { id: "sys-desktop", filename: "desktop.js", version: "1.0.0" },
            { id: "sys-context-menu", filename: "context_menu.js", version: "1.0.0" },
            { id: "sys-keymgr", filename: "key_manager.js", version: "1.0.0" },
            { id: "sys-appstore", filename: "app_store.js", version: "1.0.0" },
            { id: "app-login", filename: "login.js", version: "1.0.0" },
            { id: "win-companion", filename: "angel.js", version: "1.0.0" },
            { id: "svc-billing", filename: "billing.js", version: "1.0.0" },
            { id: "svc-traffic", filename: "traffic.js", version: "1.0.0" },
            { id: "svc-fps", filename: "fps.js", version: "1.0.0" }
        ],
        system_core: []
    };
}
