/**
 * @fileoverview 应用商店操作原子
 * @description 处理安装、卸载、清理等操作
 * @module apps_system/app_store/actions
 */

import { store } from '../../system/store.js';
import { bus } from '../../system/event_bus.js';

/**
 * 安装应用
 */
export function installApp(id, availableApps, updateStatus, renderCallback) {
    const app = availableApps.find(a => a.id === id);
    if (!app) {
        updateStatus('❌ 找不到应用');
        return;
    }
    
    store.registerLazyApp(id, `../apps/${app.filename}`, app);
    store.save();
    bus.emit('system:apps_loaded');
    
    updateStatus(`✅ ${app.name} 已安装`);
    renderCallback();
}

/**
 * 卸载应用
 */
export function uninstallApp(id, updateStatus, renderCallback) {
    if (confirm(`确定要卸载 ${id} 吗？`)) {
        if (window.wm) {
            window.wm.closeApp(id);
        }
        
        delete store.installedApps[id];
        delete store.apps[id];
        delete store.lazyRegistry[id];
        store.save();
        bus.emit('system:apps_loaded');
        
        updateStatus(`✅ ${id} 已卸载`);
        renderCallback();
    }
}

/**
 * 打开应用
 */
export function openApp(id) {
    if (window.wm) {
        window.wm.openApp(id);
    }
}

/**
 * 清理无效应用数据
 */
export function cleanInvalidApps(availableApps, updateStatus) {
    const log = document.getElementById('cleanup-log');
    if (!log) return;
    
    log.innerHTML = '🔍 开始扫描无效数据...<br>';
    
    const validIds = new Set(availableApps.map(a => a.id));
    ['sys-taskbar', 'sys-desktop', 'sys-context-menu', 'sys-keymgr', 'sys-appstore',
     'app-login', 'win-companion', 'svc-billing', 'svc-traffic', 'svc-fps'].forEach(id => validIds.add(id));
    
    let cleanedCount = 0;
    
    Object.keys(store.apps).forEach(id => {
        if (!validIds.has(id)) {
            log.innerHTML += `🗑️ 清理无效应用状态: ${id}<br>`;
            delete store.apps[id];
            cleanedCount++;
        }
    });
    
    Object.keys(store.installedApps).forEach(id => {
        if (!validIds.has(id)) {
            log.innerHTML += `🗑️ 清理无效安装记录: ${id}<br>`;
            delete store.installedApps[id];
            cleanedCount++;
        }
    });
    
    Object.keys(store.lazyRegistry).forEach(id => {
        if (!validIds.has(id)) {
            log.innerHTML += `🗑️ 清理无效懒加载记录: ${id}<br>`;
            delete store.lazyRegistry[id];
            cleanedCount++;
        }
    });
    
    store.save();
    
    log.innerHTML += `<br>✅ 清理完成！共清理 ${cleanedCount} 条无效数据`;
    updateStatus(`清理完成，共清理 ${cleanedCount} 条数据`);
}

/**
 * 清除所有缓存
 * 
 * 🧱 [2025-12-17] 修复: store.reset() 会清理 IndexedDB + localStorage
 */
export async function clearAllCache(updateStatus) {
    if (confirm('⚠️ 确定要清除所有缓存吗？这将重置系统到初始状态。')) {
        updateStatus('🔄 正在清除缓存...');
        
        // store.reset() 会清理 IndexedDB 永久缓存 + localStorage 临时缓存
        await store.reset();
        
        updateStatus('✅ 缓存已清除，正在刷新页面...');
        setTimeout(() => location.reload(), 1000);
    }
}

/**
 * 与服务器同步
 */
export async function syncWithServer(fetchAppsCallback, updateStatus) {
    const log = document.getElementById('cleanup-log');
    if (!log) return;
    
    log.innerHTML = '🔄 正在与服务器同步...<br>';
    
    try {
        const count = await fetchAppsCallback();
        log.innerHTML += `✅ 获取到 ${count} 个应用<br>`;
        
        await store.save();
        log.innerHTML += '✅ 数据已同步到服务器<br>';
        
        bus.emit('system:apps_loaded');
        log.innerHTML += '✅ 桌面已刷新<br>';
        
        updateStatus('同步完成');
    } catch (e) {
        log.innerHTML += `❌ 同步失败: ${e.message}<br>`;
        updateStatus('同步失败');
    }
}
