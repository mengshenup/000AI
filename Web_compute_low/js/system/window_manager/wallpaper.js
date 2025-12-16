/**
 * @fileoverview Wallpaper - 壁纸管理原子
 * @description 处理壁纸加载和切换
 * @module system/window_manager/wallpaper
 */

import { DEFAULT_WALLPAPER } from '../config.js';
import { bus } from '../event_bus.js';

/**
 * 加载壁纸
 * 
 * 🧱 [2025-12-17] 修复: 添加图片预加载和错误处理，防止 ERR_CONTENT_LENGTH_MISMATCH
 */
export function loadWallpaper() {
    let savedWp = localStorage.getItem('seraphim_wallpaper');
    
    if (!savedWp) {
        savedWp = DEFAULT_WALLPAPER;
    }

    // 清理 url() 包装，获取纯路径
    let imgPath = savedWp.trim();
    if (imgPath.startsWith("url(")) {
        imgPath = imgPath.slice(4, -1).replace(/['"]/g, '');
    }
    
    const desktop = document.getElementById('desktop');
    if (!desktop) return;
    
    // 预加载图片，成功后再设置背景
    const img = new Image();
    img.onload = () => {
        desktop.style.backgroundImage = `url('${imgPath}')`;
    };
    img.onerror = () => {
        console.warn(`⚠️ 壁纸加载失败: ${imgPath}，使用默认壁纸`);
        desktop.style.backgroundImage = `url('${DEFAULT_WALLPAPER}')`;
        localStorage.removeItem('seraphim_wallpaper');
    };
    img.src = imgPath;
}

/**
 * 更换壁纸
 * @param {string} url - 图片 URL
 * @param {HTMLElement} [el] - 被点击的元素
 */
export function changeWallpaper(url, el) {
    if (!url) return;
    
    let bgStyle = url.trim();
    if (!bgStyle.startsWith('url(')) {
        bgStyle = `url('${bgStyle}')`;
    }

    const desktop = document.getElementById('desktop');
    if (desktop) desktop.style.backgroundImage = bgStyle;
    localStorage.setItem('seraphim_wallpaper', bgStyle);

    if (el) {
        document.querySelectorAll('.wp-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
    }
    
    bus.emit('system:speak', "壁纸换好啦！🌿");
}
