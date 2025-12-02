/* ==========================================================================
   📃 文件功能 : 密钥管理器 (Key Manager)
   ⚡ 逻辑摘要 : 提供一个美观的左下角面板，用于管理 API Key、显示用户信息和切换账号。
   💡 易懂解释 : 这是你的“钥匙包”！放在口袋（左下角）里，随时能掏出来换把钥匙，或者换个身份。🔑
   📊 当前状态 : 活跃 (2025-12-03)
   ========================================================================== */

import { bus } from '../system/event_bus.js';
import { store } from '../system/store.js';
import { network } from '../system/network.js';

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
    // 监听打开指令
    bus.on('system:open_key_mgr', () => open());
    
    // 监听用户变更
    bus.on('system:user_changed', (user) => {
        currentUser = user;
        // 如果用户登出，关闭界面
        if (!user) close();
    });

    // 🆕 尝试从 localStorage 恢复用户状态 (防止错过事件)
    const cachedUserInfoStr = localStorage.getItem('current_user_info');
    if (cachedUserInfoStr) {
        try {
            currentUser = JSON.parse(cachedUserInfoStr);
        } catch (e) {
            console.error("KeyManager: Failed to parse cached user info", e);
        }
    }

    // 监听点击外部关闭
    document.addEventListener('click', (e) => {
        if (!isOpen) return;
        const el = document.getElementById('key-mgr-panel');
        const startBtn = document.getElementById('btn-start');
        // 如果点击的不是面板内部，也不是开始按钮，则关闭
        if (el && !el.contains(e.target) && e.target !== startBtn && !startBtn.contains(e.target)) {
            close();
        }
    });
}

function open() {
    if (isOpen) {
        close();
        return;
    }
    
    // 🆕 再次尝试读取 (以防 init 时还没写入)
    if (!currentUser) {
        const cachedUserInfoStr = localStorage.getItem('current_user_info');
        if (cachedUserInfoStr) {
            try {
                currentUser = JSON.parse(cachedUserInfoStr);
            } catch (e) {}
        }
    }
    
    // 如果没有登录，直接跳转到登录
    if (!currentUser) {
        bus.emit('system:open_login');
        return;
    }

    isOpen = true;
    render();
}

function close() {
    const el = document.getElementById('key-mgr-panel');
    if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(() => el.remove(), 300);
    }
    isOpen = false;
}

function render() {
    // 移除旧的 (如果有)
    const old = document.getElementById('key-mgr-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'key-mgr-panel';
    panel.style.cssText = `
        position: fixed;
        bottom: 60px;
        left: 10px;
        width: 320px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.5);
        padding: 20px;
        z-index: 2000;
        display: flex;
        flex-direction: column;
        gap: 15px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-family: 'Segoe UI', sans-serif;
    `;

    // 头部：用户信息
    const header = `
        <div style="display: flex; align-items: center; gap: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <img src="${currentUser.avatar || 'assets/wp-0.avif'}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 16px; color: #333;">${currentUser.name}</div>
                <div style="font-size: 12px; color: #888;">@${currentUser.account}</div>
            </div>
            <button id="btn-logout" style="padding: 6px 12px; border: none; background: #ffecec; color: #ff5f56; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">
                切换
            </button>
        </div>
    `;

    // Key 列表
    let keysHtml = '';
    if (currentUser.keys && currentUser.keys.length > 0) {
        keysHtml = currentUser.keys.map(k => {
            const isActive = localStorage.getItem('angel_api_key') === k.value;
            return `
                <div class="key-item ${isActive ? 'active' : ''}" data-val="${k.value}" style="
                    padding: 12px; background: ${isActive ? 'var(--primary-color)' : 'rgba(255,255,255,0.5)'}; 
                    color: ${isActive ? 'white' : '#555'};
                    border-radius: 10px; cursor: pointer; transition: all 0.2s;
                    display: flex; align-items: center; justify-content: space-between;
                    border: 1px solid ${isActive ? 'transparent' : 'rgba(0,0,0,0.05)'};
                    margin-bottom: 8px;
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="font-size: 14px; font-weight: 500;">${k.name}</div>
                        <div style="font-size: 11px; opacity: 0.7;">${k.value.substr(0, 6)}...</div>
                    </div>
                    ${isActive ? '<span>✓</span>' : ''}
                </div>
            `;
        }).join('');
    } else {
        keysHtml = `<div style="text-align: center; color: #999; font-size: 12px; padding: 10px;">暂无可用 Key</div>`;
    }

    panel.innerHTML = header + `
        <div style="max-height: 200px; overflow-y: auto;">
            <div style="font-size: 11px; color: #aaa; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Available Keys</div>
            ${keysHtml}
        </div>
    `;

    document.body.appendChild(panel);

    // 绑定事件
    // 1. 切换用户
    panel.querySelector('#btn-logout').onclick = () => {
        close();
        bus.emit('system:open_login');
    };

    // 2. 选择 Key
    panel.querySelectorAll('.key-item').forEach(item => {
        item.onclick = () => {
            const key = item.dataset.val;
            localStorage.setItem('angel_api_key', key);
            network.send({ type: 'auth', key: key });
            bus.emit('system:speak', "Key 已更新");
            render(); // 重新渲染以更新选中状态
        };
    });

    // 动画显示
    requestAnimationFrame(() => {
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
    });
}
