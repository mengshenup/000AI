/**
 * @fileoverview 个性化配置原子
 * @description 定义个性化应用的配置和壁纸列表
 * @module apps/personalization/config
 */

// 🧱 [2025-12-17] 修复: 壁纸资源移动到 apps/personalization/assets/ 目录
// 应用应该使用自身目录下的资源，而不是依赖系统资源路径
const APP_ASSETS_PATH = 'js/apps/personalization/assets/';

export const WALLPAPERS = [
    { url: `${APP_ASSETS_PATH}wp-0.avif` },
    { url: `${APP_ASSETS_PATH}wp-1.avif` },
    { url: `${APP_ASSETS_PATH}wp-2.avif` },
    { url: `${APP_ASSETS_PATH}wp-3.avif` },
    { url: `${APP_ASSETS_PATH}wp-4.avif` }
];

export const config = {
    id: 'win-personalization',
    name: '个性化',
    version: '1.0.0',
    description: '定制你的专属梦想空间',
    // 🧱 [2025-12-17] 修复: SVG path 语法错误 "0 .59-.22L5.09" 改为 "-.59.22l-2.39-.96...L4.09"
    icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L4.09 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
    color: '#e17055',
    pos: { x: 20, y: 290 },
    winPos: { x: 200, y: 200 },
    width: 500,
    height: 400,
    content: `
        <h4>选择壁纸</h4>
        <div id="wp-grid" style="margin-top:10px;"></div>
        <div style="margin-top:20px;">
            <h4>自定义壁纸</h4>
            <div style="display:flex; gap:10px; margin-top:5px;">
                <input type="text" id="custom-wp" placeholder="输入图片 URL" style="flex:1; padding:5px;">
                <button id="btn-custom-wp" style="padding:5px 10px;">应用</button>
            </div>
        </div>
    `
};
