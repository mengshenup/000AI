import { store } from './store.js';
import { bus } from './event_bus.js';
import { WALLPAPERS, DEFAULT_WALLPAPER } from './config.js';

export class WindowManager {
    constructor() {
        // 拖拽状态
        this.dragState = {
            active: false,
            isDragging: false, // 真正开始拖拽的标记
            startX: 0,         // 记录初始点击位置
            startY: 0,
            item: null,     // 被拖拽的 DOM 元素
            type: null,     // 'window' 或 'icon'
            offsetX: 0,
            offsetY: 0
        };

        // 绑定上下文
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    init() {
        this.loadWallpaper();
        this.renderDesktopIcons();
        this.updateTaskbar();
        this.initWallpaperApp();
        this.restoreWindows();
        this.setupGlobalEvents(); // 统一事件监听
    }

    // === 1. 初始化与渲染 ===

    loadWallpaper() {
        const savedWp = localStorage.getItem('seraphim_wallpaper') || `url('${DEFAULT_WALLPAPER}')`;
        document.documentElement.style.setProperty('--bg-wallpaper', savedWp);
    }

    renderDesktopIcons() {
        const dt = document.getElementById('desktop');
        // 清除旧图标 (保留窗口 DOM)
        dt.querySelectorAll('.desktop-icon').forEach(e => e.remove());

        Object.entries(store.apps).forEach(([id, app]) => {
            const el = document.createElement('div');
            el.className = 'desktop-icon';
            el.id = `icon-${id}`;
            el.style.left = `${app.pos.x}px`;
            el.style.top = `${app.pos.y}px`;
            el.dataset.id = id; // 用于事件委托
            el.dataset.type = 'icon';

            el.innerHTML = `
                <svg class="icon-svg" viewBox="0 0 24 24" fill="${app.color}">
                    <path d="${app.iconPath}"/>
                </svg>
                <div class="icon-text">${app.name}</div>
            `;
            dt.appendChild(el);
        });
    }

    initWallpaperApp() {
        const grid = document.getElementById('wp-grid');
        if (!grid) return;
        grid.innerHTML = '';
        WALLPAPERS.forEach(wp => {
            const el = document.createElement('div');
            el.className = 'wp-item';
            el.style.backgroundImage = `url('${wp.url}')`;
            el.onclick = () => this.changeWallpaper(wp.url, el);
            grid.appendChild(el);
        });
    }

    restoreWindows() {
        Object.entries(store.apps).forEach(([id, app]) => {
            const win = document.getElementById(id);
            if (win) {
                if (app.winPos) {
                    win.style.left = `${app.winPos.x}px`;
                    win.style.top = `${app.winPos.y}px`;
                }
                if (app.isOpen) this.openApp(id, false);
            }
        });
    }

    // === 2. 事件委托与交互 ===

    setupGlobalEvents() {
        // 全局点击委托 (处理关闭、最小化、点击图标)
        document.addEventListener('click', (e) => {
            const target = e.target;

            // 窗口控制按钮
            if (target.closest('.close-btn')) {
                const win = target.closest('.window');
                if (win) this.closeApp(win.id);
            } else if (target.closest('.min-btn')) {
                const win = target.closest('.window');
                if (win) this.minimizeApp(win.id);
            }

            // 任务栏图标
            const taskItem = target.closest('.task-app');
            if (taskItem) {
                const id = taskItem.dataset.id;
                this.toggleApp(id);
            }
        });

        // 双击图标打开
        document.addEventListener('dblclick', (e) => {
            const icon = e.target.closest('.desktop-icon');
            if (icon) {
                this.openApp(icon.dataset.id);
            }
        });

        // 拖拽开始监听
        document.addEventListener('mousedown', (e) => {
            // 1. 窗口标题栏拖拽
            const titleBar = e.target.closest('.title-bar');
            if (titleBar) {
                const win = titleBar.closest('.window');
                if (win && !e.target.closest('.win-controls')) { // 避开控制按钮
                    this.startDrag(e, win, 'window');
                }
                return;
            }

            // 2. 桌面图标拖拽
            const icon = e.target.closest('.desktop-icon');
            if (icon) {
                this.startDrag(e, icon, 'icon');
                return;
            }

            // 3. 点击窗口置顶
            const winClick = e.target.closest('.window');
            if (winClick) {
                this.bringToFront(winClick.id);
            }
        });
    }

    // === 3. 修复后的拖拽逻辑 ===

    startDrag(e, element, type) {
        // e.preventDefault(); // 移除：不要立即阻止默认行为，否则无法双击
        // this.bringToFront(element.id); // 移除：真正拖拽时再置顶

        this.dragState.active = true; // 标记为"准备拖拽"
        this.dragState.isDragging = false; // 尚未真正移动
        this.dragState.item = element;
        this.dragState.type = type;

        this.dragState.startX = e.clientX;
        this.dragState.startY = e.clientY;

        const rect = element.getBoundingClientRect();
        this.dragState.offsetX = e.clientX - rect.left;
        this.dragState.offsetY = e.clientY - rect.top;

        // 添加临时全局监听
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);

        // 注意：不要立即显示遮罩层，否则会阻挡 click/dblclick
    }

    handleMouseMove(e) {
        if (!this.dragState.active) return;

        // 检查是否超过阈值 (5px)
        if (!this.dragState.isDragging) {
            const dx = Math.abs(e.clientX - this.dragState.startX);
            const dy = Math.abs(e.clientY - this.dragState.startY);
            if (dx < 5 && dy < 5) return; // 未超过阈值，视为点击/双击准备中

            // 超过阈值，开始真正拖拽
            this.dragState.isDragging = true;
            this.bringToFront(this.dragState.item.id); // 此时再置顶

            // 显示遮罩层
            const overlay = document.getElementById('drag-overlay');
            if (overlay) overlay.style.display = 'block';
        }

        e.preventDefault(); // 真正拖拽时阻止默认行为

        let x = e.clientX - this.dragState.offsetX;
        let y = e.clientY - this.dragState.offsetY;

        // 简单边界限制 (防止拖出屏幕左上角)
        if (y < 0) y = 0;

        this.dragState.item.style.left = `${x}px`;
        this.dragState.item.style.top = `${y}px`;
    }

    handleMouseUp() {
        if (!this.dragState.active) return;

        // 只有真正拖拽过才保存位置
        if (this.dragState.isDragging) {
            // 保存位置
            const x = parseInt(this.dragState.item.style.left);
            const y = parseInt(this.dragState.item.style.top);
            const id = this.dragState.item.id.replace('icon-', '');

            if (this.dragState.type === 'window') {
                store.updateApp(id, { winPos: { x, y } });
            } else if (this.dragState.type === 'icon') {
                store.updateApp(id, { pos: { x, y } });
            }
        }

        // 清理状态
        this.dragState.active = false;
        this.dragState.isDragging = false;
        this.dragState.item = null;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);

        const overlay = document.getElementById('drag-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // === 4. 窗口操作 ===

    openApp(id, speak = true) {
        const win = document.getElementById(id);
        if (!win) return;

        win.classList.remove('minimized');
        win.classList.add('open');
        this.bringToFront(id);
        store.updateApp(id, { isOpen: true });

        if (speak) {
            const appInfo = store.getApp(id);
            bus.emit('system:speak', appInfo.openMsg || `打开 ${appInfo.name}`);
        }
        this.updateTaskbar();
    }

    closeApp(id) {
        const win = document.getElementById(id);
        if (!win) return;

        win.classList.remove('open', 'minimized');
        store.updateApp(id, { isOpen: false });
        this.updateTaskbar();
    }

    minimizeApp(id) {
        const win = document.getElementById(id);
        if (win) win.classList.add('minimized');
        this.updateTaskbar();
    }

    toggleApp(id) {
        const win = document.getElementById(id);
        if (!win.classList.contains('open')) {
            this.openApp(id);
        } else if (win.classList.contains('minimized')) {
            this.openApp(id);
        } else if (win.style.zIndex >= 100) {
            this.minimizeApp(id);
        } else {
            this.bringToFront(id);
        }
    }

    bringToFront(id) {
        // 简单粗暴的 Z-Index 管理
        document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
        const current = document.getElementById(id);
        if (current && current.classList.contains('window')) current.style.zIndex = 100;
        // 图标不需要置顶管理，始终在底层
        this.updateTaskbar();
    }

    changeWallpaper(url, el) {
        const bgStyle = `url('${url}')`;
        document.documentElement.style.setProperty('--bg-wallpaper', bgStyle);
        localStorage.setItem('seraphim_wallpaper', bgStyle);
        if (el) {
            document.querySelectorAll('.wp-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');
        }
        bus.emit('system:speak', "壁纸换好啦！🌿");
    }

    updateTaskbar() {
        const container = document.getElementById('taskbar-apps');
        container.innerHTML = '';

        Object.entries(store.apps).forEach(([id, app]) => {
            const win = document.getElementById(id);
            // 仅当窗口打开时显示在任务栏 (仿Windows) 或者一直显示(仿Mac Dock)
            // 这里采用一直显示模式
            const div = document.createElement('div');
            div.className = 'task-app';
            div.dataset.id = id;
            div.innerHTML = `<svg style="width:24px;fill:${app.color}" viewBox="0 0 24 24"><path d="${app.iconPath}"/></svg>`;

            if (win && win.classList.contains('open')) {
                div.classList.add('running');
                if (!win.classList.contains('minimized') && win.style.zIndex >= 100) {
                    div.classList.add('active');
                }
            }
            container.appendChild(div);
        });
    }
}