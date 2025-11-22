import { store } from './store.js'; // 📦 导入状态存储
import { bus } from './event_bus.js'; // 🚌 导入事件总线
import { WALLPAPERS, DEFAULT_WALLPAPER } from './config.js'; // 🖼️ 导入壁纸配置

export class WindowManager {
    // =================================
    //  🎉 窗口管理器类 ()
    //
    //  🎨 代码用途：
    //     管理桌面窗口系统，包括窗口的打开、关闭、最小化、拖拽、层级管理以及壁纸切换。
    //
    //  💡 易懂解释：
    //     这是操作系统的“管家”！它负责帮你把桌子（桌面）收拾干净，把文件（窗口）摆放整齐，你想看哪个就给你拿哪个，超级贴心哒！✨
    //
    //  ⚠️ 警告：
    //     此类深度依赖 DOM 结构，如果 HTML 中的 ID 发生变化，这里的大部分逻辑都会失效。
    // =================================
    constructor() {
        // 🖱️ 拖拽状态记录对象
        this.dragState = {
            active: false,     // 🛑 是否处于按下状态（准备拖拽）
            isDragging: false, // 🚚 是否已经开始移动（真正拖拽）
            startX: 0,         // 📍 鼠标按下时的 X 坐标
            startY: 0,         // 📍 鼠标按下时的 Y 坐标
            item: null,        // 📦 当前被拖拽的 DOM 元素
            type: null,        // 🏷️ 拖拽类型：'window' (窗口) 或 'icon' (图标)
            offsetX: 0,        // 📏 鼠标相对于元素左上角的 X 偏移
            offsetY: 0         // 📏 鼠标相对于元素左上角的 Y 偏移
        };

        // 🔗 绑定方法的 this 上下文，确保在事件回调中能正确访问类实例
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    init() {
        // =================================
        //  🎉 初始化 ()
        //
        //  🎨 代码用途：
        //     启动窗口管理器的所有子系统：壁纸、图标、任务栏、事件监听等。
        //
        //  💡 易懂解释：
        //     管家开始上班啦！先把壁纸贴好，把桌上的东西摆好，然后竖起耳朵听你的吩咐，准备随时为你服务哦！🎈
        //
        //  ⚠️ 警告：
        //     必须在 DOMContentLoaded 或 window.onload 之后调用，否则找不到元素。
        // =================================

        this.loadWallpaper();      // 🖼️ 加载上次保存的壁纸
        this.renderDesktopIcons(); // 📱 渲染桌面图标
        
        // ⚡ 懒加载：只创建那些状态为“打开”的窗口 DOM
        // 这样可以避免一次性创建所有 DOM，减少内存占用，并解决“100+应用同时运行”的问题
        Object.entries(store.apps).forEach(([id, app]) => {
            if (app.isOpen) {
                this.createWindow(id, app);
            }
        });

        this.updateTaskbar();      // 📊 更新任务栏
        this.initWallpaperApp();   // 🎨 初始化壁纸设置 APP 的内容
        this.restoreWindows();     // 🔄 恢复上次窗口的位置和状态
        this.setupGlobalEvents();  // 🖱️ 设置全局鼠标点击等事件监听
    }

    // === 1. 初始化与渲染 ===

    createWindow(id, app) {
        // =================================
        //  🎉 创建窗口 (应用ID，应用配置)
        //
        //  🎨 代码用途：
        //     动态创建窗口的 DOM 结构。
        //
        //  💡 易懂解释：
        //     根据图纸（配置）把房子（窗口）盖起来，让你的应用有个漂亮的家！🏠
        //
        //  ⚠️ 警告：
        //     如果窗口已存在，函数会直接返回，不会重复创建。
        // =================================

        // 🛑 如果窗口已存在，不再重复创建
        if (document.getElementById(id)) return;

        const desktop = document.getElementById('desktop');

        // 📦 创建窗口容器
        const win = document.createElement('div');
        win.id = id;
        win.className = 'window';

        // 🏷️ 创建标题栏
        const titleBar = document.createElement('div');
        titleBar.className = 'title-bar';

        // 🎮 窗口控制按钮
        const controls = document.createElement('div');
        controls.className = 'win-controls';
        controls.innerHTML = `
            <button class="win-btn close-btn"></button>
            <button class="win-btn min-btn"></button>
        `;

        // 📝 窗口标题
        const title = document.createElement('div');
        title.className = 'win-title';
        title.innerText = app.name || 'Unknown App';

        titleBar.appendChild(controls);
        titleBar.appendChild(title);

        // 📄 内容区域
        const content = document.createElement('div');
        content.className = 'content';
        if (app.contentStyle) {
            content.style.cssText = app.contentStyle;
        }
        // 💉 注入 HTML 模板
        content.innerHTML = app.content || '';

        // 🏗️ 组装窗口
        win.appendChild(titleBar);
        win.appendChild(content);
        
        // 📌 添加到桌面
        desktop.appendChild(win);

        // 📢 通知应用窗口已就绪 (解决竞态条件)
        bus.emit(`app:ready:${id}`);
    }

    loadWallpaper() {
        // =================================
        //  🎉 加载壁纸 ()
        //
        //  🎨 代码用途：
        //     从 localStorage 读取保存的壁纸设置，并应用到 CSS 变量中。
        //
        //  💡 易懂解释：
        //     看看上次装修选了什么墙纸，把它贴上去，让桌面焕然一新！✨
        //
        //  ⚠️ 警告：
        //     如果 localStorage 中的 URL 无效，背景可能会变白。
        // =================================

        // 💾 尝试获取保存的壁纸，如果没有则使用默认值
        const savedWp = localStorage.getItem('seraphim_wallpaper') || `url('${DEFAULT_WALLPAPER}')`;
        // 🎨 设置 CSS 变量 --bg-wallpaper，这会立即改变页面背景
        document.documentElement.style.setProperty('--bg-wallpaper', savedWp);
    }

    renderDesktopIcons() {
        // =================================
        //  🎉 渲染桌面图标 ()
        //
        //  🎨 代码用途：
        //     根据 store 中的应用列表，在桌面上动态生成图标元素。
        //
        //  💡 易懂解释：
        //     把软件图标一个个摆到桌面上，整整齐齐，看着就舒服！📱
        //
        //  ⚠️ 警告：
        //     会先清除所有旧图标再重新生成，如果图标上有未保存的状态（如选中高亮），会丢失。
        // =================================

        const dt = document.getElementById('desktop'); // 🖥️ 获取桌面容器
        // 🧹 清除旧的图标元素，防止重复渲染 (注意：不要删除 .window 类的元素)
        dt.querySelectorAll('.desktop-icon').forEach(e => e.remove());

        // 🔄 遍历 store.apps 中的每一个应用
        Object.entries(store.apps).forEach(([id, app]) => {
            // 📦 创建图标容器 div
            const el = document.createElement('div');
            el.className = 'desktop-icon'; // 🏷️ 设置类名
            el.id = `icon-${id}`;          // 🆔 设置唯一 ID
            el.style.left = `${app.pos.x}px`; // 📍 设置保存的 X 坐标
            el.style.top = `${app.pos.y}px`;  // 📍 设置保存的 Y 坐标
            el.dataset.id = id;    // 💾 存储应用 ID，方便点击时获取
            el.dataset.type = 'icon'; // 🏷️ 标记类型为图标

            // 🎨 填充图标内部 HTML (SVG 图标 + 文字)
            // 兼容 icon 和 iconPath 字段
            const pathData = app.icon || app.iconPath;
            el.innerHTML = `
                <svg class="icon-svg" viewBox="0 0 24 24" fill="${app.color}">
                    <path d="${pathData}"/>
                </svg>
                <div class="icon-text">${app.name}</div>
            `;
            // 📌 将图标添加到桌面
            dt.appendChild(el);
        });
    }

    initWallpaperApp() {
        // =================================
        //  🎉 初始化壁纸应用 ()
        //
        //  🎨 代码用途：
        //     在“设置”窗口中生成壁纸选择网格。
        //
        //  💡 易懂解释：
        //     把所有可选的壁纸像照片一样铺开，让你挑一张最喜欢的！🖼️
        //
        //  ⚠️ 警告：
        //     如果 WALLPAPERS 列表为空，这里什么都不会显示。
        // =================================

        const grid = document.getElementById('wp-grid'); // 📦 获取壁纸网格容器
        if (!grid) return; // 🛑 如果容器不存在则跳过
        grid.innerHTML = ''; // 🧹 清空容器

        // 🔄 遍历配置中的壁纸列表
        WALLPAPERS.forEach(wp => {
            const el = document.createElement('div');
            el.className = 'wp-item'; // 🏷️ 设置类名
            el.style.backgroundImage = `url('${wp.url}')`; // 🖼️ 设置缩略图
            // 🖱️ 点击时调用 changeWallpaper 切换壁纸
            el.onclick = () => this.changeWallpaper(wp.url, el);
            grid.appendChild(el); // 📌 添加到网格
        });
    }

    restoreWindows() {
        // =================================
        //  🎉 恢复窗口状态 ()
        //
        //  🎨 代码用途：
        //     根据 store 中的记录，恢复窗口的位置和打开状态。
        //
        //  💡 易懂解释：
        //     把你上次没关的窗口重新打开，并且放回原来的位置，就像你从未离开过一样！🕰️
        //
        //  ⚠️ 警告：
        //     如果窗口被拖到了屏幕外面，恢复后可能找不到了（虽然拖拽逻辑有边界限制）。
        // =================================

        Object.entries(store.apps).forEach(([id, app]) => {
            const win = document.getElementById(id); // 🪟 获取窗口 DOM
            if (win) {
                // 📍 如果有保存的位置，恢复位置
                if (app.winPos) {
                    win.style.left = `${app.winPos.x}px`;
                    win.style.top = `${app.winPos.y}px`;
                }
                // 🔓 如果上次是打开状态，则重新打开
                if (app.isOpen) this.openApp(id, false); // false 表示不播放语音
            }
        });
    }

    // === 2. 事件委托与交互 ===

    setupGlobalEvents() {
        // =================================
        //  🎉 设置全局事件 ()
        //
        //  🎨 代码用途：
        //     使用事件委托模式，在 document 级别统一处理点击、双击和拖拽事件。
        //
        //  💡 易懂解释：
        //     管家站在大厅中央，谁喊一声他都能听见，不用给每个房间都派个服务员，这样效率最高啦！👂
        //
        //  ⚠️ 警告：
        //     事件委托依赖事件冒泡。如果某个子元素阻止了冒泡 (stopPropagation)，这里的逻辑可能无法触发。
        // =================================

        // 🖱️ 全局点击委托 (处理关闭、最小化、点击图标)
        document.addEventListener('click', (e) => {
            const target = e.target; // 🎯 获取被点击的元素

            // 1. 处理窗口控制按钮 (关闭)
            if (target.closest('.close-btn')) {
                const win = target.closest('.window'); // 🪟 找到所属窗口
                if (win) this.closeApp(win.id); // ❌ 关闭窗口
            }
            // 2. 处理窗口控制按钮 (最小化)
            else if (target.closest('.min-btn')) {
                const win = target.closest('.window');
                if (win) this.minimizeApp(win.id); // 🔽 最小化窗口
            } else if (target.classList.contains('desktop-icon')) {
                // 3. 处理图标点击
                const id = target.dataset.id;
                this.toggleApp(id); // 🔄 切换应用状态
            } else if (target.classList.contains('task-app')) {
                // 4. 处理任务栏图标点击
                const id = target.dataset.id;
                this.toggleApp(id); // 🔄 切换应用状态
            }
        });

        // 🖱️🖱️ 全局双击委托 (用于桌面图标和任务栏图标的快速打开)
        document.addEventListener('dblclick', (e) => {
            const target = e.target;
            if (target.classList.contains('desktop-icon')) {
                const id = target.dataset.id;
                this.openApp(id); // 🚀 双击图标时打开应用
            } else if (target.classList.contains('task-app')) {
                const id = target.dataset.id;
                this.openApp(id); // 🚀 双击任务栏图标时打开应用
            }
        });

        // 🚚 全局拖拽相关事件
        document.addEventListener('mousedown', (e) => {
            const target = e.target;
            // 🛑 只处理窗口和图标的拖拽
            if (!target.closest('.window') && !target.classList.contains('desktop-icon')) return;

            // 📍 记录鼠标按下位置
            this.dragState.startX = e.clientX;
            this.dragState.startY = e.clientY;
            this.dragState.active = true; // 🚩 标记为正在拖拽

            const item = target.closest('.window') || target.closest('.desktop-icon');
            this.dragState.item = item;
            this.dragState.type = item.classList.contains('window') ? 'window' : 'icon';

            // 📏 计算鼠标相对于元素的偏移
            const rect = item.getBoundingClientRect();
            this.dragState.offsetX = e.clientX - rect.left;
            this.dragState.offsetY = e.clientY - rect.top;

            // 🎨 添加拖拽过程中需要的样式或逻辑
            item.classList.add('dragging');

            // 🛡️ 显示遮罩层
            const overlay = document.getElementById('drag-overlay');
            if (overlay) overlay.style.display = 'block';

            // 🔗 绑定鼠标移动和抬起事件
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
        });

        // 📊 任务栏区域的点击事件委托
        document.getElementById('taskbar-apps').addEventListener('click', (e) => {
            const target = e.target.closest('.task-app');
            if (target) {
                const id = target.dataset.id;
                this.toggleApp(id); // 🔄 切换应用状态
            }
        });
    }

    handleMouseMove(e) {
        // =================================
        //  🎉 处理鼠标移动 (拖拽中)
        //
        //  🎨 代码用途：
        //     更新被拖拽元素的位置，实时反馈拖拽效果。
        //
        //  💡 易懂解释：
        //     你把东西拖到哪儿，管家就把它放到哪儿，紧紧跟着你的鼠标走！🐁
        //
        //  ⚠️ 警告：
        //     此函数会被高频调用，尽量不要在里面进行复杂的 DOM 操作或计算。
        // =================================

        if (!this.dragState.active) return;

        const { clientX, clientY } = e;
        const { item, offsetX, offsetY } = this.dragState;

        // 🔢 计算新的位置
        const x = clientX - offsetX;
        const y = clientY - offsetY;

        // 📍 更新元素位置
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;

        this.dragState.isDragging = true; // 🚩 标记为正在拖拽
    }

    handleMouseUp(e) {
        // =================================
        //  🎉 处理鼠标抬起 (拖拽结束)
        //
        //  🎨 代码用途：
        //     结束拖拽，保存新位置，清理事件监听。
        //
        //  💡 易懂解释：
        //     手松开了，东西就安安稳稳地放在那里了，位置也记下来啦！📍
        //
        //  ⚠️ 警告：
        //     必须移除 mousemove 和 mouseup 监听器，否则会造成内存泄漏和逻辑错误。
        // =================================

        if (!this.dragState.active) return;

        // 💾 只有真正拖拽过才保存位置
        if (this.dragState.isDragging) {
            // 📍 获取最终位置
            const x = parseInt(this.dragState.item.style.left);
            const y = parseInt(this.dragState.item.style.top);
            // 🆔 获取应用 ID (去掉 icon- 前缀)
            const id = this.dragState.item.id.replace('icon-', '');

            // 💾 根据类型保存到 store
            if (this.dragState.type === 'window') {
                store.updateApp(id, { winPos: { x, y } });
            } else if (this.dragState.type === 'icon') {
                store.updateApp(id, { pos: { x, y } });
            }
        }

        // 🧹 清理状态
        this.dragState.active = false;
        this.dragState.isDragging = false;
        this.dragState.item = null;
        // 🔌 移除监听器
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);

        // 🛡️ 隐藏遮罩层
        const overlay = document.getElementById('drag-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // === 4. 窗口操作 ===

    openApp(id, speak = true) {
        // =================================
        //  🎉 打开应用 (应用ID，是否说话)
        //
        //  🎨 代码用途：
        //     显示指定 ID 的窗口，更新状态，并播放语音。
        //
        //  💡 易懂解释：
        //     双击图标，软件就“嗖”的一下弹出来了，还会跟你打招呼呢！👋
        //
        //  ⚠️ 警告：
        //     如果应用配置不存在，会在控制台报错并停止执行。
        // =================================

        // ⚡ 懒加载检查：如果 DOM 不存在，先创建
        let win = document.getElementById(id);
        if (!win) {
            const appInfo = store.getApp(id);
            if (appInfo) {
                this.createWindow(id, appInfo);
                win = document.getElementById(id);
            } else {
                console.error(`无法打开应用 ${id}: 配置不存在`);
                return;
            }
        }

        win.classList.remove('minimized'); // 🔼 移除最小化状态
        win.classList.add('open');         // 🔓 添加打开状态
        this.bringToFront(id);             // 🔝 置顶
        store.updateApp(id, { isOpen: true }); // 💾 保存状态

        // 🔊 播放打开语音
        if (speak) {
            const appInfo = store.getApp(id);
            bus.emit('system:speak', appInfo.openMsg || `打开 ${appInfo.name}`);
        }
        this.updateTaskbar(); // 📊 更新任务栏
    }

    closeApp(id) {
        // =================================
        //  🎉 关闭应用 (应用ID)
        //
        //  🎨 代码用途：
        //     隐藏指定 ID 的窗口，更新状态。
        //
        //  💡 易懂解释：
        //     点那个红叉叉，软件就乖乖关掉啦，下次再见！👋
        //
        //  ⚠️ 警告：
        //     只是隐藏了窗口 (display: none 或 opacity: 0)，并没有销毁 DOM 元素。
        // =================================

        const win = document.getElementById(id);
        if (!win) return;

        win.classList.remove('open', 'minimized'); // 🧹 移除所有显示状态
        store.updateApp(id, { isOpen: false });    // 💾 保存状态
        this.updateTaskbar(); // 📊 更新任务栏
    }

    minimizeApp(id) {
        // =================================
        //  🎉 最小化应用 (应用ID)
        //
        //  🎨 代码用途：
        //     隐藏窗口但保持运行状态，只在任务栏显示。
        //
        //  💡 易懂解释：
        //     点那个黄杠杠，软件就缩到下面去休息啦，随时可以叫它出来！💤
        //
        //  ⚠️ 警告：
        //     最小化后窗口依然存在于 DOM 中，只是看不见了。
        // =================================

        const win = document.getElementById(id);
        if (win) win.classList.add('minimized'); // 🔽 添加最小化类名 (CSS控制隐藏)
        this.updateTaskbar();
    }

    toggleApp(id) {
        // =================================
        //  🎉 切换应用状态 (应用ID)
        //
        //  🎨 代码用途：
        //     任务栏点击逻辑：没开就开，最小化就还原，在后台就置顶，在最前就最小化。
        //
        //  💡 易懂解释：
        //     点任务栏上的图标，它会根据当前情况变身！没开就打开，开了没显示就显示，显示了就藏起来，超智能！🧠
        //
        //  ⚠️ 警告：
        //     逻辑比较复杂，涉及四种状态的切换，修改时要小心。
        // =================================

        const win = document.getElementById(id);
        if (!win.classList.contains('open')) {
            this.openApp(id); // 🚀 没开 -> 打开
        } else if (win.classList.contains('minimized')) {
            this.openApp(id); // 🔼 最小化 -> 还原
        } else if (win.style.zIndex >= 100) {
            this.minimizeApp(id); // 🔽 在最前 -> 最小化
        } else {
            this.bringToFront(id); // 🔝 在后台 -> 置顶
        }
    }

    bringToFront(id) {
        // =================================
        //  🎉 窗口置顶 (应用ID)
        //
        //  🎨 代码用途：
        //     管理窗口的 z-index，让当前窗口显示在最前面。
        //
        //  💡 易懂解释：
        //     把你要用的那个窗口拿起来，放到所有窗口的最上面，让你看得清清楚楚！👀
        //
        //  ⚠️ 警告：
        //     目前的逻辑比较简单，只是把其他设为 10，当前设为 100。如果窗口很多，可能需要更复杂的层级管理。
        // =================================

        // 🔢 简单粗暴的 Z-Index 管理：先把所有窗口设为 10
        document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
        // 🔝 再把当前窗口设为 100
        const current = document.getElementById(id);
        if (current && current.classList.contains('window')) current.style.zIndex = 100;
        // 📊 更新任务栏样式 (高亮当前窗口)
        this.updateTaskbar();
    }

    changeWallpaper(url, el) {
        // =================================
        //  🎉 更换壁纸 (图片URL，被点击的元素)
        //
        //  🎨 代码用途：
        //     更新 CSS 变量以更换背景图，并保存设置。
        //
        //  💡 易懂解释：
        //     把墙纸撕下来，换一张新的，心情也跟着变好啦！🌈
        //
        //  ⚠️ 警告：
        //     图片加载需要时间，可能会有短暂的空白或延迟。
        // =================================

        const bgStyle = `url('${url}')`;
        document.documentElement.style.setProperty('--bg-wallpaper', bgStyle);
        localStorage.setItem('seraphim_wallpaper', bgStyle);

        // 🎨 更新选中状态样式
        if (el) {
            document.querySelectorAll('.wp-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');
        }
        bus.emit('system:speak', "壁纸换好啦！🌿");
    }

    updateTaskbar() {
        // =================================
        //  🎉 更新任务栏 ()
        //
        //  🎨 代码用途：
        //     重新渲染任务栏上的应用图标，反映当前的打开/活动状态。
        //
        //  💡 易懂解释：
        //     刷新一下底下的长条，看看哪些灯该亮，哪些灯该灭，一目了然！💡
        //
        //  ⚠️ 警告：
        //     每次调用都会清空并重绘整个任务栏，频繁调用可能会有性能损耗。
        // =================================

        const container = document.getElementById('taskbar-apps');
        container.innerHTML = ''; // 🧹 清空任务栏

        Object.entries(store.apps).forEach(([id, app]) => {
            const win = document.getElementById(id);
            // ⚓ 这里采用一直显示模式 (类似 macOS Dock)
            const div = document.createElement('div');
            div.className = 'task-app';
            div.dataset.id = id;
            div.title = app.name || id; // ♿ 添加无障碍标题
            // 🎨 插入图标 SVG (优先使用 icon 字段，兼容 iconPath)
            const iconPath = app.icon || app.iconPath;
            div.innerHTML = `<svg style="width:24px;fill:${app.color}" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>`;

            // 💡 如果窗口打开了，添加运行指示灯样式
            if (win && win.classList.contains('open')) {
                div.classList.add('running');
                // ✨ 如果窗口处于激活状态 (z-index 高且未最小化)，添加高亮样式
                if (!win.classList.contains('minimized') && win.style.zIndex >= 100) {
                    div.classList.add('active');
                }
            }
            container.appendChild(div);
        });
    }
}

export const wm = new WindowManager(); // 导出单例实例