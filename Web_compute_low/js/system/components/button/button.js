/**
 * @fileoverview 按钮组件原子
 * @description 提供统一的按钮样式和行为
 * @module system/components/button/button
 */

/**
 * 创建按钮元素
 * @param {Object} options - 按钮配置
 * @param {string} options.text - 按钮文本
 * @param {string} [options.type='primary'] - 按钮类型 (primary, secondary, danger, success)
 * @param {string} [options.size='medium'] - 按钮大小 (small, medium, large)
 * @param {boolean} [options.disabled=false] - 是否禁用
 * @param {Function} [options.onClick] - 点击回调
 * @returns {HTMLButtonElement}
 */
export function createButton(options = {}) {
    const { text = '', type = 'primary', size = 'medium', disabled = false, onClick } = options;
    
    const btn = document.createElement('button');
    btn.className = `sys-btn sys-btn-${type} sys-btn-${size}`;
    btn.innerText = text;
    btn.disabled = disabled;
    
    if (onClick) {
        btn.addEventListener('click', onClick);
    }
    
    return btn;
}

/**
 * 按钮类型颜色映射
 */
export const BUTTON_COLORS = {
    primary: { bg: '#6c5ce7', hover: '#5b4cdb', text: '#fff' },
    secondary: { bg: '#dfe6e9', hover: '#b2bec3', text: '#2d3436' },
    danger: { bg: '#ff7675', hover: '#d63031', text: '#fff' },
    success: { bg: '#00b894', hover: '#00a085', text: '#fff' }
};
