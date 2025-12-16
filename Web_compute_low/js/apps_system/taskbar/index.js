/**
 * @fileoverview Taskbar 分子入口
 * @description 组合所有任务栏原子，提供统一接口
 * @module apps_system/taskbar/index
 */

import { bus } from '../../system/event_bus.js';
import { updateApps } from './apps.js';
import { renderTrayIcons } from './tray.js';
import { bindStartButton } from './start.js';

export const VERSION = '1.0.0';

export const config = {
    id: 'sys-taskbar',
    name: '任务栏',
    version: '1.0.0',
    type: 'service',
    isSystem: true,
    description: '系统任务栏管理器'
};

/**
 * 初始化任务栏
 */
export function init() {
    updateApps();
    renderTrayIcons();
    bindStartButton();

    // 监听事件
    bus.on('app:opened', () => updateApps());
    bus.on('app:closed', () => updateApps());
    bus.on('window:focus', () => updateApps());
    bus.on('window:blur', () => updateApps());
    bus.on('app:minimized', () => updateApps());
    bus.on('app:updated', () => updateApps());
}

// 导出原子
export { updateApps } from './apps.js';
export { renderTrayIcons } from './tray.js';
export { bindStartButton } from './start.js';
