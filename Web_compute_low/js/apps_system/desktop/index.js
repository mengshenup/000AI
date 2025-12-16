/**
 * @fileoverview Desktop 分子入口
 * @description 组合所有桌面原子，提供统一接口
 * @module apps_system/desktop/index
 */

import { bus } from '../../system/event_bus.js';
import { render } from './render.js';

export const VERSION = '1.0.0';

export const config = {
    id: 'sys-desktop',
    name: '桌面',
    version: '1.0.0',
    type: 'service',
    isSystem: true,
    description: '系统桌面图标管理器'
};

/**
 * 初始化桌面
 */
export function init() {
    render();
    bus.on('app:renamed', () => render());
    bus.on('system:apps_loaded', () => render());
}

// 导出原子
export { render };
export { getCols, getRows, getPosition, getGridCoord } from './grid.js';
export { createIconElement, getIconData } from './icon.js';
export { bindContextMenu } from './menu.js';
