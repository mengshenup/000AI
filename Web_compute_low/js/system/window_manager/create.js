/**
 * @fileoverview Create - 创建窗口原子
 * @description 动态创建窗口 DOM 结构
 * @module system/window_manager/create
 */

import { store } from '../store.js';
import { bus } from '../event_bus.js';
import { resourceManager } from '../resource_registry.js';

/**
 * 创建窗口 DOM
 * @param {string} id - 应用 ID
 * @param {Object} app - 应用配置
 * @returns {HTMLElement|null} 创建的窗口元素
 */
export function createWindow(id, app) {
    console.log(`[createWindow] ========== 创建窗口: ${id} ==========`);
    console.log(`[createWindow] app.type: ${app.type}, app.frameless: ${app.frameless}`);
    console.log(`[createWindow] app.content 长度: ${app.content?.length || 0}`);
    
    // 如果是服务类型，不创建窗口
    if (app.type === 'service') {
        console.log(`[createWindow] 服务类型，不创建窗口`);
        return null;
    }

    // 检查是否已存在
    if (document.getElementById(id)) {
        console.log(`[createWindow] 窗口已存在，跳过创建`);
        return null;
    }

    // 合并 store 数据和传入的 app 配置
    // 🧱 [2025-12-17] 修复: 优先使用传入的 app 配置，只从 latestApp 获取运行时状态
    const latestApp = store.getApp(id);
    console.log(`[createWindow] latestApp:`, latestApp ? { hasContent: !!latestApp.content, contentLength: latestApp.content?.length || 0 } : 'null');
    if (latestApp) {
        // 只从 latestApp 获取运行时状态（如 isOpen, winPos 等），不覆盖静态配置（如 content）
        const { isOpen, winPos, customName, capsuleOffsetX } = latestApp;
        app = { 
            ...app,  // 静态配置优先
            isOpen, 
            winPos: winPos || app.winPos,
            customName,
            capsuleOffsetX
        };
        console.log(`[createWindow] 合并后 content 长度: ${app.content?.length || 0}`);
    }

    const desktop = document.getElementById('desktop');
    if (!desktop) {
        console.error(`[createWindow] #desktop 元素不存在！`);
        return null;
    }

    // 创建窗口容器
    const win = document.createElement('div');
    win.id = id;
    win.className = 'window';

    // 图标容错处理
    const iconPath = app.icon || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';

    // 创建标题栏（非无边框模式）
    if (!app.frameless) {
        const titleBar = document.createElement('div');
        titleBar.className = 'title-bar';

        const controls = document.createElement('div');
        controls.className = 'win-controls';
        controls.innerHTML = `
            <button class="win-btn min-btn" title="最小化"></button>
            <button class="win-btn close-btn" title="关闭"></button>
        `;

        const title = document.createElement('div');
        title.className = 'win-title';
        title.innerHTML = `
            <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor; margin-right:5px; vertical-align:text-bottom;">
                <path d="${iconPath}"></path>
            </svg>
            ${app.description ? `${app.name}     ${app.description}` : app.name}
        `;

        titleBar.appendChild(title);
        titleBar.appendChild(controls);
        win.appendChild(titleBar);
    } else {
        win.classList.add('frameless');
    }

    // 内容区域
    const content = document.createElement('div');
    content.className = 'content';
    if (app.contentStyle) {
        content.style.cssText = app.contentStyle;
    }
    content.innerHTML = app.content || '';
    win.appendChild(content);

    // 添加到桌面
    desktop.appendChild(win);

    // 设置窗口大小
    const winWidth = app.width || 450;
    const winHeight = app.height || 350;
    win.style.width = typeof winWidth === 'number' ? `${winWidth}px` : winWidth;
    win.style.height = typeof winHeight === 'number' ? `${winHeight}px` : winHeight;

    // 启用调整大小
    if (app.resizable) {
        win.style.resize = 'both';
        win.style.minWidth = '320px';
        win.style.minHeight = '240px';
    }

    // 设置初始位置
    setWindowPosition(win, app);

    // 创建资源注册表
    const registry = resourceManager.create(id);
    registry.setDOMElement(win);

    // 通知应用窗口已就绪
    bus.emit(`app:ready:${id}`);

    return win;
}

/**
 * 设置窗口位置
 * @param {HTMLElement} win - 窗口元素
 * @param {Object} app - 应用配置
 * 
 * 🧱 [2025-12-17] 修复: 添加调试日志
 */
function setWindowPosition(win, app) {
    let initialPos = app.winPos || app.pos || { x: 100, y: 100 };
    
    console.log(`[createWindow] setWindowPosition: ${win.id}, winPos:`, app.winPos, 'pos:', app.pos, 'initialPos:', initialPos);

    if (initialPos.right !== undefined) {
        win.style.right = `${initialPos.right}px`;
        win.style.left = 'auto';
    } else {
        const safeX = isNaN(initialPos.x) ? 100 : initialPos.x;
        win.style.left = `${safeX}px`;
        win.style.right = 'auto';
    }

    if (initialPos.bottom !== undefined) {
        win.style.bottom = `${initialPos.bottom}px`;
        win.style.top = 'auto';
    } else {
        const safeY = isNaN(initialPos.y) ? 100 : initialPos.y;
        win.style.top = `${safeY}px`;
        win.style.bottom = 'auto';
    }
}
