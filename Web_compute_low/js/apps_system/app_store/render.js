/**
 * @fileoverview 应用商店渲染原子
 * @description 处理应用列表的渲染逻辑
 * @module apps_system/app_store/render
 */

import { store } from '../../system/store.js';

const DEFAULT_ICON = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';

/**
 * 渲染可安装应用列表
 */
export function renderAvailableApps(container, availableApps, updateStatus) {
    const installedIds = new Set(Object.keys(store.installedApps));
    
    container.innerHTML = availableApps.map(app => {
        const isInstalled = installedIds.has(app.id);
        const icon = (app.icon && app.icon.startsWith('M')) ? app.icon : DEFAULT_ICON;
        return `
            <div class="app-card" data-id="${app.id}">
                <svg class="app-icon" viewBox="0 0 24 24" fill="${app.color || '#666'}">
                    <path d="${icon}"/>
                </svg>
                <div class="app-name">${app.name || app.id}</div>
                <div style="font-size: 11px; color: #888;">v${app.version || '1.0.0'}</div>
                ${isInstalled 
                    ? '<button class="app-btn btn-open" onclick="appStoreApp.openApp(\'' + app.id + '\')">打开</button>'
                    : '<button class="app-btn btn-install" onclick="appStoreApp.installApp(\'' + app.id + '\')">安装</button>'
                }
            </div>
        `;
    }).join('');
    
    updateStatus(`共 ${availableApps.length} 个应用可用`);
}

/**
 * 渲染已安装应用列表
 */
export function renderInstalledApps(container, updateStatus) {
    const installedApps = Object.entries(store.installedApps);
    
    if (installedApps.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">暂无已安装的应用</div>';
        return;
    }
    
    container.innerHTML = installedApps.map(([id, app]) => {
        const isSystem = id.startsWith('sys-') || id.startsWith('svc-') || id.startsWith('app-');
        const icon = (app.icon && app.icon.startsWith('M')) ? app.icon : DEFAULT_ICON;
        return `
            <div class="app-card" data-id="${id}">
                <svg class="app-icon" viewBox="0 0 24 24" fill="${app.color || '#666'}">
                    <path d="${icon}"/>
                </svg>
                <div class="app-name">${app.name || id}</div>
                <div style="font-size: 11px; color: #888;">${isSystem ? '系统应用' : '用户应用'}</div>
                <button class="app-btn btn-open" onclick="appStoreApp.openApp('${id}')">打开</button>
                ${!isSystem ? '<button class="app-btn btn-uninstall" onclick="appStoreApp.uninstallApp(\'' + id + '\')">卸载</button>' : ''}
            </div>
        `;
    }).join('');
    
    updateStatus(`已安装 ${installedApps.length} 个应用`);
}

/**
 * 渲染清理页面
 */
export function renderCleanup(container) {
    container.innerHTML = `
        <div style="padding: 20px;">
            <h3 style="margin: 0 0 15px 0;">🧹 数据清理</h3>
            <p style="color: #666; margin-bottom: 20px;">清理无效的缓存数据，释放存储空间。</p>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="app-btn" style="background: #f39c12; color: white; padding: 12px;" onclick="appStoreApp.cleanInvalidApps()">
                    🗑️ 清理无效应用数据
                </button>
                <button class="app-btn" style="background: #e74c3c; color: white; padding: 12px;" onclick="appStoreApp.clearAllCache()">
                    ⚠️ 清除所有缓存 (重置系统)
                </button>
                <button class="app-btn" style="background: #3498db; color: white; padding: 12px;" onclick="appStoreApp.syncWithServer()">
                    🔄 与服务器同步
                </button>
            </div>
            
            <div id="cleanup-log" style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 8px; font-size: 12px; max-height: 150px; overflow-y: auto;">
                点击上方按钮开始清理...
            </div>
        </div>
    `;
}
