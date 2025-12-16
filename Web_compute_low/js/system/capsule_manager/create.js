/**
 * @fileoverview 胶囊创建原子
 * @description 处理胶囊 DOM 的创建和初始化
 * @module system/capsule_manager/create
 */

import { bus } from '../event_bus.js';
import { store } from '../store.js';
import { enableDrag } from './drag.js';

/**
 * 创建并注册一个系统胶囊
 * @param {Object} options - 配置选项
 * @returns {HTMLElement} 创建的胶囊 DOM 元素
 * 
 * 🧱 [2025-12-17] 修复: 添加详细调试日志
 */
export function createCapsule(options) {
    const {
        serviceConfig,
        detailConfig,
        html,
        onMount,
        onClick
    } = options;

    console.log(`[Capsule] 创建胶囊: ${serviceConfig.id}`);
    console.log(`[Capsule] detailConfig:`, detailConfig ? { id: detailConfig.id, hasContent: !!detailConfig.content } : null);

    // 1. 注册详情窗口
    if (detailConfig) {
        detailConfig.showTaskbarIcon = false;
        detailConfig.skipTaskbar = true;
        detailConfig.showTrayIcon = false;
        detailConfig.hideInTaskMgr = true;
        
        console.log(`[Capsule] 注册详情窗口: ${detailConfig.id}, content长度: ${detailConfig.content?.length || 0}`);
        store.setAppMetadata(detailConfig.id, detailConfig);
        
        // 验证注册是否成功
        const registered = store.getApp(detailConfig.id);
        console.log(`[Capsule] 验证注册: ${detailConfig.id}, hasContent: ${!!registered?.content}`);
    }

    // 2. 创建胶囊 DOM
    const container = document.getElementById('taskbar-status');
    if (!container) {
        console.warn('CapsuleManager: 找不到 #taskbar-status 容器');
        return;
    }

    const el = document.createElement('div');
    el.id = `capsule-${serviceConfig.id}`;
    el.className = 'status-capsule';
    el.title = serviceConfig.description || serviceConfig.name;

    // 初始可见性
    const appState = store.getApp(serviceConfig.id);
    const isOpen = appState ? appState.isOpen : serviceConfig.isOpen;
    el.style.display = isOpen ? 'flex' : 'none';

    // 恢复保存的位置
    if (appState && appState.capsuleOffsetX) {
        el.style.transform = `translateX(${appState.capsuleOffsetX}px)`;
    }

    // 填充内容
    if (html) el.innerHTML = html;

    // 插入 DOM
    const tray = document.getElementById('tray-icons');
    const clock = document.getElementById('clock-time');
    const ref = tray || clock;
    if (ref) container.insertBefore(el, ref);
    else container.appendChild(el);

    // 3. 启用拖拽
    const match = el.style.transform.match(/translateX\(([-0-9.]+)px\)/);
    const initialOffset = match ? parseFloat(match[1]) : 0;
    enableDrag(el, initialOffset);

    // 4. 绑定点击事件
    // 🧱 [2025-12-17] 修复: 添加调试日志，确保点击事件正确触发
    el.addEventListener('click', (e) => {
        console.log(`[Capsule] 点击胶囊: ${serviceConfig.id}`);
        
        if (typeof onClick === 'function') {
            onClick(e, el);
            return;
        }

        // 默认行为：切换详情窗口
        if (detailConfig) {
            const wm = window.wm;
            if (!wm) {
                console.warn('[Capsule] window.wm 不存在');
                return;
            }

            const appId = detailConfig.id;
            const app = store.getApp(appId);
            console.log(`[Capsule] 详情窗口 ${appId}, isOpen: ${app?.isOpen}`);

            if (app && app.isOpen) {
                console.log(`[Capsule] 关闭窗口: ${appId}`);
                wm.closeApp(appId);
            } else {
                console.log(`[Capsule] 打开窗口: ${appId}`);
                wm.openApp(appId, false);
                // 🧱 [2025-12-17] 修复: 使用 bottom 定位，以底为原点
                setTimeout(() => {
                    const win = document.getElementById(appId);
                    if (win) {
                        const cRect = el.getBoundingClientRect();
                        const taskbar = document.getElementById('taskbar');
                        const taskbarHeight = taskbar ? taskbar.offsetHeight : 48;
                        const winWidth = detailConfig.width || 200;

                        let left = cRect.left + (cRect.width / 2) - (winWidth / 2);

                        if (left < 0) left = 10;
                        if (left + winWidth > window.innerWidth) left = window.innerWidth - winWidth - 10;

                        // 使用 bottom 定位，贴底任务栏
                        win.style.left = `${left}px`;
                        win.style.top = 'auto';
                        win.style.bottom = `${taskbarHeight + 10}px`;
                        wm.bringToFront(appId);
                    }
                }, 0);
            }
        }
    });

    // 5. 监听服务状态
    const updateVisibility = (id, isOpen) => {
        if (id === serviceConfig.id) {
            el.style.display = isOpen ? 'flex' : 'none';
            if (!isOpen && detailConfig) {
                const wm = window.wm;
                if (wm) wm.closeApp(detailConfig.id);
            }
        }
    };

    bus.on('app:opened', (data) => updateVisibility(data.id, true));
    bus.on('app:closed', (data) => updateVisibility(data.id, false));

    // 6. 执行挂载回调
    if (typeof onMount === 'function') {
        onMount(el);
    }

    return el;
}
