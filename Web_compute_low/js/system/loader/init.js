/**
 * @fileoverview 系统初始化原子
 * @description 处理系统启动流程
 * @module system/loader/init
 */

import { bus } from '../event_bus.js';
import { wm } from '../window_manager.js';
import { store } from '../store.js';
import { DEFAULT_APPS } from '../config.js';
import { fetchAppsList, getOfflineApps } from './fetch.js';
import { loadApp, checkUpdate } from './apps.js';
import { setupBusinessLogic } from './business.js';

/**
 * 系统初始化
 */
export async function initSystem() {
    // 等待 Store 初始化完成
    await store.ready();

    try {
        // 1. 获取应用列表
        let appsData = await fetchAppsList();
        let { apps, system_apps, system_core } = appsData;
        
        console.log(`[Loader] Fetched apps: ${apps.length}, system_apps: ${system_apps.length}`);
        
        // 如果服务器返回空数据，使用本地默认配置
        if (apps.length === 0 && system_apps.length === 0) {
            console.warn("⚠️ 服务器返回空数据，使用本地默认配置");
            const offline = getOfflineApps();
            apps = offline.apps;
            system_apps = offline.system_apps;
        }

        // 2. 加载系统应用
        console.log("🔄 开始加载系统应用...");
        const systemModules = (await Promise.all(
            system_apps.map(async f => {
                console.log(`🔄 [System] Loading ${f.id}...`);
                const mod = await loadApp(`../../apps_system/${f.filename}`, true);
                if (mod) console.log(`✅ [System] Loaded ${f.id}`);
                return mod;
            })
        )).filter(Boolean);

        // 3. 检测首次运行
        const isFirstRun = Object.keys(store.installedApps).length === 0;
        if (isFirstRun) {
            console.log("✨ 检测到首次运行，正在执行默认全安装...");
        }

        // 4. 注册用户应用到懒加载列表
        apps.forEach(app => {
            if (app.id && app.filename) {
                const defaultApp = DEFAULT_APPS[app.id];
                if (defaultApp) {
                    if (!app.icon) app.icon = defaultApp.icon;
                    if (!app.color) app.color = defaultApp.color;
                    if (!app.name) app.name = defaultApp.name;
                }

                const cached = store.installedApps[app.id];
                if (cached) {
                    if (!cached.icon && defaultApp) cached.icon = defaultApp.icon;
                    if (!cached.color && defaultApp) cached.color = defaultApp.color;
                    if (!cached.icon && app.icon) cached.icon = app.icon;
                    if (!cached.color && app.color) cached.color = app.color;
                }

                if (isFirstRun || checkUpdate(app, cached)) {
                    if (!isFirstRun) {
                        console.log(`[Loader] 更新应用元数据: ${app.id}`);
                    }
                    store.registerLazyApp(app.id, `../../apps/${app.filename}`, app);
                } else {
                    store.registerLazyApp(app.id, `../../apps/${app.filename}`, cached);
                }
            }
        });

        store.save();

        // 5. 加载已打开的用户应用
        const pendingLoads = [];
        Object.entries(store.apps).forEach(([id, appState]) => {
            if (appState.isOpen && !appState.isSystem) {
                const path = store.getLazyAppPath(id);
                if (path) pendingLoads.push(loadApp(path, false));
            }
        });

        const loadedUserModules = (await Promise.all(pendingLoads)).filter(Boolean);
        const allModules = [...systemModules, ...loadedUserModules];

        console.log(`应用加载完成: 系统应用 ${systemModules.length} 个, 用户应用 ${loadedUserModules.length} 个`);

        // 6. 注入元数据并初始化
        allModules.forEach((module) => {
            const { id, config, isSystem } = module;
            config.isSystem = isSystem;
            store.setAppMetadata(id, config);

            if (typeof module.init === 'function') {
                console.log(`初始化应用逻辑: ${id}`);
                module.init();
            }
        });

        // 7. 清理僵尸数据
        const validIds = new Set();
        allModules.forEach(m => {
            validIds.add(m.id);
            if (m.config && m.config.relatedApps) {
                m.config.relatedApps.forEach(id => validIds.add(id));
            }
        });
        apps.forEach(app => {
            if (app.id) validIds.add(app.id);
        });
        store.prune(Array.from(validIds));

        // 8. 启动窗口管理器
        wm.init();
        setupBusinessLogic();

        // 9. 启动系统级应用
        systemModules.forEach(({ id }) => {
            if (id === 'app-login') return;
            wm.openApp(id, false);
        });

        // 10. 通知桌面刷新
        bus.emit('system:apps_loaded');

    } catch (err) {
        console.error("初始化失败:", err);
        wm.init();
        setupBusinessLogic();
    }
}
