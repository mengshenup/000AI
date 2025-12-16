/**
 * @fileoverview 远程控制原子
 * @description 处理远程屏幕的鼠标交互
 * @module apps/browser/remote
 */

import { network } from '../../system/network.js';
import { config } from './config.js';

let isDragging = false;
let lastMoveTime = 0;

/**
 * 设置远程控制
 * @param {WindowManager} wm - 窗口管理器
 */
export function setupRemoteControl(wm) {
    const progressBar = document.getElementById('video-progress-bar');
    const remoteScreen = document.getElementById('remote-screen');

    if (remoteScreen && progressBar) {
        remoteScreen.addEventListener('mouseenter', () => progressBar.style.display = 'block');
        remoteScreen.addEventListener('mouseleave', () => progressBar.style.display = 'none');
    }

    if (remoteScreen) {
        remoteScreen.addEventListener('mousedown', (e) => {
            // 🧱 [2025-12-17] 修复: 添加 wm 和 activeWindowId 安全检查
            if (!wm || wm.activeWindowId !== config.id) return;

            network.send({ type: 'stream_control', action: 'start' });

            const overlay = document.getElementById('browser-status-overlay');
            if (overlay) overlay.style.display = 'none';

            if (e.target.closest('#video-progress-bar')) return;

            const img = document.getElementById('live-image');
            if (!img) return;

            const r = img.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;

            isDragging = true;
            network.send({ type: 'mouse_down', x, y });
        });

        remoteScreen.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const now = Date.now();
            if (now - lastMoveTime < 50) return;
            lastMoveTime = now;

            const img = document.getElementById('live-image');
            if (!img) return;

            const r = img.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;

            network.send({ type: 'mouse_move', x, y });
        });

        const endDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;

            const img = document.getElementById('live-image');
            if (!img) {
                network.send({ type: 'mouse_up', x: 0, y: 0 });
                return;
            }

            const r = img.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;

            network.send({ type: 'mouse_up', x, y });
        };

        remoteScreen.addEventListener('mouseup', endDrag);
        remoteScreen.addEventListener('mouseleave', endDrag);
    }
}
