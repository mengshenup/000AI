/**
 * @fileoverview 渲染原子
 * @description 处理桌面图标的渲染逻辑
 * @module apps_system/desktop/render
 */

import { store } from '../../system/store.js';
import { getCols, getRows, getPosition, getGridCoord, START_X, START_Y, GRID_X, GRID_Y } from './grid.js';
import { createIconElement } from './icon.js';
import { bindContextMenu } from './menu.js';

/**
 * 渲染桌面图标
 */
export function render() {
    const dt = document.getElementById('desktop');
    if (!dt) return;

    // 清除旧图标
    dt.querySelectorAll('.desktop-icon').forEach(e => e.remove());

    // 获取应用源
    const source = Object.keys(store.installedApps).length > 0 
        ? store.installedApps 
        : store.apps;

    const COLS = getCols();
    const ROWS = getRows();
    const occupied = new Set();

    const isOccupied = (c, r) => occupied.has(`${c},${r}`);
    const markOccupied = (c, r) => occupied.add(`${c},${r}`);

    const appsToPlace = [];

    // 1. 处理有保存位置的应用
    Object.entries(source).forEach(([id, app]) => {
        if (app.isSystem) return;
        if (app.showDesktopIcon === false) return;

        const userState = store.apps[id] || {};
        const savedPos = userState.pos || app.pos;

        if (savedPos && (savedPos.x !== undefined || savedPos.y !== undefined)) {
            const { col, row } = getGridCoord(savedPos.x, savedPos.y);

            if (!isOccupied(col, row)) {
                markOccupied(col, row);
                appsToPlace.push({
                    id, app,
                    pos: getPosition(col, row),
                    placed: true
                });
            } else {
                appsToPlace.push({ id, app, placed: false });
            }
        } else {
            appsToPlace.push({ id, app, placed: false });
        }
    });

    // 2. 为未放置的应用寻找空位
    appsToPlace.forEach(item => {
        if (item.placed) return;

        let found = false;
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                if (!isOccupied(c, r)) {
                    markOccupied(c, r);
                    item.pos = getPosition(c, r);
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            item.pos = { x: START_X, y: START_Y };
        }
    });

    // 3. 渲染图标
    appsToPlace.forEach(item => {
        const { id, app, pos } = item;
        const el = createIconElement(id, app, pos);
        bindContextMenu(el, id, app);
        dt.appendChild(el);
    });
}
