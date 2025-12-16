/**
 * @fileoverview AppStore 分子入口
 * @description 组合所有应用商店原子，提供统一接口
 * @module apps_system/app_store/index
 */

import { store } from '../../system/store.js';
import { bus } from '../../system/event_bus.js';
import { WEB_API_URL, DEFAULT_APPS } from '../../system/config.js';
import { renderAvailableApps, renderInstalledApps, renderCleanup } from './render.js';
import { installApp, uninstallApp, openApp, cleanInvalidApps, clearAllCache, syncWithServer } from './actions.js';

export const VERSION = '1.0.0';

export const config = {
    id: 'sys-appstore',
    name: '应用商店',
    version: '1.0.0',
    description: '发现和安装新应用',
    icon: 'M18 4h-4V2H6v2H2v16h16V4zm-6 0v2h4V4h-4zM4 18V6h12v12H4zm2-10h8v2H6V8zm0 4h8v2H6v-2z',
    color: '#00b894',
    type: 'service',
    isSystem: true,
    showDesktopIcon: false,
    showTaskbarIcon: false,
    width: 600,
    height: 500,
    content: `
        <div id="app-store-container" style="padding: 20px; height: 100%; overflow-y: auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <h2 style="color: white; margin: 0 0 20px 0; font-size: 24px;">🛒 应用商店</h2>
            
            <div id="store-tabs" style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="store-tab active" data-tab="available" style="padding: 8px 16px; border: none; border-radius: 20px; background: white; cursor: pointer;">可安装</button>
                <button class="store-tab" data-tab="installed" style="padding: 8px 16px; border: none; border-radius: 20px; background: rgba(255,255,255,0.3); color: white; cursor: pointer;">已安装</button>
                <button class="store-tab" data-tab="cleanup" style="padding: 8px 16px; border: none; border-radius: 20px; background: rgba(255,255,255,0.3); color: white; cursor: pointer;">清理数据</button>
            </div>
            
            <div id="store-content" style="background: rgba(255,255,255,0.95); border-radius: 12px; padding: 15px; min-height: 300px;">
                <div id="app-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;"></div>
            </div>
            
            <div id="store-status" style="color: white; margin-top: 15px; font-size: 12px; opacity: 0.8;"></div>
        </div>
        <style>
            #sys-appstore .store-tab:hover { opacity: 0.9; }
            #sys-appstore .store-tab.active { background: white !important; color: #667eea !important; }
            #sys-appstore .app-card { background: white; border-radius: 12px; padding: 15px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
            #sys-appstore .app-card:hover { transform: translateY(-3px); box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
            #sys-appstore .app-icon { width: 48px; height: 48px; margin: 0 auto 10px; }
            #sys-appstore .app-name { font-weight: bold; margin-bottom: 5px; font-size: 14px; }
            #sys-appstore .app-btn { padding: 6px 12px; border: none; border-radius: 15px; cursor: pointer; font-size: 12px; margin-top: 8px; }
            #sys-appstore .btn-install { background: #00b894; color: white; }
            #sys-appstore .btn-uninstall { background: #e74c3c; color: white; }
            #sys-appstore .btn-open { background: #3498db; color: white; }
        </style>
    `
};

class AppStoreApp {
    constructor() {
        this.id = config.id;
        this.availableApps = [];
        this.currentTab = 'available';
        
        bus.on(`app:ready:${this.id}`, () => this.init());
    }

    async init() {
        console.log('[AppStore] 初始化应用商店...');
        await this.fetchAvailableApps();
        this.bindTabEvents();
        this.renderTab(this.currentTab);
        this.updateStatus('应用商店已就绪');
    }

    async fetchAvailableApps() {
        try {
            const res = await fetch(`${WEB_API_URL}/get_apps_list`);
            const data = await res.json();
            this.availableApps = data.apps || [];
            console.log(`[AppStore] 获取到 ${this.availableApps.length} 个可用应用`);
            return this.availableApps.length;
        } catch (e) {
            console.warn('[AppStore] 无法从服务器获取应用列表，使用本地默认列表');
            this.availableApps = Object.values(DEFAULT_APPS);
            return this.availableApps.length;
        }
    }

    bindTabEvents() {
        const tabs = document.querySelectorAll('#sys-appstore .store-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'rgba(255,255,255,0.3)';
                    t.style.color = 'white';
                });
                tab.classList.add('active');
                tab.style.background = 'white';
                tab.style.color = '#667eea';
                
                this.currentTab = tab.dataset.tab;
                this.renderTab(this.currentTab);
            });
        });
    }

    renderTab(tab) {
        const container = document.getElementById('app-list');
        if (!container) return;

        switch (tab) {
            case 'available':
                renderAvailableApps(container, this.availableApps, this.updateStatus);
                break;
            case 'installed':
                renderInstalledApps(container, this.updateStatus);
                break;
            case 'cleanup':
                renderCleanup(container);
                break;
        }
    }

    installApp(id) {
        installApp(id, this.availableApps, this.updateStatus, () => this.renderTab(this.currentTab));
    }

    uninstallApp(id) {
        uninstallApp(id, this.updateStatus, () => this.renderTab(this.currentTab));
    }

    openApp(id) {
        openApp(id);
    }

    cleanInvalidApps() {
        cleanInvalidApps(this.availableApps, this.updateStatus);
    }

    clearAllCache() {
        clearAllCache(this.updateStatus);
    }

    async syncWithServer() {
        await syncWithServer(() => this.fetchAvailableApps(), this.updateStatus);
    }

    updateStatus(msg) {
        const status = document.getElementById('store-status');
        if (status) status.innerText = msg;
    }
}

export const appStoreApp = new AppStoreApp();
window.appStoreApp = appStoreApp;

export function init() {
    console.log('[AppStore] 应用商店模块已加载');
}

// 导出原子
export { renderAvailableApps, renderInstalledApps, renderCleanup } from './render.js';
export { installApp, uninstallApp, openApp, cleanInvalidApps, clearAllCache, syncWithServer } from './actions.js';
