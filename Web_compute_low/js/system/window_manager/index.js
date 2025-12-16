/**
 * @fileoverview WindowManager 分子入口
 * @description 组合所有窗口管理原子，提供统一接口
 * @module system/window_manager/index
 */

import { store } from '../store.js';
import { contextMenuApp } from '../../apps_system/context_menu.js';

// 导入原子
import { createWindow } from './create.js';
import { openApp } from './open.js';
import { closeApp, killApp, minimizeApp, restoreApp } from './close.js';
import { dragState, startDrag, handleMouseMove, handleMouseUp, checkDraggable } from './drag.js';
import { bringToFront, handleWindowClick, getActiveWindowId, setActiveWindowId, getZIndexCounter } from './focus.js';
import { loadWallpaper, changeWallpaper } from './wallpaper.js';
import { restoreAllWindows } from './state.js';
import { showRenameInput } from './rename.js';

export const VERSION = '1.0.0';

/**
 * 窗口管理器类
 */
export class WindowManager {
    constructor() {
        this.dragState = dragState;
        this.handleMouseMove = handleMouseMove.bind(this);
        this.handleMouseUp = handleMouseUp.bind(this);
        this.handleWindowClick = handleWindowClick.bind(this);
    }

    get zIndexCounter() { return getZIndexCounter(); }
    get activeWindowId() { return getActiveWindowId(); }
    set activeWindowId(id) { setActiveWindowId(id); }

    init() {
        loadWallpaper();
        
        // 懒加载：只创建打开状态的窗口
        Object.entries(store.apps).forEach(([id, app]) => {
            if (app.isOpen) this.createWindow(id, app);
        });

        restoreAllWindows((id, speak) => this.openApp(id, speak));
        this.setupGlobalEvents();
        window.wm = this;
    }

    createWindow(id, app) { return createWindow(id, app); }
    loadWallpaper() { loadWallpaper(); }
    changeWallpaper(url, el) { changeWallpaper(url, el); }
    showRenameInput(icon, id, app) { showRenameInput(icon, id, app); }

    setupGlobalEvents() {
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('dblclick', (e) => this.handleDblClick(e));
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    }

    handleMouseDown(e) {
        const target = e.target;
        const win = target.closest('.window');
        
        if (win) handleWindowClick(win);

        if (target.closest('.close-btn')) {
            if (win) this.closeApp(win.id);
        } else if (target.closest('.min-btn')) {
            const w = target.closest('.window');
            if (w) this.minimizeApp(w.id);
        } else {
            // 🧱 [2025-12-17] 修复: 桌面图标不再提前 return，允许拖动
            const taskApp = target.closest('.task-app');
            if (taskApp) { this.toggleApp(taskApp.dataset.id); return; }

            if (!target.closest('.desktop-icon')) {
                this.closeCapsuleWindows(target);
            }
        }

        const draggable = checkDraggable(e, target);
        if (draggable) {
            startDrag(e, draggable.item, draggable.type);
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
        }
    }

    closeCapsuleWindows(target) {
        // 🧱 [2025-12-17] 修复: 移除 win-fps，因为 FPS 胶囊没有详情窗口
        const capsuleWindows = ['win-traffic', 'win-billing'];
        capsuleWindows.forEach(id => {
            const w = document.getElementById(id);
            if (w && w.classList.contains('open')) {
                if (w.contains(target)) return;
                const serviceId = id.replace('win-', 'svc-');
                const capsule = document.getElementById(`capsule-${serviceId}`);
                if (capsule && capsule.contains(target)) return;
                this.closeApp(id);
            }
        });
    }

    handleDblClick(e) {
        const icon = e.target.closest('.desktop-icon');
        if (icon) this.openApp(icon.dataset.id);
    }

    handleContextMenu(e) {
        const icon = e.target.closest('.desktop-icon');
        if (icon) {
            e.preventDefault();
            const id = icon.dataset.id;
            const app = store.getApp(id);
            
            contextMenuApp.show(e.clientX, e.clientY, [
                { label: '打开', icon: '🚀', action: () => this.openApp(id) },
                { label: '重命名', icon: '✏️', action: () => this.showRenameInput(icon, id, app) }
            ]);
        }
    }

    openApp(id, speak = true) { openApp(id, speak); }
    closeApp(id) { closeApp(id); }
    killApp(id) { killApp(id); }
    minimizeApp(id) { minimizeApp(id, { activeWindowId: this.activeWindowId }); }
    restoreApp(id) { restoreApp(id); }
    bringToFront(id) { bringToFront(id); }

    toggleApp(id) {
        const app = store.getApp(id);
        const win = document.getElementById(id);
        const isOpen = app ? app.isOpen : (win && win.classList.contains('open'));
        const isMinimized = app ? app.isMinimized : (win && win.classList.contains('minimized'));

        if (!isOpen) {
            this.openApp(id);
        } else if (isMinimized) {
            this.restoreApp(id);
            this.bringToFront(id);
        } else {
            if (getActiveWindowId() === id) {
                this.minimizeApp(id);
            } else {
                this.bringToFront(id);
            }
        }
    }
}

export const wm = new WindowManager();

// 导出原子
export { createWindow, openApp, closeApp, killApp, minimizeApp, restoreApp };
export { bringToFront, handleWindowClick };
export { loadWallpaper, changeWallpaper };
export { dragState, startDrag, handleMouseMove, handleMouseUp };
