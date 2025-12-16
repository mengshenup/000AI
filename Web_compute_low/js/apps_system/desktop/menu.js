/**
 * @fileoverview 右键菜单原子
 * @description 处理桌面图标的右键菜单
 * @module apps_system/desktop/menu
 */

import { store } from '../../system/store.js';
import { bus } from '../../system/event_bus.js';
import { contextMenuApp } from '../context_menu.js';

/**
 * 绑定图标右键菜单
 * @param {HTMLElement} el - 图标元素
 * @param {string} id - 应用ID
 * @param {Object} app - 应用配置
 */
export function bindContextMenu(el, id, app) {
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();

        contextMenuApp.show(e.clientX, e.clientY, [
            {
                label: '打开',
                icon: '🚀',
                action: () => window.wm.openApp(id)
            },
            {
                label: '重命名',
                icon: '✏️',
                action: () => showRenameInput(el, id, app)
            },
            {
                label: '固定到任务栏',
                icon: '📌',
                action: () => {
                    store.updateApp(id, { showTaskbarIcon: true });
                    bus.emit('app:updated', id);
                    bus.emit('system:speak', "已固定到任务栏");
                }
            }
        ]);
    });
}

/**
 * 显示重命名输入框
 * 
 * 🧱 踩坑记录:
 *    1. [2025-12-17] [已修复] 优先使用 index.html 中已存在的 rename-input 元素
 */
function showRenameInput(el, id, app) {
    let input = document.getElementById('rename-input');
    // 优先使用 HTML 中已存在的元素，避免重复创建
    if (!input) {
        console.warn('[Desktop] rename-input 元素不存在，动态创建');
        input = document.createElement('div');
        input.id = 'rename-input';
        input.contentEditable = true;
        document.body.appendChild(input);
    }
    // 确保元素可编辑
    input.contentEditable = true;

    const rect = el.getBoundingClientRect();
    input.style.left = `${rect.left + rect.width / 2 - 50}px`;
    input.style.top = `${rect.bottom - 20}px`;
    input.style.display = 'block';
    input.innerText = app.name;

    input.focus();
    const range = document.createRange();
    range.selectNodeContents(input);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const submit = () => {
        const newName = input.innerText.trim();
        input.style.display = 'none';

        if (newName && newName !== '') {
            store.updateApp(id, { customName: newName, name: newName });
            bus.emit('app:renamed', { id, newName });

            // 更新窗口标题
            const winTitle = document.querySelector(`#${id} .win-title`);
            if (winTitle) {
                const desc = app.description || '';
                const iconPath = app.icon || app.iconPath || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';
                winTitle.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor; margin-right:5px; vertical-align:text-bottom;">
                        <path d="${iconPath}"></path>
                    </svg>
                    ${desc ? `${newName}     ${desc}` : newName}
                `;
            }
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
