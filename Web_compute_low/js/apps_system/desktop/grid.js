/**
 * @fileoverview 网格计算原子
 * @description 处理桌面图标的网格布局计算
 * @module apps_system/desktop/grid
 */

/**
 * 网格配置常量
 */
export const GRID_X = 100;
export const GRID_Y = 100;
export const START_X = 20;
export const START_Y = 20;

/**
 * 计算网格列数
 * @returns {number} 列数
 */
export function getCols() {
    return Math.floor((window.innerWidth - START_X) / GRID_X);
}

/**
 * 计算网格行数
 * @returns {number} 行数
 */
export function getRows() {
    return Math.floor((window.innerHeight - START_Y) / GRID_Y);
}

/**
 * 计算图标位置
 * @param {number} col - 列号
 * @param {number} row - 行号
 * @returns {Object} 位置坐标 {x, y}
 */
export function getPosition(col, row) {
    return {
        x: START_X + col * GRID_X,
        y: START_Y + row * GRID_Y
    };
}

/**
 * 从像素坐标计算网格坐标
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @returns {Object} 网格坐标 {col, row}
 */
export function getGridCoord(x, y) {
    let col = Math.round((x - START_X) / GRID_X);
    let row = Math.round((y - START_Y) / GRID_Y);
    if (col < 0) col = 0;
    if (row < 0) row = 0;
    return { col, row };
}
