/**
 * @fileoverview Close - 关闭窗口原子
 * @description 处理应用关闭和销毁逻辑
 * @module system/window_manager/close
 */

import { store } from '../store.js';
import { bus } from '../event_bus.js';
import { pm } from '../process_manager.js';
import { resourceManager } from '../resource_registry.js';
import { openApp } from './open.js';

/**
 * 关闭应用
 * @param {string} id - 应用 ID
 */
export function closeApp(id) {
    const app = store.getApp(id);
    
    // 系统应用关闭后自动重启
    if (app && app.isSystem) {
        console.log(`[WindowManager] 系统应用 ${id} 被关闭，正在重启...`);
        killApp(id);
        setTimeout(() => openApp(id, false), 1000);
        return;
    }

    killApp(id);
}

/**
 * 终止应用（彻底销毁）
 * @param {string} id - 应用 ID
 */
export function killApp(id) {
    const win = document.getElementById(id);
    if (win) {
        win.remove();
    }

    store.updateApp(id, { isOpen: false });
    
    // 发送关闭信号
    bus.emit(`app:closed:${id}`);
    bus.emit('app:closed', { id });
    bus.emit('app:destroyed', id);

    // 清理资源注册表
    resourceManager.cleanup(id);

    // 清理进程资源
    pm.kill(id);
}

/**
 * 最小化应用
 * @param {string} id - 应用 ID
 * @param {Object} state - 窗口管理器状态
 */
export function minimizeApp(id, state = {}) {
    const win = document.getElementById(id);
    if (win) {
        win.classList.add('minimized');
        store.updateApp(id, { isMinimized: true });
        
        if (state.activeWindowId === id) {
            state.activeWindowId = null;
            bus.emit('window:blur', { id });
        }
        bus.emit('app:minimized', { id });
    }
}

/**
 * 恢复应用
 * @param {string} id - 应用 ID
 */
export function restoreApp(id) {
    const win = document.getElementById(id);
    if (win) {
        win.classList.remove('minimized');
        store.updateApp(id, { isMinimized: false });
    }
}
