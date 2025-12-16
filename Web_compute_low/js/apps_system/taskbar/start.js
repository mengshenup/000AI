/**
 * @fileoverview 开始按钮原子
 * @description 处理开始按钮的绑定
 * @module apps_system/taskbar/start
 */

import { bus } from '../../system/event_bus.js';

/**
 * 绑定开始按钮
 */
export function bindStartButton() {
    const btnStart = document.getElementById('btn-start');
    if (!btnStart) return;

    btnStart.onclick = () => {
        console.log("[Taskbar] Start button clicked");
        const userId = localStorage.getItem('current_user_id');
        console.log("[Taskbar] Current User ID:", userId);

        if (userId) {
            console.log("[Taskbar] Emitting system:open_key_mgr");
            bus.emit('system:open_key_mgr');
        } else {
            console.log("[Taskbar] Emitting system:open_login");
            bus.emit('system:open_login');
        }
    };
}
