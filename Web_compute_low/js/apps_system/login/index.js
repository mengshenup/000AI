/**
 * @fileoverview Login 分子入口
 * @description 登录服务与界面管理
 * @module apps_system/login/index
 */

import { bus } from '../../system/event_bus.js';
import { saveLocalUser, loadLocalUser, updateSystemUser, autoLogin } from './auth.js';
import { renderLoginUI, closeLoginUI } from './render.js';

export const VERSION = '1.0.0';

export const config = {
    id: 'app-login',
    type: 'service',
    name: 'Login Service',
    version: '1.0.0'
};

export const loginApp = {
    id: 'app-login',
    isOpen: false,
    currentUser: null,
    users: [{ id: 'user_default', name: 'Angel User', avatar: 'js/system/assets/wp-0.avif', account: 'admin', password: '', keys: [] }],

    init() {
        bus.on('app:opened', ({id}) => { if (id === this.id) this.open(); });
        bus.on('system:open_login', () => this.open());
        bus.on('system:user_updated', (user) => saveLocalUser(user));
        bus.on('network:connected', () => {
            if (this.currentUser) updateSystemUser(this.currentUser);
        });
        autoLogin(this);
    },

    saveLocalUser(user) { saveLocalUser(user); },
    loadLocalUser(account) { return loadLocalUser(account); },
    updateSystemUser() { updateSystemUser(this.currentUser); },

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        renderLoginUI(this);
    },

    close() {
        closeLoginUI();
        this.isOpen = false;
    }
};

export function init() {
    loginApp.init();
}

// 导出原子
export { saveLocalUser, loadLocalUser, updateSystemUser, autoLogin } from './auth.js';
export { renderLoginUI, closeLoginUI } from './render.js';
