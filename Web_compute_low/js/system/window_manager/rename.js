/**
 * @fileoverview WindowManager 重命名原子
 * @description 窗口/图标重命名功能
 * @module system/window_manager/rename
 */

import { store } from '../store.js';
import { bus } from '../event_bus.js';

/**
 * 显示重命名输入框
 * @param {HTMLElement} icon - 图标元素
 * @param {string} id - 应用 ID
 * @param {Object} app - 应用配置
 */
export function showRenameInput(icon, id, app) {
    const input = document.getElementById('rename-input');
    if (!input) return;

    const rect = icon.getBoundingClientRect();
    input.style.left = `${rect.left + rect.width / 2 - 50}px`;
    input.style.top = `${rect.bottom + 5}px`;
    input.style.display = 'block';
    input.innerText = app.name;
    input.focus();

    selectAllText(input);
    setupRenameEvents(input, id, app);
}

function selectAllText(input) {
    const range = document.createRange();
    range.selectNodeContents(input);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

function setupRenameEvents(input, id, app) {
    const submit = () => {
        const newName = input.innerText.trim();
        input.style.display = 'none';
        if (newName && newName !== '') {
            store.updateApp(id, { customName: newName, name: newName });
            bus.emit('app:renamed', { id, newName });
            updateWindowTitle(id, newName, app.description);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submit();
            cleanup();
        }
    };
    
    const handleBlur = () => { submit(); cleanup(); };
    
    const cleanup = () => {
        input.removeEventListener('keydown', handleKey);
        input.removeEventListener('blur', handleBlur);
    };

    input.addEventListener('keydown', handleKey);
    input.addEventListener('blur', handleBlur);
}

function updateWindowTitle(id, newName, description) {
    const winTitle = document.querySelector(`#${id} .win-title`);
    if (winTitle) {
        const desc = description || '';
        winTitle.innerText = desc ? `${newName} · ${desc}` : newName;
    }
}
