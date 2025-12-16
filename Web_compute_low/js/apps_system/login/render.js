/**
 * @fileoverview Render - 登录界面渲染原子
 * @description 登录界面 UI 渲染
 * @module apps_system/login/render
 */

import { bus } from '../../system/event_bus.js';
import { loadLocalUser, saveLocalUser, updateSystemUser } from './auth.js';

/**
 * 渲染登录界面
 */
export function renderLoginUI(loginApp) {
    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px);
        z-index: 9999; display: flex; justify-content: center; align-items: center;
    `;

    let knownUsers = [];
    try { knownUsers = JSON.parse(localStorage.getItem('angel_known_users') || '[]'); } catch (e) {}
    if (knownUsers.length === 0) {
        knownUsers.push({ account: 'admin', name: 'Local Admin', avatar: 'js/system/assets/wp-0.avif' });
    }

    overlay.innerHTML = `
        <div style="background: rgba(255,255,255,0.95); padding: 40px; border-radius: 24px; width: 380px;">
            <h2 style="text-align: center; margin-bottom: 20px;">欢迎回来</h2>
            <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;">
                ${knownUsers.map(u => `
                    <div class="user-card" data-account="${u.account}" style="cursor: pointer; text-align: center;">
                        <img src="${u.avatar}" style="width: 50px; height: 50px; border-radius: 50%;">
                        <div style="font-size: 12px;">${u.name}</div>
                    </div>
                `).join('')}
            </div>
            <input type="text" id="login-account" placeholder="账号" style="width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #eee; border-radius: 8px;">
            <button id="btn-login" style="width: 100%; padding: 12px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer;">登录</button>
        </div>
    `;

    document.body.appendChild(overlay);
    bindLoginEvents(overlay, loginApp);
}

/**
 * 绑定登录事件
 * 
 * 🧱 [2025-12-17] 修复: 添加输入框回车支持和调试日志
 */
function bindLoginEvents(overlay, loginApp) {
    const accountInput = document.getElementById('login-account');
    const loginBtn = document.getElementById('btn-login');
    
    if (!accountInput || !loginBtn) {
        console.error('[Login] 找不到登录输入框或按钮');
        return;
    }
    
    // 用户卡片点击
    overlay.querySelectorAll('.user-card').forEach(card => {
        card.onclick = () => {
            accountInput.value = card.dataset.account;
            loginBtn.click();
        };
    });

    // 🧱 [2025-12-17] 修复: 输入框回车登录
    accountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginBtn.click();
        }
    });

    // 登录按钮点击
    loginBtn.onclick = () => {
        const account = accountInput.value.trim();
        console.log('[Login] 尝试登录:', account);
        if (!account) return;

        const localData = loadLocalUser(account);
        loginApp.currentUser = {
            id: account, name: localData ? localData.name : account, account,
            avatar: localData ? localData.avatar : 'js/system/assets/wp-0.avif',
            keys: localData ? (localData.keys || []) : [], isLocal: true
        };

        closeLoginUI();
        loginApp.isOpen = false;
        saveLocalUser(loginApp.currentUser);
        if (!localStorage.getItem('angel_auth_token')) {
            localStorage.setItem('angel_auth_token', `local-token-${Date.now()}`);
        }
        updateSystemUser(loginApp.currentUser);
        bus.emit('system:speak', `欢迎回来，${loginApp.currentUser.name}`);
        setTimeout(() => bus.emit('system:open_key_mgr'), 600);
    };

    // 双击关闭
    overlay.ondblclick = (e) => { 
        if (e.target === overlay) {
            closeLoginUI();
            loginApp.isOpen = false;
        }
    };
    
    // 🧱 [2025-12-17] 修复: 自动聚焦输入框
    setTimeout(() => accountInput.focus(), 100);
}

/**
 * 关闭登录界面
 */
export function closeLoginUI() {
    const el = document.getElementById('login-overlay');
    if (el) el.remove();
}
