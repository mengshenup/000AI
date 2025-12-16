/**
 * @fileoverview FPS 分子入口
 * @description FPS 监控服务
 * @module apps_system/fps/index
 */

import { createCapsule } from '../../system/capsule_manager.js';

export const VERSION = '1.0.0';

export const config = {
    id: 'svc-fps',
    name: '帧率监控',
    version: '1.0.0',
    description: '实时监控系统渲染帧率',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    color: '#636e72',
    system: true,
    type: 'service',
    showDesktopIcon: false,
    showTaskbarIcon: false,
    isOpen: true
};

export function init() {
    createCapsule({
        serviceConfig: config,
        html: 'FPS: --',
        onMount: (el) => {
            el.style.color = '#666';
            el.style.fontWeight = 'bold';
            el.style.fontFamily = 'monospace';

            let frameCount = 0;
            let lastTime = performance.now();
            let fps = 0;

            const loop = () => {
                frameCount++;
                const now = performance.now();
                if (now - lastTime >= 1000) {
                    fps = frameCount;
                    frameCount = 0;
                    lastTime = now;
                    el.innerText = `FPS: ${fps}`;

                    if (fps < 30) el.style.color = '#d63031';
                    else if (fps < 50) el.style.color = '#e17055';
                    else el.style.color = '#00b894';
                }
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        },
        onClick: () => {
            console.log('FPS Capsule Clicked');
        }
    });
}
