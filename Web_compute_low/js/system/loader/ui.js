/**
 * @fileoverview UI 绑定原子
 * @description 处理特定 UI 元素的事件绑定
 * @module system/loader/ui
 */

import { bus } from '../event_bus.js';
import { store } from '../store.js';

/**
 * 设置 UI 绑定
 */
export function setupUIBindings() {
    // 绑定扫描按钮
    document.getElementById('btn-scan')?.addEventListener('click', () => {
        bus.emit('cmd:scan');
    });
}

/**
 * 启动时钟
 */
export function startClock() {
    setInterval(() => {
        const clock = document.getElementById('clock-time');
        if (clock) {
            clock.innerText = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }, 1000);
}

/**
 * 暴露调试函数
 */
export function exposeDebugFunctions() {
    // 暴露核心对象到window（用于调试）
    window.store = store;
    window.bus = bus;
    
    window.resetSystem = async () => {
        if (confirm("⚠️ 确定要重置所有系统状态吗？")) {
            console.log("🔄 正在重置系统状态...");
            await store.reset();
            console.log("✅ 系统状态已重置，正在刷新页面...");
            // 延迟刷新，确保数据写入完成
            setTimeout(() => {
                location.reload();
            }, 500);
        }
    };
    console.log("💡 提示: 在控制台输入 resetSystem() 可重置系统状态");
    console.log("💡 调试对象: window.store, window.bus, window.wm");
}
