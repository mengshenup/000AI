/**
 * @fileoverview WindowManager 状态原子
 * @description 窗口状态恢复和位置管理
 * @module system/window_manager/state
 */

import { store } from '../store.js';

/**
 * 恢复窗口位置
 * @param {string} id - 窗口 ID
 * @param {HTMLElement} win - 窗口元素
 * @param {Object} app - 应用配置
 */
export function restoreWindowPosition(id, win, app) {
    const pos = app.winPos || app.pos || { x: 100, y: 100 };
    
    if (app.fixed) {
        applyFixedPosition(win, pos);
    } else {
        applyNormalPosition(win, pos);
    }
}

function applyFixedPosition(win, pos) {
    if (pos.right !== undefined) {
        win.style.right = `${pos.right}px`;
        win.style.left = 'auto';
    }
    if (pos.bottom !== undefined) {
        win.style.bottom = `${pos.bottom}px`;
        win.style.top = 'auto';
    }
    if (pos.right === undefined && pos.bottom === undefined) {
        win.style.left = `${isNaN(pos.x) ? 100 : pos.x}px`;
        win.style.top = `${isNaN(pos.y) ? 100 : pos.y}px`;
    }
}

function applyNormalPosition(win, pos) {
    if (pos.right !== undefined) {
        win.style.right = `${pos.right}px`;
        win.style.left = 'auto';
    } else {
        win.style.left = `${isNaN(pos.x) ? 100 : pos.x}px`;
        win.style.right = 'auto';
    }
    if (pos.bottom !== undefined) {
        win.style.bottom = `${pos.bottom}px`;
        win.style.top = 'auto';
    } else {
        win.style.top = `${isNaN(pos.y) ? 100 : pos.y}px`;
        win.style.bottom = 'auto';
    }
}

/**
 * 恢复所有窗口
 * @param {Function} openApp - 打开应用函数
 */
export function restoreAllWindows(openApp) {
    Object.entries(store.apps).forEach(([id, app]) => {
        const win = document.getElementById(id);
        if (win) {
            restoreWindowPosition(id, win, app);
            if (app.isOpen) openApp(id, false);
        }
    });
}
