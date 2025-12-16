/**
 * @fileoverview Sync - 数据同步原子
 * @description 处理本地与服务器之间的数据同步
 * @module system/store/sync
 * 
 * 🎨 代码用途：
 *    实现 Stale-While-Revalidate 策略，优先使用本地缓存，后台静默同步。
 * 
 * 💡 易懂解释：
 *    先翻翻保险柜有没有，有就先用着，同时派人去云端看看有没有更新。📡
 * 
 * 🧱 [2025-12-17] 优化: 指数退避重试，避免频繁请求
 */

import { getItem, setItem, deleteItem } from './idb.js';
import { WEB_API_URL } from '../config.js';
import { bus } from '../event_bus.js';

/** 同步状态 */
let syncRetryCount = 0;
let syncRetryTimer = null;
const BASE_RETRY_DELAY = 2000; // 2秒起步

/**
 * 从本地和服务器同步数据
 * @param {string} userId - 用户 ID
 * @returns {Promise<{apps: Object, installedApps: Object}>}
 * 
 * 🧱 [2025-12-17] 优化: 优先加载本地缓存，急速进界面，后台静默同步
 */
export async function syncFromClientDB(userId) {
    const cacheKey = `angel_memory_bank_${userId}`;

    // 1. 优先从 IndexedDB 读取本地缓存（急速加载）
    try {
        const cachedData = await getItem(cacheKey);
        if (cachedData) {
            console.log("📂 从 IndexedDB 加载 Memorybank (急速模式)");
            
            // 后台静默同步，不阻塞界面
            syncFromServerBackground(userId, cachedData);
            
            return {
                apps: cachedData.apps || {},
                installedApps: cachedData.installedApps || {}
            };
        }
    } catch (e) {
        console.warn("⚠️ IndexedDB 读取失败:", e);
    }

    // 2. 没有本地缓存时，立即返回空数据，后台异步加载服务器数据
    console.log("🆕 首次运行，使用空 Memorybank，后台同步服务器数据");
    
    // 后台异步加载服务器数据（不阻塞）
    syncFromServerAsync(userId);
    
    return { apps: {}, installedApps: {} };
}

/**
 * 异步从服务器加载数据（不阻塞界面，指数退避重试）
 * @param {string} userId - 用户 ID
 * 
 * 🧱 [2025-12-17] 优化: 失败后指数退避重试，最多 5 次
 */
async function syncFromServerAsync(userId) {
    // 清除之前的重试定时器
    if (syncRetryTimer) {
        clearTimeout(syncRetryTimer);
        syncRetryTimer = null;
    }
    
    const cacheKey = `angel_memory_bank_${userId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const res = await fetch(`${WEB_API_URL}/load_memory?user_id=${userId}`, {
            signal: controller.signal
        });
        const data = await res.json();
        
        if (data && (Object.keys(data.apps || {}).length > 0 || Object.keys(data.installedApps || {}).length > 0)) {
            console.log("☁️ [后台] 从服务器获取到数据，正在保存...");
            await setItem(cacheKey, data);
            bus.emit('system:apps_loaded');
            syncRetryCount = 0; // 成功后重置计数
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.warn("☁️ [后台] 服务器同步失败:", e.message);
        }
        
        // 指数退避重试
        syncRetryCount++;
        const delay = BASE_RETRY_DELAY * Math.pow(2, syncRetryCount - 1);
        console.log(`☁️ [后台] 将在 ${delay / 1000}s 后重试 (第 ${syncRetryCount} 次)`);
        syncRetryTimer = setTimeout(() => syncFromServerAsync(userId), delay);
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * 从服务器同步数据
 * @param {string} userId - 用户 ID
 * @returns {Promise<{apps: Object, installedApps: Object}>}
 */
export async function syncFromServer(userId) {
    const cacheKey = `angel_memory_bank_${userId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
        const res = await fetch(`${WEB_API_URL}/load_memory?user_id=${userId}`, {
            signal: controller.signal
        });
        const data = await res.json();
        
        if (data) {
            console.log("☁️ 从服务器加载 Memorybank");
            await setItem(cacheKey, data);
            
            return {
                apps: data.apps || {},
                installedApps: data.installedApps || {}
            };
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            console.warn("⏳ 加载布局超时 (服务器响应慢)，跳过");
        } else {
            console.error("无法加载布局 (服务器不可用):", e);
        }
        console.log("🆕 使用默认空 Memorybank");
    } finally {
        clearTimeout(timeoutId);
    }

    return { apps: {}, installedApps: {} };
}

/**
 * 后台静默同步（指数退避重试）
 * @param {string} userId - 用户 ID
 * @param {Object} localData - 本地数据
 * 
 * 🧱 [2025-12-17] 优化: 失败后指数退避重试
 */
export async function syncFromServerBackground(userId, localData) {
    // 清除之前的重试定时器
    if (syncRetryTimer) {
        clearTimeout(syncRetryTimer);
        syncRetryTimer = null;
    }
    
    console.log("☁️ [后台] 开始同步云端数据...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const res = await fetch(`${WEB_API_URL}/load_memory?user_id=${userId}`, {
            signal: controller.signal
        });
        const data = await res.json();
        
        if (data) {
            console.log("☁️ [后台] 云端数据已获取，正在合并...");
            let hasChanges = false;
            const merged = { ...localData };

            // 合并 installedApps
            if (data.installedApps) {
                merged.installedApps = merged.installedApps || {};
                Object.keys(data.installedApps).forEach(id => {
                    if (!merged.installedApps[id]) {
                        merged.installedApps[id] = data.installedApps[id];
                        hasChanges = true;
                    }
                });
            }

            // 合并 apps（只补充缺失项）
            if (data.apps) {
                merged.apps = merged.apps || {};
                Object.keys(data.apps).forEach(id => {
                    if (!merged.apps[id]) {
                        merged.apps[id] = data.apps[id];
                        hasChanges = true;
                        console.log(`☁️ [后台] 同步新增应用: ${id}`);
                    }
                });
            }

            if (hasChanges) {
                const cacheKey = `angel_memory_bank_${userId}`;
                await setItem(cacheKey, merged);
                console.log("☁️ [后台] 数据合并完成，已保存到 IndexedDB");
                bus.emit('system:apps_loaded');
            } else {
                console.log("☁️ [后台] 本地已是最新，无需更新");
            }
            syncRetryCount = 0; // 成功后重置计数
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.warn("☁️ [后台] 云端同步失败:", e.message);
        }
        
        // 指数退避重试
        syncRetryCount++;
        const delay = BASE_RETRY_DELAY * Math.pow(2, syncRetryCount - 1);
        console.log(`☁️ [后台] 将在 ${delay / 1000}s 后重试 (第 ${syncRetryCount} 次)`);
        syncRetryTimer = setTimeout(() => syncFromServerBackground(userId, localData), delay);
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * 保存数据到本地和服务器
 * @param {string} userId - 用户 ID
 * @param {Object} data - 要保存的数据
 */
export async function syncToServer(userId, data) {
    const cacheKey = `angel_memory_bank_${userId}`;

    // 1. 保存到 IndexedDB
    await setItem(cacheKey, data);

    // 2. 异步发送到服务器
    fetch(`${WEB_API_URL}/save_memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, data })
    }).catch(e => console.warn("☁️ 云端同步失败 (非致命):", e));
}

/**
 * 重置数据（仅清理本地缓存）
 * @param {string} userId - 用户 ID
 * 
 * 🧱 [2025-12-17] 修复: 只清理本地缓存，不清理服务端数据（危险操作）
 */
export async function resetData(userId) {
    const cacheKey = `angel_memory_bank_${userId}`;
    
    // 1. 清空 IndexedDB 永久缓存
    await deleteItem(cacheKey);
    console.log("✅ 已清空 IndexedDB 永久缓存");
    
    // 2. 清空 localStorage 临时缓存（全部清空）
    localStorage.clear();
    console.log("✅ 已清空 localStorage 临时缓存");
    
    // 注意：不清理服务端数据，刷新后会从服务器重新同步
}
