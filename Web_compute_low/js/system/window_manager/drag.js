/**
 * @fileoverview Drag - 拖拽逻辑原子
 * @description 处理窗口和图标的拖拽
 * @module system/window_manager/drag
 */

import { store } from '../store.js';

/** @type {Object} 拖拽状态 */
export const dragState = {
    active: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    item: null,
    type: null,
    offsetX: 0,
    offsetY: 0
};

/**
 * 开始拖拽
 * @param {MouseEvent} e - 鼠标事件
 * @param {HTMLElement} item - 被拖拽的元素
 * @param {'window'|'icon'} type - 拖拽类型
 */
export function startDrag(e, item, type) {
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.active = true;
    dragState.item = item;
    dragState.type = type;

    const rect = item.getBoundingClientRect();
    dragState.offsetX = e.clientX - rect.left;
    dragState.offsetY = e.clientY - rect.top;
}

/**
 * 处理鼠标移动
 * @param {MouseEvent} e - 鼠标事件
 */
export function handleMouseMove(e) {
    if (!dragState.active) return;

    const { clientX, clientY } = e;
    
    // 拖拽阈值检查
    if (!dragState.isDragging) {
        const moveX = Math.abs(clientX - dragState.startX);
        const moveY = Math.abs(clientY - dragState.startY);
        if (moveX < 5 && moveY < 5) return;
        
        dragState.isDragging = true;
        e.preventDefault();
        
        if (dragState.item) {
            dragState.item.classList.add('dragging');
        }
        
        const overlay = document.getElementById('drag-overlay');
        if (overlay) overlay.style.display = 'block';
    }

    const { item, offsetX, offsetY } = dragState;
    const x = clientX - offsetX;
    const y = clientY - offsetY;

    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
}

/**
 * 处理鼠标抬起
 */
export function handleMouseUp() {
    if (!dragState.active) return;

    if (dragState.isDragging) {
        const x = parseInt(dragState.item.style.left);
        const y = parseInt(dragState.item.style.top);
        const id = dragState.item.id.replace('icon-', '');

        // 🧱 [2025-12-17] 修复: 添加调试日志
        console.log(`[Drag] 保存位置: ${id}, type: ${dragState.type}, x: ${x}, y: ${y}`);

        if (dragState.type === 'window') {
            store.updateApp(id, { winPos: { x, y } });
            console.log(`[Drag] 已保存窗口位置: ${id}`);
        } else if (dragState.type === 'icon') {
            store.updateApp(id, { pos: { x, y } });
            console.log(`[Drag] 已保存图标位置: ${id}`);
        }
    }

    // 清理状态
    if (dragState.item) {
        dragState.item.classList.remove('dragging');
    }
    dragState.active = false;
    dragState.isDragging = false;
    dragState.item = null;

    const overlay = document.getElementById('drag-overlay');
    if (overlay) overlay.style.display = 'none';
}

/**
 * 检查是否可以拖拽
 * @param {MouseEvent} e - 鼠标事件
 * @param {HTMLElement} target - 目标元素
 * @returns {Object|null} 拖拽信息
 */
export function checkDraggable(e, target) {
    if (e.button !== 0) return null;
    if (target.closest('.win-btn')) return null;
    if (target.closest('#taskbar')) return null;

    const win = target.closest('.window');
    const icon = target.closest('.desktop-icon');
    
    if (!win && !icon) return null;

    // 窗口只能通过标题栏拖拽
    if (win) {
        if (win.id === 'win-companion') {
            if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('.angel-chat-box')) {
                return null;
            }
        } else if (!target.closest('.title-bar') && !win.classList.contains('frameless')) {
            return null;
        }
        if (win.classList.contains('frameless')) {
            if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('.interactive')) {
                return null;
            }
        }
    }

    // 检查是否固定位置
    const id = (win || icon).id.replace('icon-', '');
    const app = store.getApp(id);
    if (app && app.fixed) return null;

    return {
        item: win || icon,
        type: win ? 'window' : 'icon'
    };
}
