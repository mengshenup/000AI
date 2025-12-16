/**
 * @fileoverview KeyManager 渲染原子
 * @description 密钥管理器 UI 渲染
 * @module apps_system/key_manager/render
 */

import { bus } from '../../system/event_bus.js';
import { network } from '../../system/network.js';
import { createModal, showModal, closeModal } from '../../system/components/modal/index.js';
import { createInput } from '../../system/components/input/index.js';

/**
 * 渲染密钥管理面板
 * @param {Object} currentUser - 当前用户
 * @param {Function} onClose - 关闭回调
 * @param {Function} onSaveUser - 保存用户回调
 */
export function renderPanel(currentUser, onClose, onSaveUser) {
    const old = document.getElementById('key-mgr-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'key-mgr-panel';
    panel.style.cssText = `
        position: fixed; bottom: 60px; left: 10px; width: 320px;
        background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px);
        border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        padding: 20px; z-index: 2000; display: flex; flex-direction: column; gap: 15px;
        opacity: 0; transform: translateY(20px); transition: all 0.3s;
    `;

    const statusIcon = currentUser.isLocal ? '🏠' : '☁️';
    const statusText = currentUser.isLocal ? '本地账户' : '云端账户';
    const keysHtml = renderKeysList(currentUser);

    panel.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
            <img src="${currentUser.avatar || 'js/system/assets/wp-0.avif'}" style="width: 50px; height: 50px; border-radius: 50%;">
            <div style="flex: 1;">
                <div style="font-weight: bold;">${currentUser.name}</div>
                <div style="font-size: 12px; color: #888;">${statusIcon} ${statusText}</div>
            </div>
            <button id="btn-logout" style="padding: 6px 12px; border: none; background: #ffecec; color: #ff5f56; border-radius: 8px; cursor: pointer;">切换</button>
        </div>
        <div style="max-height: 200px; overflow-y: auto;">
            ${keysHtml}
        </div>
        <button id="btn-add-key" style="padding: 8px; border: 1px dashed #ccc; background: transparent; border-radius: 8px; cursor: pointer;">+ 添加 Key</button>
    `;

    document.body.appendChild(panel);
    bindPanelEvents(panel, currentUser, onClose, onSaveUser);

    requestAnimationFrame(() => {
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
    });
}

/**
 * 渲染密钥列表
 */
function renderKeysList(currentUser) {
    if (!currentUser.keys || currentUser.keys.length === 0) {
        return '<div style="text-align: center; color: #999;">暂无可用 Key</div>';
    }

    return currentUser.keys.map((k) => {
        const isActive = localStorage.getItem('angel_api_key') === k.value;
        return `
            <div class="key-item" data-val="${k.value}" style="
                padding: 8px 12px; background: ${isActive ? 'var(--primary-color)' : '#f5f5f5'};
                color: ${isActive ? 'white' : '#555'}; border-radius: 8px; cursor: pointer;
                margin-bottom: 5px; display: flex; justify-content: space-between;
            ">
                <span style="overflow: hidden; text-overflow: ellipsis;">${k.name}: ${k.value.substring(0, 20)}...</span>
                ${isActive ? '<span>✓</span>' : ''}
            </div>
        `;
    }).join('');
}

/**
 * 绑定面板事件
 * 
 * 🧱 [2025-12-17] 修复: 使用 modal 组件替代 prompt()
 */
function bindPanelEvents(panel, currentUser, onClose, onSaveUser) {
    panel.querySelector('#btn-logout').onclick = () => {
        onClose();
        bus.emit('system:open_login');
    };

    panel.querySelector('#btn-add-key').onclick = () => {
        showAddKeyModal(currentUser, onClose, onSaveUser);
    };

    panel.querySelectorAll('.key-item').forEach(item => {
        item.onclick = () => {
            const key = item.dataset.val;
            localStorage.setItem('angel_api_key', key);
            network.send({ type: 'auth', key });
            bus.emit('system:speak', "Key 已更新");
            renderPanel(currentUser, onClose, onSaveUser);
        };
    });
}

/**
 * 显示添加 Key 模态框
 * 🧱 [2025-12-17] 修复: 使用系统 modal 组件
 */
function showAddKeyModal(currentUser, onClose, onSaveUser) {
    // 创建输入框容器
    const content = document.createElement('div');
    content.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
    
    const nameInput = createInput({ placeholder: '名称 (如: OpenAI)', value: 'Default' });
    const keyInput = createInput({ placeholder: 'API Key (sk-...)' });
    
    content.appendChild(nameInput);
    content.appendChild(keyInput);
    
    let modalRef = null;
    
    const modal = createModal({
        title: '添加 API Key',
        content: content,
        buttons: [
            { text: '取消', type: 'secondary' },
            { 
                text: '确认', 
                type: 'primary',
                closeOnClick: false,
                onClick: () => {
                    const name = nameInput.value.trim() || 'Default';
                    const value = keyInput.value.trim();
                    
                    if (!value) {
                        keyInput.style.borderColor = '#ff5f56';
                        keyInput.focus();
                        return;
                    }
                    
                    if (!currentUser.keys) currentUser.keys = [];
                    currentUser.keys.push({ name, value });
                    onSaveUser();
                    bus.emit('system:speak', "Key 已添加");
                    closeModal(modalRef);
                    renderPanel(currentUser, onClose, onSaveUser);
                }
            }
        ]
    });
    
    modalRef = modal;
    showModal(modal);
    
    // 自动聚焦到 Key 输入框
    setTimeout(() => keyInput.focus(), 100);
    
    // 回车确认
    keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            modal.querySelector('.sys-btn-primary').click();
        }
    });
}

/**
 * 关闭面板动画
 */
export function closePanel() {
    const el = document.getElementById('key-mgr-panel');
    if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(() => el.remove(), 300);
    }
}
