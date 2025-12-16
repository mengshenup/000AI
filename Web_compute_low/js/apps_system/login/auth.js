/**
 * @fileoverview Auth - 认证逻辑原子
 * @description 登录认证和用户管理
 * @module apps_system/login/auth
 */

import { bus } from '../../system/event_bus.js';
import { network } from '../../system/network.js';

/**
 * 保存本地用户
 * 
 * 🧱 踩坑记录:
 *    1. [2025-12-17] [已修复] 添加 JSON 解析错误日志，便于调试
 */
export function saveLocalUser(user) {
    if (!user || !user.account) return;
    let db = {};
    try { 
        db = JSON.parse(localStorage.getItem('angel_users_v2') || '{}'); 
    } catch(e) {
        console.warn('[Auth] 解析用户数据失败，使用空对象:', e.message);
    }
    db[user.account] = { ...db[user.account], ...user, lastLogin: Date.now() };
    localStorage.setItem('angel_users_v2', JSON.stringify(db));
    saveKnownUser(user);
}

/**
 * 加载本地用户
 */
export function loadLocalUser(account) {
    try {
        const db = JSON.parse(localStorage.getItem('angel_users_v2') || '{}');
        return db[account] || null;
    } catch(e) { 
        console.warn('[Auth] 加载用户数据失败:', e.message);
        return null; 
    }
}

/**
 * 保存已知用户列表
 */
export function saveKnownUser(user) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('angel_known_users') || '[]'); } catch(e) {}
    list = list.filter(u => u.account !== user.account);
    list.unshift({ account: user.account, name: user.name, avatar: user.avatar });
    if (list.length > 5) list.pop();
    localStorage.setItem('angel_known_users', JSON.stringify(list));
}

/**
 * 更新系统用户
 * 
 * 🧱 [2025-12-17] 修复: 不再调用 syncFromClientDB，避免覆盖已加载的数据
 * 数据已经在 store.ready() 中加载，这里只需要更新用户信息
 */
export function updateSystemUser(currentUser) {
    bus.emit('system:user_changed', currentUser);
    localStorage.setItem('current_user_id', currentUser.account);
    localStorage.setItem('current_user_info', JSON.stringify(currentUser));
    if (currentUser.keys && currentUser.keys.length > 0) {
        let activeKey = localStorage.getItem('angel_api_key');
        const isValidKey = activeKey && currentUser.keys.some(k => k.value === activeKey);
        if (!isValidKey) {
            localStorage.removeItem('angel_api_key');
            network.send({ type: 'auth', key: '' });
        } else {
            network.send({ type: 'auth', key: activeKey });
        }
    }
    // 🧱 [2025-12-17] 修复: 移除 syncFromClientDB 调用
    // 数据已经在系统启动时通过 store.ready() 加载
    // 重复调用会覆盖已有数据（包括窗口位置等）
    console.log('[Auth] 用户信息已更新');
}

/**
 * 自动登录
 */
export async function autoLogin(loginApp) {
    const cachedUser = localStorage.getItem('current_user_id');
    if (cachedUser) {
        const localData = loadLocalUser(cachedUser);
        if (localData) {
            loginApp.currentUser = localData;
        } else {
            try {
                const fullInfo = JSON.parse(localStorage.getItem('current_user_info'));
                if (fullInfo && fullInfo.account === cachedUser) {
                    loginApp.currentUser = fullInfo;
                } else {
                    loginApp.currentUser = { id: cachedUser, name: cachedUser, account: cachedUser, keys: [] };
                }
            } catch(e) {}
        }
        updateSystemUser(loginApp.currentUser);
        network.connect();
        bus.emit('system:speak', `欢迎回来，${cachedUser}`);
    } else {
        loginApp.currentUser = {
            id: 'local_admin', name: 'Local Admin', account: 'admin',
            avatar: 'js/system/assets/wp-0.avif', isLocal: true,
            keys: [{ name: 'Default Key', value: 'sk-local-default-key' }]
        };
        saveLocalUser(loginApp.currentUser);
        if (!localStorage.getItem('angel_auth_token')) {
            localStorage.setItem('angel_auth_token', `local-token-${Date.now()}`);
        }
        updateSystemUser(loginApp.currentUser);
        network.connect();
        bus.emit('system:speak', "默认本地账户已登录");
    }
}
