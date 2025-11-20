// Angel_Client/js/config.js

// === 核心配置：资源根路径 ===
export const ASSET_BASE = '/assets'; 
export const WS_URL = "ws://localhost:8000/ws";

// === 修复点：补全所有壁纸列表，不再省略 ===
export const WALLPAPERS = [
    { url: `${ASSET_BASE}/wp-0.avif`, name: '风之甬道' },
    { url: `${ASSET_BASE}/wp-1.avif`, name: '绿色田野' },
    { url: `${ASSET_BASE}/wp-2.avif`, name: '晨雾森林' },
    { url: `${ASSET_BASE}/wp-3.avif`, name: '阳光穿透' },
    { url: `${ASSET_BASE}/wp-4.avif`, name: '远山呼唤' }
];

// 导出默认壁纸路径
export const DEFAULT_WALLPAPER = WALLPAPERS[0].url;

export const ANGEL_QUOTES = [
    "创造者，今天也要元气满满哦！✨",
    "零号大坝那边好危险，不过为了创造者，我不怕！🛡️",
    "那个... 创造者，我今天的裙子好看吗？👗",
    "无论遇到什么困难，我都在你身边！💖",
    "正在努力搜索老六点位... 呼呼~ 💨",
    "随时待命！我的创造者！💖"
];

export const DEFAULT_APPS = {
    'win-seed': { 
        name: '情报站', 
        desc: '搜集老六点位', 
        openMsg: '正在为你搜寻老六点位，创造者！📍', 
        iconPath: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z', 
        color: '#FF9A9E', 
        pos: {x: 30, y: 30}, 
        isOpen: false, 
        winPos: {x: 100, y: 100},
        winTitleSuffix: ''
    },
    'win-angel': { 
        name: '观察眼', 
        desc: '实时画面', 
        openMsg: '视觉同步中... 让我看看！👀', 
        iconPath: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z', 
        color: '#20bf6b', 
        pos: {x: 30, y: 140}, 
        isOpen: false, 
        winPos: {x: 150, y: 150},
        winTitleSuffix: ''
    },
    'win-manual': { 
        name: '手册', 
        desc: '协议文档', 
        openMsg: '正在翻阅手册... 📖', 
        iconPath: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z', 
        color: '#ff6b6b', 
        pos: {x: 30, y: 250}, 
        isOpen: false, 
        winPos: {x: 200, y: 200},
        winTitleSuffix: ''
    },
    'win-settings': { 
        name: '个性化', 
        desc: '系统设置', 
        openMsg: '要换个新环境吗？🎨', 
        iconPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z', 
        color: '#a55eea', 
        pos: {x: 30, y: 360}, 
        isOpen: false, 
        winPos: {x: 250, y: 250},
        winTitleSuffix: ''
    }
};