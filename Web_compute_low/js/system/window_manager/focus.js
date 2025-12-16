/**
 * @fileoverview Focus - 焦点管理原子
 * @description 处理窗口焦点和层级
 * @module system/window_manager/focus
 */

import { store } from '../store.js';
import { bus } from '../event_bus.js';

/** @type {number} 窗口层级计数器 */
let zIndexCounter = 100;

/** @type {string|null} 当前激活的窗口 ID */
let activeWindowId = null;

/**
 * 获取当前激活窗口 ID
 * @returns {string|null}
 */
export function getActiveWindowId() {
    return activeWindowId;
}

/**
 * 设置当前激活窗口 ID
 * @param {string|null} id
 */
export function setActiveWindowId(id) {
    activeWindowId = id;
}

/**
 * 窗口置顶
 * @param {string} id - 应用 ID
 */
export function bringToFront(id) {
    const win = document.getElementById(id);
    if (win) {
        zIndexCounter++;
        win.style.zIndex = zIndexCounter;
        activeWindowId = id;
        
        store.updateApp(id, { zIndex: zIndexCounter });
        bus.emit('window:focus', { id });
    }
}

/**
 * 处理窗口点击
 * @param {HTMLElement} win - 窗口元素
 */
export function handleWindowClick(win) {
    const id = win.id;
    if (activeWindowId !== id) {
        bringToFront(id);
    }
}

/**
 * 获取当前层级计数
 * @returns {number}
 */
export function getZIndexCounter() {
    return zIndexCounter;
}
