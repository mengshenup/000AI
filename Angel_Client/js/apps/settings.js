import { WALLPAPERS } from '../config.js';

export const config = {
    id: 'win-settings',
    name: 'Reality Shaper',
    icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0 .59.22L5.09 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
    color: '#e17055',
    pos: { x: 20, y: 290 },
    winPos: { x: 200, y: 200 },
    openMsg: "正在重塑现实参数... ⚙️",
    content: `
        <h4>选择壁纸</h4>
        <div id="wp-grid" style="margin-top:10px;">
            <!-- 壁纸列表由 JS 动态生成 -->
        </div>
        <div style="margin-top:20px;">
            <h4>自定义壁纸</h4>
            <div style="display:flex; gap:10px; margin-top:5px;">
                <input type="text" id="custom-wp" placeholder="输入图片 URL" style="flex:1; padding:5px;">
                <button id="btn-custom-wp" style="padding:5px 10px;">应用</button>
            </div>
        </div>
    `
};

//     管理“个性化设置”APP的业务逻辑。目前主要负责处理自定义壁纸的设置。
//
//  易懂解释：
//     装修师傅。帮你把家里的墙纸换成你喜欢的样子。
//
//  警告：
//     依赖于 DOM 中的 btn-custom-wp 和 custom-wp 元素。
// ---------------------------------------------------------------- //

import { wm } from '../window_manager.js';

export const APP_NAME = 'Reality Shaper';
export const APP_OPEN_MSG = "正在重塑现实参数... ⚙️";

class SettingsApp {
    constructor() {
        // 监听窗口就绪事件，替代 setTimeout
        bus.on(`app:ready:${config.id}`, () => this.init());
    }

    init() {
        // ---------------------------------------------------------------- //
        //  初始化()
        //
        //  函数用处：
        //     绑定设置界面相关的事件监听器。
        //
        //  易懂解释：
        //     师傅准备好工具，等着你下命令。
        // ---------------------------------------------------------------- //
        this.bindEvents(); // 绑定事件
        this.initWallpaperGrid(); // 初始化壁纸网格
    }

    bindEvents() {
        // ---------------------------------------------------------------- //
        //  绑定事件()
        //
        //  函数用处：
        //     给“应用自定义壁纸”按钮绑定点击事件。
        //
        //  易懂解释：
        //     当你点了“确定换壁纸”按钮，师傅就开始干活。
        // ---------------------------------------------------------------- //

        // === 自定义壁纸按钮 ===
        // 使用可选链 ?. 防止元素不存在时报错
        document.getElementById('btn-custom-wp')?.addEventListener('click', () => {
            const url = document.getElementById('custom-wp')?.value; // 获取输入的图片 URL
            if (url) wm.changeWallpaper(url); // 如果有 URL，调用窗口管理器更换壁纸
        });
    }

    initWallpaperGrid() {
        const grid = document.getElementById('wp-grid'); // 获取壁纸网格容器
        if (!grid) return; // 如果容器不存在则跳过
        grid.innerHTML = ''; // 清空容器

        // 遍历配置中的壁纸列表
        WALLPAPERS.forEach(wp => {
            const el = document.createElement('div');
            el.className = 'wp-item'; // 设置类名
            el.style.backgroundImage = `url('${wp.url}')`; // 设置缩略图
            // 点击时调用 changeWallpaper 切换壁纸
            el.onclick = () => wm.changeWallpaper(wp.url, el);
            grid.appendChild(el); // 添加到网格
        });
    }
}

export const app = new SettingsApp();
