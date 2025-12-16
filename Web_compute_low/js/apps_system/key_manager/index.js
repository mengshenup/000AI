/**
 * @fileoverview KeyManager 分子入口
 * @description 密钥管理器服务
 * @module apps_system/key_manager/index
 */

import { bus } from '../../system/event_bus.js';
import { renderPanel, closePanel } from './render.js';

export const VERSION = '1.0.0';

export const config = {
    id: 'sys-keymgr',
    name: '密钥管理',
    type: 'service',
    isSystem: true,
    description: '管理用户密钥与会话'
};

let isOpen = false;
let currentUser = null;

export function init() {
    bus.on('system:open_key_mgr', () => open());
    bus.on('system:user_changed', (user) => {
        currentUser = user;
        if (!user) close();
    });

    loadCachedUser();
    setupClickOutside();
}

function loadCachedUser() {
    const cachedUserInfoStr = localStorage.getItem('current_user_info');
    if (cachedUserInfoStr) {
        try { currentUser = JSON.parse(cachedUserInfoStr); } catch (e) {}
    }
}

function setupClickOutside() {
    document.addEventListener('click', (e) => {
        if (!isOpen) return;
        const el = document.getElementById('key-mgr-panel');
        const startBtn = document.getElementById('btn-start');
        if (el && !el.contains(e.target) && e.target !== startBtn && !startBtn?.contains(e.target)) {
            close();
        }
    });
}

function open() {
    if (isOpen) { close(); return; }

    if (!currentUser) loadCachedUser();

    if (!currentUser) {
        if (localStorage.getItem('current_user_id')) {
            localStorage.removeItem('current_user_id');
        }
        bus.emit('system:open_login');
        return;
    }

    isOpen = true;
    renderPanel(currentUser, close, saveUser);
}

function close() {
    closePanel();
    isOpen = false;
}

function saveUser() {
    if (currentUser) {
        localStorage.setItem('current_user_info', JSON.stringify(currentUser));
        bus.emit('system:user_updated', currentUser);
    }
}
