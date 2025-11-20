import { store } from './store.js';
import { bus } from './event_bus.js';
import { WALLPAPERS, DEFAULT_WALLPAPER } from './config.js';

export class WindowManager {
    constructor() {
        // 鎷栨嫿鐘舵€?        this.dragState = {
            active: false,
            isDragging: false, // 鐪熸寮€濮嬫嫋鎷界殑鏍囪
            startX: 0,         // 璁板綍鍒濆鐐瑰嚮浣嶇疆
            startY: 0,
            item: null,     // 琚嫋鎷界殑 DOM 鍏冪礌
            type: null,     // 'window' 鎴?'icon'
            offsetX: 0,
            offsetY: 0
        };

        // 缁戝畾涓婁笅鏂?        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    init() {
        this.loadWallpaper();
        this.renderDesktopIcons();
        this.updateTaskbar();
        this.initWallpaperApp();
        this.restoreWindows();
        this.setupGlobalEvents(); // 缁熶竴浜嬩欢鐩戝惉
    }

    // === 1. 鍒濆鍖栦笌娓叉煋 ===

    loadWallpaper() {
        const savedWp = localStorage.getItem('seraphim_wallpaper') || `url('${DEFAULT_WALLPAPER}')`;
        document.documentElement.style.setProperty('--bg-wallpaper', savedWp);
    }

    renderDesktopIcons() {
        const dt = document.getElementById('desktop');
        // 娓呴櫎鏃у浘鏍?(淇濈暀绐楀彛 DOM)
        dt.querySelectorAll('.desktop-icon').forEach(e => e.remove());

        Object.entries(store.apps).forEach(([id, app]) => {
            const el = document.createElement('div');
            el.className = 'desktop-icon';
            el.id = `icon-${id}`;
            el.style.left = `${app.pos.x}px`;
            el.style.top = `${app.pos.y}px`;
            el.dataset.id = id; // 鐢ㄤ簬浜嬩欢濮旀墭
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

    // === 2. 浜嬩欢濮旀墭涓庝氦浜?===

    setupGlobalEvents() {
        // 鍏ㄥ眬鐐瑰嚮濮旀墭 (澶勭悊鍏抽棴銆佹渶灏忓寲銆佺偣鍑诲浘鏍?
        document.addEventListener('click', (e) => {
            const target = e.target;

            // 绐楀彛鎺у埗鎸夐挳
            if (target.closest('.close-btn')) {
                const win = target.closest('.window');
                if (win) this.closeApp(win.id);
            } else if (target.closest('.min-btn')) {
                const win = target.closest('.window');
                if (win) this.minimizeApp(win.id);
            }

            // 浠诲姟鏍忓浘鏍?            const taskItem = target.closest('.task-app');
            if (taskItem) {
                const id = taskItem.dataset.id;
                this.toggleApp(id);
            }
        });

        // 鍙屽嚮鍥炬爣鎵撳紑
        document.addEventListener('dblclick', (e) => {
            const icon = e.target.closest('.desktop-icon');
            if (icon) {
                this.openApp(icon.dataset.id);
            }
        });

        // 鎷栨嫿寮€濮嬬洃鍚?        document.addEventListener('mousedown', (e) => {
            // 1. 绐楀彛鏍囬鏍忔嫋鎷?            const titleBar = e.target.closest('.title-bar');
            if (titleBar) {
                const win = titleBar.closest('.window');
                if (win && !e.target.closest('.win-controls')) { // 閬垮紑鎺у埗鎸夐挳
                    this.startDrag(e, win, 'window');
                }
                return;
            }

            // 2. 妗岄潰鍥炬爣鎷栨嫿
            const icon = e.target.closest('.desktop-icon');
            if (icon) {
                this.startDrag(e, icon, 'icon');
                return;
            }

            // 3. 鐐瑰嚮绐楀彛缃《
            const winClick = e.target.closest('.window');
            if (winClick) {
                this.bringToFront(winClick.id);
            }
        });
    }

    // === 3. 淇鍚庣殑鎷栨嫿閫昏緫 ===

    startDrag(e, element, type) {
        // e.preventDefault(); // 绉婚櫎锛氫笉瑕佺珛鍗抽樆姝㈤粯璁よ涓猴紝鍚﹀垯鏃犳硶鍙屽嚮
        // this.bringToFront(element.id); // 绉婚櫎锛氱湡姝ｆ嫋鎷芥椂鍐嶇疆椤?
        this.dragState.active = true; // 鏍囪涓?鍑嗗鎷栨嫿"
        this.dragState.isDragging = false; // 灏氭湭鐪熸绉诲姩
        this.dragState.item = element;
        this.dragState.type = type;

        this.dragState.startX = e.clientX;
        this.dragState.startY = e.clientY;

        const rect = element.getBoundingClientRect();
        this.dragState.offsetX = e.clientX - rect.left;
        this.dragState.offsetY = e.clientY - rect.top;

        // 娣诲姞涓存椂鍏ㄥ眬鐩戝惉
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);

        // 娉ㄦ剰锛氫笉瑕佺珛鍗虫樉绀洪伄缃╁眰锛屽惁鍒欎細闃绘尅 click/dblclick
    }

    handleMouseMove(e) {
        if (!this.dragState.active) return;

        // 妫€鏌ユ槸鍚﹁秴杩囬槇鍊?(5px)
        if (!this.dragState.isDragging) {
            const dx = Math.abs(e.clientX - this.dragState.startX);
            const dy = Math.abs(e.clientY - this.dragState.startY);
            if (dx < 5 && dy < 5) return; // 鏈秴杩囬槇鍊硷紝瑙嗕负鐐瑰嚮/鍙屽嚮鍑嗗涓?
            // 瓒呰繃闃堝€硷紝寮€濮嬬湡姝ｆ嫋鎷?            this.dragState.isDragging = true;
            this.bringToFront(this.dragState.item.id); // 姝ゆ椂鍐嶇疆椤?
            // 鏄剧ず閬僵灞?            const overlay = document.getElementById('drag-overlay');
            if (overlay) overlay.style.display = 'block';
        }

        e.preventDefault(); // 鐪熸鎷栨嫿鏃堕樆姝㈤粯璁よ涓?
        let x = e.clientX - this.dragState.offsetX;
        let y = e.clientY - this.dragState.offsetY;

        // 绠€鍗曡竟鐣岄檺鍒?(闃叉鎷栧嚭灞忓箷宸︿笂瑙?
        if (y < 0) y = 0;

        this.dragState.item.style.left = `${x}px`;
        this.dragState.item.style.top = `${y}px`;
    }

    handleMouseUp() {
        if (!this.dragState.active) return;

        // 鍙湁鐪熸鎷栨嫿杩囨墠淇濆瓨浣嶇疆
        if (this.dragState.isDragging) {
            // 淇濆瓨浣嶇疆
            const x = parseInt(this.dragState.item.style.left);
            const y = parseInt(this.dragState.item.style.top);
            const id = this.dragState.item.id.replace('icon-', '');

            if (this.dragState.type === 'window') {
                store.updateApp(id, { winPos: { x, y } });
            } else if (this.dragState.type === 'icon') {
                store.updateApp(id, { pos: { x, y } });
            }
        }

        // 娓呯悊鐘舵€?        this.dragState.active = false;
        this.dragState.isDragging = false;
        this.dragState.item = null;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);

        const overlay = document.getElementById('drag-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // === 4. 绐楀彛鎿嶄綔 ===

    openApp(id, speak = true) {
        const win = document.getElementById(id);
        if (!win) return;

        win.classList.remove('minimized');
        win.classList.add('open');
        this.bringToFront(id);
        store.updateApp(id, { isOpen: true });

        if (speak) {
            const appInfo = store.getApp(id);
            bus.emit('system:speak', appInfo.openMsg || `鎵撳紑 ${appInfo.name}`);
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
        // 绠€鍗曠矖鏆寸殑 Z-Index 绠＄悊
        document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
        const current = document.getElementById(id);
        if (current && current.classList.contains('window')) current.style.zIndex = 100;
        // 鍥炬爣涓嶉渶瑕佺疆椤剁鐞嗭紝濮嬬粓鍦ㄥ簳灞?        this.updateTaskbar();
    }

    changeWallpaper(url, el) {
        const bgStyle = `url('${url}')`;
        document.documentElement.style.setProperty('--bg-wallpaper', bgStyle);
        localStorage.setItem('seraphim_wallpaper', bgStyle);
        if (el) {
            document.querySelectorAll('.wp-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');
        }
        bus.emit('system:speak', "澹佺焊鎹㈠ソ鍟︼紒馃尶");
    }

    updateTaskbar() {
        const container = document.getElementById('taskbar-apps');
        container.innerHTML = '';

        Object.entries(store.apps).forEach(([id, app]) => {
            const win = document.getElementById(id);
            // 浠呭綋绐楀彛鎵撳紑鏃舵樉绀哄湪浠诲姟鏍?(浠縒indows) 鎴栬€呬竴鐩存樉绀?浠縈ac Dock)
            // 杩欓噷閲囩敤涓€鐩存樉绀烘ā寮?            const div = document.createElement('div');
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
