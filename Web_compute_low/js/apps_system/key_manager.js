/* ==========================================================================
   📃 文件功能 : 密钥管理器 (Key Manager)
   ⚡ 逻辑摘要 : 提供一个美观的左下角面板，用于管理 API Key、显示用户信息和切换账号。
   💡 易懂解释 : 这是你的“钥匙包”！放在口袋（左下角）里，随时能掏出来换把钥匙，或者换个身份。🔑
   📊 当前状态 : 活跃 (2025-12-03)
   ========================================================================== */

import { bus } from '../system/event_bus.js';
import { store } from '../system/store.js';
import { network } from '../system/network.js';
import { WEB_API_URL } from '../system/config.js';

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
        console.warn("KeyManager: No user found, redirecting to login");
        // 🛡️ 安全措施：如果本地有 ID 但无法加载 UserInfo，说明数据不一致，清除 ID 以免 Taskbar 误判
        if (localStorage.getItem('current_user_id')) {
            console.warn("KeyManager: Detected stale user ID, clearing...");
            localStorage.removeItem('current_user_id');
        }
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

// 🎨 渲染主界面
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
    let statusIcon = currentUser.isLocal ? '🏠' : '☁️';
    let statusText = currentUser.isLocal ? '本地账户' : '云端账户';
    let statusColor = '#888';

    if (currentUser.isSyncing) {
        statusIcon = '<span class="spin-icon">⏳</span>';
        statusText = '正在连接云端...';
        statusColor = 'var(--primary-color)';
    }

    const header = `
        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .spin-icon { display: inline-block; animation: spin 1s linear infinite; }
        </style>
        <div style="display: flex; align-items: center; gap: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <img src="${currentUser.avatar || 'assets/wp-0.avif'}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div id="user-name-display" style="font-weight: bold; font-size: 16px; color: #333; cursor: pointer; border-bottom: 1px dashed transparent; transition: border-color 0.2s;" title="点击修改用户名">${currentUser.name}</div>
                </div>
                <div style="font-size: 12px; color: ${statusColor}; transition: color 0.3s;">
                    ${statusIcon} ${statusText} 
                    <span style="opacity:0.5">(@${currentUser.account})</span>
                </div>
            </div>
            <button id="btn-logout" style="padding: 6px 12px; border: none; background: #ffecec; color: #ff5f56; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">
                切换
            </button>
        </div>
    `;

    // Key 列表 (分组逻辑)
    let keysHtml = '';
    if (currentUser.keys && currentUser.keys.length > 0) {
        // 1. 分组
        const groups = {};
        currentUser.keys.forEach((k, idx) => {
            const catName = k.name || "Uncategorized";
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push({ ...k, originalIdx: idx });
        });

        // 2. 渲染分组
        keysHtml = Object.keys(groups).map(catName => {
            const groupKeys = groups[catName];
            const keysListHtml = groupKeys.map(k => {
                const isActive = localStorage.getItem('angel_api_key') === k.value;
                return `
                    <div class="key-item ${isActive ? 'active' : ''}" data-val="${k.value}" style="
                        padding: 8px 12px; 
                        background: ${isActive ? 'var(--primary-color)' : 'rgba(255,255,255,0.5)'}; 
                        color: ${isActive ? 'white' : '#555'};
                        border-radius: 8px; cursor: pointer; transition: all 0.2s;
                        display: flex; align-items: center; justify-content: space-between;
                        border: 1px solid ${isActive ? 'transparent' : 'rgba(0,0,0,0.05)'};
                        margin-bottom: 5px; font-size: 12px;
                    ">
                        <div class="key-value-edit" data-idx="${k.originalIdx}" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;" title="点击修改 Key 值">${k.value}</div>
                        ${isActive ? '<span style="font-weight: bold;">✓</span>' : ''}
                    </div>
                `;
            }).join('');

            return `
                <div class="category-group" style="margin-bottom: 15px;">
                    <div class="category-header" data-cat="${catName}" style="
                        font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;
                        margin-bottom: 8px; padding-left: 2px; cursor: pointer; display: flex; align-items: center; gap: 5px;
                        transition: color 0.2s;
                    " onmouseover="this.style.color='#555'" onmouseout="this.style.color='#999'" title="点击重命名分类">
                        <span>${catName}</span>
                        <span style="font-size: 9px; opacity: 0.5; background: rgba(0,0,0,0.05); padding: 1px 5px; border-radius: 4px;">${groupKeys.length}</span>
                    </div>
                    <div class="category-keys">
                        ${keysListHtml}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        keysHtml = `<div style="text-align: center; color: #999; font-size: 12px; padding: 10px;">暂无可用 Key</div>`;
    }

    panel.innerHTML = header + `
        <div style="max-height: 300px; overflow-y: auto; padding-right: 5px;">
            <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 5px; padding-bottom: 5px;">
                <button id="btn-add-key" style="
                    background: rgba(0,0,0,0.03); border: none; color: #666; cursor: pointer; 
                    font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px;
                    display: flex; align-items: center; gap: 4px; transition: all 0.2s;
                ">
                    <span style="font-size: 14px; line-height: 1;">+</span> 新建
                </button>
            </div>
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

    // 1.5 重命名用户
    const userNameDisplay = panel.querySelector('#user-name-display');
    if (userNameDisplay) {
        userNameDisplay.onclick = () => {
            showInputModal("修改用户名", "请输入新的用户名", currentUser.name, (newName) => {
                if (newName && newName.trim() !== "") {
                    currentUser.name = newName.trim();
                    saveUser();
                    render();
                }
            });
        };
    }

    // 2. 添加 Key (新版双输入框)
    panel.querySelector('#btn-add-key').onclick = () => {
        // 获取现有分类列表供参考
        const existingCats = [...new Set(currentUser.keys ? currentUser.keys.map(k => k.name) : [])];
        
        showAddKeyModal(existingCats, (catName, keyValue) => {
            if (catName && keyValue) {
                const newKey = {
                    name: catName,
                    value: keyValue
                };
                if (!currentUser.keys) currentUser.keys = [];
                currentUser.keys.push(newKey);
                saveUser();
                render();
            }
        });
    };

    // 3. 重命名分类
    panel.querySelectorAll('.category-header').forEach(el => {
        el.onclick = () => {
            const oldName = el.dataset.cat;
            showInputModal("重命名分类", "请输入新的分类名称", oldName, (newName) => {
                if (newName && newName !== oldName) {
                    // 更新所有属于该分类的 Key
                    currentUser.keys.forEach(k => {
                        if (k.name === oldName) k.name = newName;
                    });
                    saveUser();
                    render();
                }
            });
        };
    });

    // 4. 编辑 Key 值
    panel.querySelectorAll('.key-value-edit').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(el.dataset.idx);
            const key = currentUser.keys[idx];
            showInputModal("编辑 Key 值", "请输入新的 API Key", key.value, (newValue) => {
                if (newValue) {
                    key.value = newValue;
                    if (localStorage.getItem('angel_api_key') === key.value) {
                         localStorage.setItem('angel_api_key', newValue);
                         network.send({ type: 'auth', key: newValue });
                    }
                    saveUser();
                    render();
                }
            });
        };
    });

    // 5. 选择 Key
    panel.querySelectorAll('.key-item').forEach(item => {
        item.onclick = (e) => {
            if (e.target.classList.contains('key-value-edit')) return;
            
            const key = item.dataset.val;
            localStorage.setItem('angel_api_key', key);
            network.send({ type: 'auth', key: key });
            bus.emit('system:speak', "Key 已更新");
            render();
        };
    });

    // 动画显示
    requestAnimationFrame(() => {
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
    });
}

// 💾 保存用户状态到本地
function saveUser() {
    if (currentUser) {
        localStorage.setItem('current_user_info', JSON.stringify(currentUser));
        bus.emit('system:user_updated', currentUser);

        // ☁️ 如果不是本地账户，尝试同步 Keys 到服务器
        if (!currentUser.isLocal && currentUser.account) {
            fetch(`${WEB_API_URL}/update_user_keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account: currentUser.account,
                    keys: currentUser.keys
                })
            }).catch(e => console.warn("KeyManager: Sync keys failed", e));
        }
    }
}

// ✨ 通用单输入框 Modal
function showInputModal(title, placeholder, initialValue, onConfirm) {
    const old = document.getElementById('custom-input-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-input-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.3); backdrop-filter: blur(5px);
        z-index: 3000; display: flex; justify-content: center; align-items: center;
        opacity: 0; transition: opacity 0.2s;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
        background: rgba(255, 255, 255, 0.95); padding: 25px; border-radius: 16px;
        width: 320px; box-shadow: 0 20px 50px rgba(0,0,0,0.2);
        transform: scale(0.9); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: flex; flex-direction: column; gap: 15px;
    `;

    card.innerHTML = `
        <div style="font-size: 18px; font-weight: bold; color: #333;">${title}</div>
        <input type="text" value="${initialValue || ''}" placeholder="${placeholder}" style="
            width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 10px;
            font-size: 14px; outline: none; transition: border-color 0.2s;
        " id="modal-input">
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 5px;">
            <button id="modal-cancel" style="
                padding: 8px 16px; border: none; background: #f0f0f0; color: #666;
                border-radius: 8px; cursor: pointer; font-weight: 600;
            ">取消</button>
            <button id="modal-confirm" style="
                padding: 8px 16px; border: none; background: var(--primary-color); color: white;
                border-radius: 8px; cursor: pointer; font-weight: 600;
            ">确定</button>
        </div>
    `;

    modal.appendChild(card);
    document.body.appendChild(modal);

    const input = modal.querySelector('#modal-input');
    const btnCancel = modal.querySelector('#modal-cancel');
    const btnConfirm = modal.querySelector('#modal-confirm');

    setTimeout(() => input.focus(), 50);
    requestAnimationFrame(() => { modal.style.opacity = '1'; card.style.transform = 'scale(1)'; });

    const close = () => {
        modal.style.opacity = '0'; card.style.transform = 'scale(0.9)';
        setTimeout(() => modal.remove(), 200);
    };

    btnCancel.onclick = close;
    btnConfirm.onclick = () => { const val = input.value; close(); if (onConfirm) onConfirm(val); };
    input.onkeydown = (e) => { if (e.key === 'Enter') btnConfirm.click(); if (e.key === 'Escape') close(); };
    // ⚡ 交互优化：双击背景关闭
    modal.ondblclick = (e) => { if (e.target === modal) close(); };
}

// ✨ 添加 Key 专用 Modal (双输入 + 快捷标签)
function showAddKeyModal(existingCats, onConfirm) {
    const old = document.getElementById('custom-input-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-input-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.3); backdrop-filter: blur(5px);
        z-index: 3000; display: flex; justify-content: center; align-items: center;
        opacity: 0; transition: opacity 0.2s;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
        background: rgba(255, 255, 255, 0.95); padding: 25px; border-radius: 16px;
        width: 360px; box-shadow: 0 20px 50px rgba(0,0,0,0.2);
        transform: scale(0.9); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: flex; flex-direction: column; gap: 15px;
    `;

    // 生成快捷标签 (Chips)
    const chipsHtml = existingCats.length > 0 
        ? `<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 5px;">
            ${existingCats.map(c => `
                <span class="cat-chip" data-val="${c}" style="
                    display: inline-block; background: rgba(0,0,0,0.04); padding: 4px 10px; 
                    border-radius: 12px; font-size: 11px; color: #666; cursor: pointer; 
                    border: 1px solid transparent; transition: all 0.2s; user-select: none;
                " onmouseover="this.style.background='rgba(0,0,0,0.08)'" onmouseout="this.style.background='rgba(0,0,0,0.04)'">
                    ${c}
                </span>
            `).join('')}
           </div>`
        : '';

    card.innerHTML = `
        <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 5px;">添加新 Key</div>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">分类 (Category)</label>
            ${chipsHtml}
            <input type="text" placeholder="选择上方标签或输入新分类..." style="
                width: 100%; padding: 12px; border: 1px solid #e0e0e0; border-radius: 10px;
                font-size: 14px; outline: none; background: #f9f9f9; transition: all 0.2s;
            " id="modal-cat-input" onfocus="this.style.background='white';this.style.borderColor='var(--primary-color)'" onblur="this.style.background='#f9f9f9';this.style.borderColor='#e0e0e0'">
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Key 值</label>
            <input type="text" placeholder="sk-..." style="
                width: 100%; padding: 12px; border: 1px solid #e0e0e0; border-radius: 10px;
                font-size: 14px; outline: none; background: #f9f9f9; transition: all 0.2s; font-family: monospace;
            " id="modal-key-input" onfocus="this.style.background='white';this.style.borderColor='var(--primary-color)'" onblur="this.style.background='#f9f9f9';this.style.borderColor='#e0e0e0'">
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;">
            <button id="modal-cancel" style="
                padding: 10px 20px; border: none; background: #f5f5f5; color: #666;
                border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 13px; transition: background 0.2s;
            " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f5f5f5'">取消</button>
            <button id="modal-confirm" style="
                padding: 10px 20px; border: none; background: var(--primary-color); color: white;
                border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 13px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: transform 0.1s;
            " onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform='scale(1)'">添加</button>
        </div>
    `;

    modal.appendChild(card);
    document.body.appendChild(modal);

    const catInput = modal.querySelector('#modal-cat-input');
    const keyInput = modal.querySelector('#modal-key-input');
    const btnCancel = modal.querySelector('#modal-cancel');
    const btnConfirm = modal.querySelector('#modal-confirm');

    // 绑定 Chips 点击事件
    modal.querySelectorAll('.cat-chip').forEach(chip => {
        chip.onclick = () => {
            catInput.value = chip.dataset.val;
            // 视觉反馈：高亮选中的 chip
            modal.querySelectorAll('.cat-chip').forEach(c => {
                c.style.background = 'rgba(0,0,0,0.04)';
                c.style.color = '#666';
            });
            chip.style.background = 'var(--primary-color)';
            chip.style.color = 'white';
            
            keyInput.focus();
        };
    });

    setTimeout(() => catInput.focus(), 50);
    requestAnimationFrame(() => { modal.style.opacity = '1'; card.style.transform = 'scale(1)'; });

    const close = () => {
        modal.style.opacity = '0'; card.style.transform = 'scale(0.9)';
        setTimeout(() => modal.remove(), 200);
    };

    btnCancel.onclick = close;
    btnConfirm.onclick = () => { 
        const cat = catInput.value.trim();
        const key = keyInput.value.trim();
        if (cat && key) {
            close();
            if (onConfirm) onConfirm(cat, key);
        } else {
            // 简单的错误提示动画
            card.style.transform = 'translateX(5px)';
            setTimeout(() => card.style.transform = 'translateX(-5px)', 50);
            setTimeout(() => card.style.transform = 'translateX(0)', 100);
        }
    };
    
    // 回车切换焦点或提交
    catInput.onkeydown = (e) => { if (e.key === 'Enter') keyInput.focus(); };
    keyInput.onkeydown = (e) => { if (e.key === 'Enter') btnConfirm.click(); };
    // ⚡ 交互优化：双击背景关闭
    modal.ondblclick = (e) => { if (e.target === modal) close(); };
}
