/**
 * @fileoverview 输入框组件原子
 * @description 提供统一的输入框样式和行为
 * @module system/components/input/input
 */

/**
 * 创建输入框元素
 * @param {Object} options - 输入框配置
 * @param {string} [options.type='text'] - 输入类型
 * @param {string} [options.placeholder=''] - 占位符
 * @param {string} [options.value=''] - 初始值
 * @param {boolean} [options.disabled=false] - 是否禁用
 * @param {Function} [options.onChange] - 值变化回调
 * @param {Function} [options.onEnter] - 回车回调
 * @returns {HTMLInputElement}
 */
export function createInput(options = {}) {
    const { type = 'text', placeholder = '', value = '', disabled = false, onChange, onEnter } = options;
    
    const input = document.createElement('input');
    input.type = type;
    input.className = 'sys-input';
    input.placeholder = placeholder;
    input.value = value;
    input.disabled = disabled;
    
    if (onChange) {
        input.addEventListener('input', (e) => onChange(e.target.value));
    }
    
    if (onEnter) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') onEnter(e.target.value);
        });
    }
    
    return input;
}

/**
 * 创建带标签的输入框
 */
export function createLabeledInput(label, options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sys-input-group';
    
    const labelEl = document.createElement('label');
    labelEl.className = 'sys-input-label';
    labelEl.innerText = label;
    
    const input = createInput(options);
    
    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    
    return wrapper;
}
