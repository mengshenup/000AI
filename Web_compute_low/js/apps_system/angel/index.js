/**
 * @fileoverview Angel 分子入口
 * @description 组合所有小天使原子，提供统一接口
 * @module apps_system/angel/index
 */

import { bus } from '../../system/event_bus.js';
import { pm } from '../../system/process_manager.js';
import { APP_OPEN_MESSAGES } from '../angel_data.js';
import { showBubble, updateMuteIcon } from './speak.js';
import { buildModel } from './model.js';
import { createRenderer } from './renderer.js';
import { createAnimateLoop, setPerfMode } from './animation.js';
import { initInteraction, chat, toggleChat, handleSend } from './interaction.js';
import { toggleMute, toggleVoiceRecognition } from './voice.js';

export const VERSION = '1.0.0';

export const config = {
    id: 'win-companion',
    name: '守护天使',
    version: '1.0.0',
    description: '永远陪伴在你身边的守护者',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
    color: '#ff7675',
    showDesktopIcon: false,
    showTaskbarIcon: false,
    // 🧱 [2025-12-17] 修复: 添加 frameless 属性，使窗口完全透明
    frameless: true,
    pos: { x: window.innerWidth - 320, y: 100 },
    winPos: { x: window.innerWidth - 320, y: 100 },
    isOpen: true,
    content: `
        <div id="angel-container" style="width:100%; height:100%; position:relative;">
            <div id="angel-scene" style="width:100%; height:100%;"></div>
            <div id="angel-speech" class="speech-bubble">...</div>
            <div id="angel-chat" class="angel-chat-box">
                <div class="chat-input-wrapper">
                    <input type="text" id="angel-input" class="angel-input" placeholder="输入指令或聊天..." autocomplete="off">
                    <button id="btn-voice" class="chat-btn" title="语音输入">
                        <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    </button>
                    <button id="btn-mute" class="chat-btn" title="开启/关闭语音">
                        <svg id="icon-sound-on" viewBox="0 0 24 24" style="display:block"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                        <svg id="icon-sound-off" viewBox="0 0 24 24" style="display:none"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                    </button>
                    <button id="btn-send" class="chat-btn" title="发送"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
                </div>
            </div>
        </div>
        <style>
            /* 🧱 [2025-12-17] 修复: frameless 窗口额外样式 */
            #win-companion { overflow: visible !important; }
            #win-companion .content { 
                background: transparent !important; 
                overflow: visible !important;
                padding: 0 !important;
            }
        </style>
    `,
    contentStyle: 'background:transparent; overflow:visible;'
};

export class AngelApp {
    constructor() {
        this.id = config.id;
        this.ctx = pm.getContext(this.id);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.group = null;
        this.timer = null;
        this.wL = null;
        this.wR = null;
        this.state = { r: false, sx: 0, ir: 0 };
        this.isRunning = false;
        this.isMuted = false;
        this.perfMode = 'high';
        this.targetFPS = 60;
        this.frameInterval = 1000 / 60;

        this.animate = createAnimateLoop(this);
        bus.on(`app:ready:${this.id}`, () => this.init());
        this.ctx.onCleanup(() => this.onDestroy());
        bus.on('angel:reset', () => this.resetState());
    }

    resetState() {
        if (this.group) { this.group.position.set(0, 0, 0); this.group.rotation.set(0, 0, 0); }
        this.state = { r: false, sx: 0, ir: 0 };
        ['angel_is_muted', 'angel_performance_mode', 'angel_force_cpu'].forEach(k => localStorage.removeItem(k));
        import('../../system/store.js').then(m => m.store.reset());
        this._showBubble("已重置所有状态！请刷新页面生效 ✨");
        setTimeout(() => location.reload(), 1500);
    }

    init() {
        this.isMuted = localStorage.getItem('angel_is_muted') === 'true';
        setPerfMode(this, localStorage.getItem('angel_performance_mode') || 'high');
        this.ctx.on('config:changed', (data) => { if (data.key === 'perfMode') setPerfMode(this, data.value); });

        if (this.renderer) {
            this.container = document.getElementById('angel-scene');
            if (this.container && !this.container.contains(this.renderer.domElement)) {
                this.container.appendChild(this.renderer.domElement);
                this.renderer.setSize(this.container.clientWidth || 300, this.container.clientHeight || 400);
            }
            this.isRunning = true;
            this.animate();
            updateMuteIcon(this.isMuted);
            return;
        }

        this.container = document.getElementById('angel-scene');
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 1, 5);

        const { renderer, perfMode, showBubbleMsg } = createRenderer(this.container, this.perfMode);
        if (!renderer) return;
        this.renderer = renderer;
        this.perfMode = perfMode;

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        const { group, wL, wR } = buildModel(this.scene);
        this.group = group; this.wL = wL; this.wR = wR;

        initInteraction(this);
        document.addEventListener('visibilitychange', () => {
            this.isRunning = !document.hidden;
            if (!document.hidden) { this.lastTime = performance.now(); this.animate(); }
        });

        this.isRunning = true;
        this.animate();
        updateMuteIcon(this.isMuted);
        this._showBubble(showBubbleMsg || APP_OPEN_MESSAGES['win-companion'] || APP_OPEN_MESSAGES['default']);
    }

    onDestroy() {
        this.isRunning = false;
        if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer = null; }
        this.scene = null; this.camera = null; this.group = null;
    }

    toggleMute() { toggleMute(this); }
    toggleVoiceRecognition() { toggleVoiceRecognition(this); }
    chat() { chat(this); }
    toggleChat() { toggleChat(this); }
    handleSend() { handleSend(this); }
    _showBubble(text) { this.timer = showBubble(text, this.ctx, this.timer, this.isMuted); }
}

export const app = new AngelApp();

// 导出原子
export { speak, showBubble, updateMuteIcon } from './speak.js';
export { buildModel } from './model.js';
export { createRenderer } from './renderer.js';
export { createAnimateLoop, setPerfMode } from './animation.js';
export { initInteraction, chat, toggleChat, handleSend } from './interaction.js';
export { toggleMute, toggleVoiceRecognition } from './voice.js';
