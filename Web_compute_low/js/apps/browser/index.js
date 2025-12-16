/**
 * @fileoverview Browser 分子入口
 * @description 组合所有浏览器原子，提供统一接口
 * @module apps/browser/index
 */

import { bus } from '../../system/event_bus.js';
import { pm } from '../../system/process_manager.js';
import { network } from '../../system/network.js';
import { config } from './config.js';
import { setupRemoteControl } from './remote.js';

export const VERSION = '1.0.0';
export { config };

/**
 * BrowserApp 类 - 探索之窗浏览器
 */
export class BrowserApp {
    constructor() {
        this.id = config.id;
        this.ctx = pm.getContext(this.id);
        this.currentUrl = 'https://www.douyin.com/';
        this.history = [];
        this.historyIndex = -1;
        
        // 🧱 [2025-12-17] 修复: 监听 app:ready 和 app:opened 两个事件
        bus.on(`app:ready:${this.id}`, () => this.init());
        bus.on('app:opened', (data) => {
            if (data.id === this.id) this.init();
        });
        this.ctx.onCleanup(() => this.onDestroy());
    }

    init() {
        this.bindEvents();
        setupRemoteControl(window.wm);
        this.setupNetworkListeners();
    }

    bindEvents() {
        // 导航按钮
        document.getElementById('btn-browser-back')?.addEventListener('click', () => this.goBack());
        document.getElementById('btn-browser-forward')?.addEventListener('click', () => this.goForward());
        document.getElementById('btn-browser-refresh')?.addEventListener('click', () => this.refresh());
        document.getElementById('btn-browser-go')?.addEventListener('click', () => this.navigate());
        
        // URL 输入框回车
        document.getElementById('browser-url')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.navigate();
        });
        
        // 特殊功能按钮
        document.getElementById('btn-browser-reconnect')?.addEventListener('click', () => this.reconnect());
        document.getElementById('btn-browser-captcha')?.addEventListener('click', () => this.solveCaptcha());
        document.getElementById('btn-browser-task')?.addEventListener('click', () => this.executeTask());
        
        // 画质和帧率选择
        document.getElementById('sel-quality')?.addEventListener('change', (e) => this.setQuality(e.target.value));
        document.getElementById('sel-fps')?.addEventListener('change', (e) => this.setFps(e.target.value));
    }

    setupNetworkListeners() {
        // 监听直播流帧
        bus.on('net:stream_frame', (data) => {
            const img = document.getElementById('live-image');
            if (img && data.frame) {
                img.src = `data:image/jpeg;base64,${data.frame}`;
                img.style.display = 'block';
            }
        });

        // 监听状态更新
        bus.on('net:browser_status', (data) => {
            const overlay = document.getElementById('browser-status-overlay');
            if (overlay && data.status) {
                overlay.innerText = data.status;
                overlay.style.display = 'block';
            }
        });
    }

    navigate() {
        const input = document.getElementById('browser-url');
        if (!input) return;
        
        let url = input.value.trim();
        if (!url) return;
        
        // 自动补全协议
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        // 记录历史
        if (this.currentUrl !== url) {
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(url);
            this.historyIndex = this.history.length - 1;
        }
        
        this.currentUrl = url;
        window.current_browser_url = url;
        
        network.send({ type: 'navigate', url });
        bus.emit('system:speak', '正在导航...');
    }

    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const url = this.history[this.historyIndex];
            document.getElementById('browser-url').value = url;
            this.currentUrl = url;
            network.send({ type: 'navigate', url });
        }
    }

    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const url = this.history[this.historyIndex];
            document.getElementById('browser-url').value = url;
            this.currentUrl = url;
            network.send({ type: 'navigate', url });
        }
    }

    refresh() {
        network.send({ type: 'refresh' });
    }

    reconnect() {
        network.send({ type: 'stream_reconnect' });
        bus.emit('system:speak', '正在重连直播流...');
    }

    solveCaptcha() {
        network.send({ type: 'solve_captcha' });
        bus.emit('system:speak', 'AI 正在处理验证码...');
    }

    executeTask() {
        const input = document.getElementById('browser-task-input');
        if (!input) return;
        
        const task = input.value.trim();
        if (!task) return;
        
        network.send({ type: 'execute_task', task });
        bus.emit('system:speak', `正在执行任务: ${task}`);
        input.value = '';
    }

    setQuality(quality) {
        network.send({ type: 'set_quality', quality });
    }

    setFps(fps) {
        network.send({ type: 'set_fps', fps: parseInt(fps) });
    }

    onDestroy() {
        network.send({ type: 'stream_control', action: 'stop' });
    }
}

export const app = new BrowserApp();

// 导出原子
export { setupRemoteControl } from './remote.js';
