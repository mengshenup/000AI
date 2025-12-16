/**
 * @fileoverview 模态框组件原子
 * @description 提供统一的模态框样式和行为
 * @module system/components/modal/modal
 */

/**
 * 创建模态框
 * @param {Object} options - 模态框配置
 * @param {string} options.title - 标题
 * @param {string|HTMLElement} options.content - 内容
 * @param {Array} [options.buttons] - 按钮配置数组
 * @param {Function} [options.onClose] - 关闭回调
 * @returns {HTMLElement}
 */
export function createModal(options = {}) {
    const { title = '', content = '', buttons = [], onClose } = options;
    
    const overlay = document.createElement('div');
    overlay.className = 'sys-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'sys-modal';
    
    // Header
    const header = document.createElement('div');
    header.className = 'sys-modal-header';
    header.innerHTML = `
        <span class="sys-modal-title">${title}</span>
        <button class="sys-modal-close">×</button>
    `;
    
    // Body
    const body = document.createElement('div');
    body.className = 'sys-modal-body';
    if (typeof content === 'string') {
        body.innerHTML = content;
    } else {
        body.appendChild(content);
    }
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'sys-modal-footer';
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `sys-btn sys-btn-${btn.type || 'secondary'}`;
        button.innerText = btn.text;
        button.onclick = () => {
            if (btn.onClick) btn.onClick();
            if (btn.closeOnClick !== false) closeModal(overlay);
        };
        footer.appendChild(button);
    });
    
    modal.appendChild(header);
    modal.appendChild(body);
    if (buttons.length > 0) modal.appendChild(footer);
    overlay.appendChild(modal);
    
    // Close handlers
    header.querySelector('.sys-modal-close').onclick = () => {
        if (onClose) onClose();
        closeModal(overlay);
    };
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            if (onClose) onClose();
            closeModal(overlay);
        }
    };
    
    return overlay;
}

/**
 * 显示模态框
 */
export function showModal(modal) {
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('active'));
}

/**
 * 关闭模态框
 */
export function closeModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 200);
}
