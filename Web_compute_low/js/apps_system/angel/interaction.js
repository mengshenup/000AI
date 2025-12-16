/**
 * @fileoverview Interaction - 交互事件原子
 * @description 小天使交互事件处理
 * @module apps_system/angel/interaction
 */

import { APP_OPEN_MESSAGES, ANGEL_QUOTES } from '../angel_data.js';

/**
 * 初始化交互事件
 * @param {Object} app - AngelApp 实例
 */
export function initInteraction(app) {
    app.ctx.on('system:speak', (msg) => app._showBubble(msg));
    app.ctx.on('app:opened', (data) => {
        const msg = APP_OPEN_MESSAGES[data.id] || APP_OPEN_MESSAGES['default'];
        app._showBubble(msg);
    });

    app.container.addEventListener('contextmenu', (e) => e.preventDefault());
    app.container.addEventListener('mousedown', (e) => {
        if (e.button === 0) chat(app);
        else if (e.button === 2) handleRightClick(app, e);
    });
    app.container.addEventListener('click', (e) => {
        if (e.button === 0 && !e.target.closest('#angel-chat')) {
            toggleChat(app);
        }
    });

    bindChatEvents(app);

    document.addEventListener('mousedown', (e) => {
        const chatBox = document.getElementById('angel-chat');
        if (!chatBox || !chatBox.classList.contains('active')) return;
        const angelContainer = document.getElementById('angel-container');
        if (angelContainer && !angelContainer.contains(e.target)) {
            toggleChat(app);
        }
    });
}

/**
 * 绑定聊天事件
 */
export function bindChatEvents(app) {
    const input = document.getElementById('angel-input');
    const btnSend = document.getElementById('btn-send');
    const btnVoice = document.getElementById('btn-voice');
    const btnMute = document.getElementById('btn-mute');

    if (!input || !btnSend || !btnVoice) return;

    btnSend.addEventListener('click', () => handleSend(app));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSend(app);
    });
    btnVoice.addEventListener('click', () => app.toggleVoiceRecognition());
    if (btnMute) btnMute.addEventListener('click', () => app.toggleMute());
}

/**
 * 随机聊天
 */
export function chat(app) {
    const quote = ANGEL_QUOTES[Math.floor(Math.random() * ANGEL_QUOTES.length)];
    app._showBubble(quote);
}

/**
 * 切换聊天框
 */
export function toggleChat(app) {
    const chatBox = document.getElementById('angel-chat');
    const input = document.getElementById('angel-input');
    if (chatBox) {
        chatBox.classList.toggle('active');
        if (chatBox.classList.contains('active')) {
            chat(app);
            setTimeout(() => input && input.focus(), 100);
        }
    }
}

/**
 * 处理发送
 */
export function handleSend(app) {
    const input = document.getElementById('angel-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    if (text === '重置' || text.toLowerCase() === 'reset') {
        app._showBubble("正在重置系统... 🔄");
        setTimeout(() => {
            localStorage.clear();
            location.reload();
        }, 1000);
        input.value = '';
        return;
    }

    app._showBubble(`收到：${text} (功能开发中...)`);
    input.value = '';
}

/**
 * 处理右键旋转
 */
export function handleRightClick(app, e) {
    e.preventDefault();
    e.stopPropagation();
    app.state.r = true;
    app.state.sx = e.clientX;
    if (app.group) app.state.ir = app.group.rotation.y;

    const rotate = (ev) => {
        if (app.state.r && app.group) {
            app.group.rotation.y = app.state.ir + (ev.clientX - app.state.sx) * 0.01;
        }
    };

    const stop = () => {
        app.state.r = false;
        document.removeEventListener('mousemove', rotate);
        document.removeEventListener('mouseup', stop);
    };

    document.addEventListener('mousemove', rotate);
    document.addEventListener('mouseup', stop);
}
