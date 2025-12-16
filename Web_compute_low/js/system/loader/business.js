/**
 * @fileoverview 业务逻辑设置原子
 * @description 设置模块间的事件协作逻辑
 * @module system/loader/business
 * 
 * 🧱 踩坑记录:
 *    1. [2025-12-17] [已修复] 移除了冗余的事件自转发逻辑 (net:new_intel, net:analysis_result)
 */

import { bus } from '../event_bus.js';

/**
 * 设置业务逻辑
 * 定义各个模块之间如何协作，主要通过事件总线解耦
 */
export function setupBusinessLogic() {
    // 实时画面帧渲染
    let pendingFrame = null;
    let isRendering = false;

    const renderLoop = () => {
        if (pendingFrame) {
            const el = document.getElementById('live-image');
            if (el) {
                el.src = pendingFrame;
                el.style.display = 'block';
            }
            pendingFrame = null;
        }
        isRendering = false;
    };

    bus.on('net:frame', (imgSrc) => {
        pendingFrame = `data:image/jpeg;base64,${imgSrc}`;
        if (!isRendering) {
            isRendering = true;
            requestAnimationFrame(renderLoop);
        }
    });

    // 注意: net:new_intel 和 net:analysis_result 事件由 websocket.js 直接触发
    // 其他模块可以直接监听这些事件，无需在此转发
}
