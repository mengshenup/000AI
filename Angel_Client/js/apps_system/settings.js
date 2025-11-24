import { WALLPAPERS } from '../config.js'; // 💖 导入壁纸配置列表

export const config = {
    // =================================
    //  🎉 设置配置 (ID, 名称, 图标...)
    //
    //  🎨 代码用途：
    //     定义“现实重塑者”设置应用的基础元数据和界面结构
    //
    //  💡 易懂解释：
    //     这是你的“装修工具箱”！想换个心情？来这里挑一张好看的壁纸吧~ 🎨
    //
    //  ⚠️ 警告：
    //     壁纸列表容器 ID 为 wp-grid，自定义壁纸输入框 ID 为 custom-wp。
    // =================================
    id: 'win-settings', // 💖 窗口的唯一标识符
    name: '美好工坊', // 💖 窗口标题栏显示的名称
    description: '定制你的专属梦想空间', // 💖 功能描述
    icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0 .59-.22L5.09 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z', // 💖 SVG 图标路径（齿轮形状）
    color: '#e17055', // 💖 窗口的主题颜色（橙色）
    pos: { x: 20, y: 290 }, // 💖 桌面图标的默认位置
    winPos: { x: 200, y: 200 }, // 💖 窗口打开时的默认屏幕坐标
    // openMsg: "欢迎来到美好工坊，来打造你的专属空间吧！🎨", // 💖 已移除，统一由 angel.js 管理
    content: `
        <h4>选择壁纸</h4>
        <!-- 💖 壁纸网格容器 -->
        <div id="wp-grid" style="margin-top:10px;">
            <!-- 壁纸列表由 JS 动态生成 -->
        </div>
        <div style="margin-top:20px;">
            <h4>自定义壁纸</h4>
            <div style="display:flex; gap:10px; margin-top:5px;">
                <!-- 💖 自定义壁纸输入框 -->
                <input type="text" id="custom-wp" placeholder="输入图片 URL" style="flex:1; padding:5px;">
                <!-- 💖 应用按钮 -->
                <button id="btn-custom-wp" style="padding:5px 10px;">应用</button>
            </div>
        </div>
        <hr style="margin:20px 0; border:0; border-top:1px solid #eee;">
        <h4>系统性能设置</h4>
        <div style="margin-top:10px;">
            <label style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                <input type="radio" name="perf-mode" value="high" checked>
                <div>
                    <b>🚀 高性能模式</b>
                    <div style="font-size:0.8em; color:#666;">60 FPS，开启抗锯齿，画质优先</div>
                </div>
            </label>
            <label style="display:flex; align-items:center; gap:10px;">
                <input type="radio" name="perf-mode" value="low">
                <div>
                    <b>🍃 节能模式</b>
                    <div style="font-size:0.8em; color:#666;">30 FPS，关闭特效，适合低配设备</div>
                </div>
            </label>
        </div>
    `
};

import { wm } from '../window_manager.js'; // 💖 导入窗口管理器
import { bus } from '../event_bus.js'; // 💖 导入事件总线

export const APP_NAME = 'Workshop'; // 💖 导出应用名称常量

// =================================
//  🎉 配置管理器 (ConfigManager)
//  🎨 负责统一管理系统配置的读取与保存
// =================================
class ConfigManager {
    constructor() {
        this.config = {
            perfMode: localStorage.getItem('angel_performance_mode') || 'high'
        };
    }

    set(key, value) {
        this.config[key] = value;
        if (key === 'perfMode') {
            localStorage.setItem('angel_performance_mode', value);
            bus.emit('config:changed', { key, value });
        }
    }

    get(key) {
        return this.config[key];
    }
}

export const configManager = new ConfigManager();

class SettingsApp {
    // =================================
    //  🎉 设置应用类 (无参数)
    //
    //  🎨 代码用途：
    //     管理“个性化设置”APP的业务逻辑，主要负责处理壁纸的切换和自定义
    //
    //  💡 易懂解释：
    //     装修师傅！帮你把家里的墙纸换成你喜欢的样子~ 👷‍♂️
    //
    //  ⚠️ 警告：
    //     依赖于 DOM 中的 btn-custom-wp 和 custom-wp 元素。
    // =================================
    constructor() {
        // 监听窗口就绪事件，替代 setTimeout
        bus.on(`app:ready:${config.id}`, () => this.init()); // 💖 注册初始化回调
    }

    // =================================
    //  🎉 初始化函数 (无参数)
    //
    //  🎨 代码用途：
    //     绑定设置界面相关的事件监听器，并渲染壁纸网格
    //
    //  💡 易懂解释：
    //     师傅准备好工具，把样板间（壁纸列表）摆出来，等着你下命令~ 🛠️
    //
    //  ⚠️ 警告：
    //     无
    // =================================
    init() {
        this.bindEvents(); // 💖 绑定事件
        this.initWallpaperGrid(); // 💖 初始化壁纸网格
        this.initPerfSettings(); // 💖 初始化性能设置
    }

    // =================================
    //  🎉 初始化性能设置
    // =================================
    initPerfSettings() {
        const currentMode = configManager.get('perfMode');
        const radios = document.getElementsByName('perf-mode');
        
        radios.forEach(radio => {
            if (radio.value === currentMode) radio.checked = true;
            
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    configManager.set('perfMode', e.target.value);
                    bus.emit('system:speak', `已切换至${e.target.value === 'high' ? '高性能' : '节能'}模式`);
                }
            });
        });
    }

    // =================================
    //  🎉 绑定事件 (无参数)
    //
    //  🎨 代码用途：
    //     给“应用自定义壁纸”按钮绑定点击事件
    //
    //  💡 易懂解释：
    //     当你点了“确定换壁纸”按钮，师傅就开始干活啦！🔨
    //
    //  ⚠️ 警告：
    //     使用了可选链 ?. 防止元素不存在时报错。
    // =================================
    bindEvents() {
        // === 自定义壁纸按钮 ===
        // 使用可选链 ?. 防止元素不存在时报错
        document.getElementById('btn-custom-wp')?.addEventListener('click', () => {
            const url = document.getElementById('custom-wp')?.value; // 💖 获取输入的图片 URL
            if (url) wm.changeWallpaper(url); // 💖 如果有 URL，调用窗口管理器更换壁纸
        });
    }

    // =================================
    //  🎉 初始化壁纸网格 (无参数)
    //
    //  🎨 代码用途：
    //     根据配置动态生成壁纸缩略图列表
    //
    //  💡 易懂解释：
    //     把所有好看的壁纸都贴在墙上让你挑，点一下就换上！🖼️
    //
    //  ⚠️ 警告：
    //     依赖 DOM 元素 ID wp-grid。
    // =================================
    initWallpaperGrid() {
        const grid = document.getElementById('wp-grid'); // 💖 获取壁纸网格容器 DOM
        if (!grid) return; // 💖 如果容器不存在则跳过
        grid.innerHTML = ''; // 💖 清空容器现有内容

        // 遍历配置中的壁纸列表
        WALLPAPERS.forEach(wp => {
            const el = document.createElement('div'); // 💖 创建壁纸项容器
            el.className = 'wp-item'; // 💖 设置 CSS 类名
            el.style.backgroundImage = `url('${wp.url}')`; // 💖 设置背景图片为缩略图
            // 点击时调用 changeWallpaper 切换壁纸
            el.onclick = () => wm.changeWallpaper(wp.url, el); // 💖 绑定点击事件
            grid.appendChild(el); // 💖 将壁纸项添加到网格中
        });
    }
}

export const app = new SettingsApp(); // 💖 导出应用实例
