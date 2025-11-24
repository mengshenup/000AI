import { store } from './store.js'; // 📦 导入状态存储
import { bus } from './event_bus.js'; // 🚌 导入事件总线
import { WALLPAPERS, DEFAULT_WALLPAPER } from './config.js'; // 🖼️ 导入壁纸配置
import { pm } from './process_manager.js'; // 🛡️ 导入进程管理器
import { contextMenuApp } from './apps/context_menu.js'; // 📖 导入右键菜单

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
        this.handleWindowClick = this.handleWindowClick.bind(this); // 💖 绑定窗口点击事件

        // 🔢 窗口层级计数器
        this.zIndexCounter = 100;
        // 🆔 当前激活的窗口 ID
        this.activeWindowId = null;
        // ⏳ 点击节流记录 (防止双击导致窗口闪烁)
        this.lastClickTime = 0;
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
        // this.renderTrayIcons();    // 📡 渲染托盘图标 (已移除)
        
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

        // 暴露 wm 到全局，方便 store 异步加载后调用
        window.wm = this;
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

        // 💖 图标容错处理：如果 app.icon 缺失，使用默认图标
        const iconPath = app.icon || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'; // 默认是个感叹号/信息图标

        // 🏷️ 创建标题栏 (仅当非无边框模式时)
        if (!app.frameless) {
            const titleBar = document.createElement('div');
            titleBar.className = 'title-bar';

            // 🎮 窗口控制按钮
            const controls = document.createElement('div');
            controls.className = 'win-controls';
            controls.innerHTML = `
                <button class="win-btn min-btn" title="最小化"></button>
                <button class="win-btn close-btn" title="关闭"></button>
            `;

            // 📝 窗口标题
            const title = document.createElement('div');
            title.className = 'win-title';
            // 组合名称和提示 (使用空格分隔)
            // 💖 增加图标显示
            title.innerHTML = `
                <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor; margin-right:5px; vertical-align:text-bottom;">
                    <path d="${iconPath}"></path>
                </svg>
                ${app.description ? `${app.name}     ${app.description}` : app.name}
            `;

            // 交换顺序：按钮在右，标题在左 (恢复经典布局)
            titleBar.appendChild(title);
            titleBar.appendChild(controls);
            win.appendChild(titleBar);
        } else {
            win.classList.add('frameless'); // 添加无边框样式类
        }

        // 📄 内容区域
        const content = document.createElement('div');
        content.className = 'content';
        if (app.contentStyle) {
            content.style.cssText = app.contentStyle;
        }
        // 💉 注入 HTML 模板
        content.innerHTML = app.content || '';

        // 🏗️ 组装窗口 (标题栏已在上面处理)
        win.appendChild(content);
        
        // 📌 添加到桌面
        desktop.appendChild(win);

        // 📏 设置窗口大小 (如果有配置)
        if (app.width) win.style.width = typeof app.width === 'number' ? `${app.width}px` : app.width;
        if (app.height) win.style.height = typeof app.height === 'number' ? `${app.height}px` : app.height;

        // 📏 启用调整大小 (如果配置允许)
        if (app.resizable) {
            win.style.resize = 'both';
            // 注意：resize 属性通常需要 overflow 不为 visible 才能生效
            // .window 类默认 overflow: hidden，所以这里不需要额外设置
            // 但为了更好的体验，可能需要设置最小宽高
            win.style.minWidth = '320px';
            win.style.minHeight = '240px';
        }

        // 📍 设置初始位置 (优先使用保存的位置，否则使用默认位置，最后兜底)
        // 修复：防止因位置信息丢失导致窗口不可见
        // 💖 强制修正：如果是固定窗口 (fixed)，则忽略 store 中的历史位置，强制使用配置中的位置
        // 这解决了用户修改配置后，因缓存导致位置不更新的问题
        let initialPos = app.winPos || app.pos || { x: 100, y: 100 };
        if (app.fixed) {
            // 尝试从原始元数据中获取位置，或者直接信任当前的 app 对象 (如果 store 更新逻辑正确)
            // 这里假设 app 对象已经包含了最新的配置信息 (store.checkVersion 应该处理了合并)
            // 但为了保险，如果 app.fixed 为 true，我们应该优先信任 right/bottom 属性
            // 如果 store 里存了 x/y，可能会覆盖 right/bottom，所以这里要做个清理
            if (initialPos.right !== undefined || initialPos.bottom !== undefined) {
                // 如果配置了 right/bottom，就用它们
            }
        }
        
        // 支持 right/bottom 定位
        if (initialPos.right !== undefined) {
            win.style.right = `${initialPos.right}px`;
            win.style.left = 'auto'; // 清除 left
        } else {
            // 确保坐标是有效数值
            const safeX = isNaN(initialPos.x) ? 100 : initialPos.x;
            win.style.left = `${safeX}px`;
            win.style.right = 'auto'; // 清除 right
        }

        if (initialPos.bottom !== undefined) {
            win.style.bottom = `${initialPos.bottom}px`;
            win.style.top = 'auto'; // 清除 top
        } else {
            const safeY = isNaN(initialPos.y) ? 100 : initialPos.y;
            win.style.top = `${safeY}px`;
            win.style.bottom = 'auto'; // 清除 bottom
        }

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

        // 💾 尝试获取保存的壁纸
        let savedWp = localStorage.getItem('seraphim_wallpaper');
        
        // 🛡️ 如果没有保存过，使用默认壁纸 (注意：DEFAULT_WALLPAPER 是纯路径)
        if (!savedWp) {
            savedWp = DEFAULT_WALLPAPER;
        }

        // 🎨 统一格式化：确保是 url(...) 格式
        let bgStyle = savedWp.trim();
        if (!bgStyle.startsWith('url(')) {
            bgStyle = `url('${bgStyle}')`;
        }
        
        // 🎨 设置 CSS 变量 --bg-wallpaper，这会立即改变页面背景
        // document.documentElement.style.setProperty('--bg-wallpaper', bgStyle);
        // 🐛 修复：直接设置 #desktop 背景，避免 CSS 变量解析相对路径时的 404 问题 (crbug/css-variables)
        const desktop = document.getElementById('desktop');
        if (desktop) desktop.style.backgroundImage = bgStyle;
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
            // 🛡️ 防御性检查：如果没有图标数据，跳过渲染，防止 SVG 报错
            const pathData = app.icon || app.iconPath;
            if (!pathData) {
                console.warn(`[WindowManager] 应用 ${id} 缺少图标数据，跳过渲染。`);
                return;
            }

            // 💖 过滤掉不显示桌面图标的应用 (如系统应用)
            if (app.showDesktopIcon === false) return;

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
            // const pathData = app.icon || app.iconPath; // ⬆️ 已在上方定义并检查
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
                // 修复：增加对无效位置的检查和兜底
                const pos = app.winPos || app.pos || { x: 100, y: 100 };
                
                // 💖 强制修正：如果是固定窗口，优先使用 right/bottom
                // 即使 store 里有 x/y (可能是旧数据)，只要配置了 fixed，就强制归位
                if (app.fixed) {
                    if (pos.right !== undefined) {
                        win.style.right = `${pos.right}px`;
                        win.style.left = 'auto';
                    }
                    if (pos.bottom !== undefined) {
                        win.style.bottom = `${pos.bottom}px`;
                        win.style.top = 'auto';
                    }
                    // 如果没有 right/bottom，则回退到 x/y
                    if (pos.right === undefined && pos.bottom === undefined) {
                         const safeX = isNaN(pos.x) ? 100 : pos.x;
                         const safeY = isNaN(pos.y) ? 100 : pos.y;
                         win.style.left = `${safeX}px`;
                         win.style.top = `${safeY}px`;
                    }
                } else {
                    // 普通窗口逻辑
                    if (pos.right !== undefined) {
                        win.style.right = `${pos.right}px`;
                        win.style.left = 'auto';
                    } else {
                        const safeX = isNaN(pos.x) ? 100 : pos.x;
                        win.style.left = `${safeX}px`;
                        win.style.right = 'auto';
                    }

                    if (pos.bottom !== undefined) {
                        win.style.bottom = `${pos.bottom}px`;
                        win.style.top = 'auto';
                    } else {
                        const safeY = isNaN(pos.y) ? 100 : pos.y;
                        win.style.top = `${safeY}px`;
                        win.style.bottom = 'auto';
                    }
                }

                // 🔓 如果上次是打开状态，则重新打开
                if (app.isOpen) this.openApp(id, false); // false 表示不播放语音
            }
        });
    }

    // === 2. 事件委托与交互 ===

    // 💖 新增：处理窗口点击
    handleWindowClick(win) {
        const id = win.id;
        // 如果点击的不是当前激活窗口，则置顶并更新状态
        if (this.activeWindowId !== id) {
            this.bringToFront(id);
        }
    }

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
        document.addEventListener('mousedown', (e) => {
            const target = e.target; // 🎯 获取被点击的元素

            // 1. 处理窗口点击 (置顶)
            const win = target.closest('.window');
            if (win) {
                this.handleWindowClick(win); // 💖 统一处理窗口点击
            }

            // 2. 处理窗口控制按钮 (关闭)
            if (target.closest('.close-btn')) {
                // const win = target.closest('.window'); // 上面已经获取了
                if (win) this.closeApp(win.id); // ❌ 关闭窗口
            }
            // 2. 处理窗口控制按钮 (最小化)
            else if (target.closest('.min-btn')) {
                const win = target.closest('.window');
                if (win) this.minimizeApp(win.id); // 🔽 最小化窗口
            } else {
                // 3. 处理图标点击 (使用 closest 查找父级)
                const icon = target.closest('.desktop-icon');
                if (icon) {
                    const id = icon.dataset.id;
                    // 💖 修改为单击打开应用
                    this.openApp(id); 
                    return;
                }
                
                // 4. 处理任务栏图标点击 (使用 closest 查找父级)
                const taskApp = target.closest('.task-app');
                if (taskApp) {
                    const id = taskApp.dataset.id;
                    this.toggleApp(id); // 🔄 切换应用状态
                    return;
                }

                // 5. 处理托盘图标点击 (已移除)
                /*
                const trayIcon = target.closest('.tray-icon');
                if (trayIcon) {
                    const id = trayIcon.dataset.id;
                    this.toggleApp(id);
                    return;
                }
                */

                // 6. 🆕 点击空白处自动关闭胶囊窗口 (如流量、账单详情)
                const capsuleWindows = ['win-traffic', 'win-billing'];
                capsuleWindows.forEach(id => {
                    const win = document.getElementById(id);
                    // 如果窗口存在且已打开
                    if (win && win.classList.contains('open')) {
                        // 检查点击是否在窗口内部
                        if (win.contains(target)) return;
                        
                        // 检查点击是否在对应的胶囊按钮上 (防止点击按钮时刚打开就被关闭)
                        // 假设胶囊ID规则为 bar-xxx (win-traffic -> bar-traffic)
                        const capsuleId = id.replace('win-', 'bar-');
                        const capsule = document.getElementById(capsuleId);
                        if (capsule && capsule.contains(target)) return;

                        // 如果既不在窗口内，也不在按钮上，则关闭
                        this.closeApp(id);
                    }
                });
            }
        });

        // 🖱️🖱️ 全局双击委托 (已废弃，改为单击打开)
        // document.addEventListener('dblclick', (e) => { ... });

        // 🖱️ 右键菜单委托
        document.addEventListener('contextmenu', (e) => {
            const icon = e.target.closest('.desktop-icon');
            if (icon) {
                e.preventDefault(); // 阻止默认右键菜单
                const id = icon.dataset.id;
                const app = store.getApp(id);
                
                contextMenuApp.show(e.clientX, e.clientY, [
                    {
                        label: '打开',
                        icon: '🚀',
                        action: () => this.openApp(id)
                    },
                    {
                        label: '重命名',
                        icon: '✏️',
                        action: () => {
                            // 获取输入框元素
                            const input = document.getElementById('rename-input');
                            if (!input) return;

                            // 获取图标位置
                            const rect = icon.getBoundingClientRect();
                            
                            // 设置输入框位置 (在图标下方)
                            input.style.left = `${rect.left + rect.width / 2 - 50}px`; // 居中
                            input.style.top = `${rect.bottom + 5}px`;
                            input.style.display = 'block';
                            input.innerText = app.name; // 填充当前名称
                            
                            // 聚焦并全选
                            input.focus();
                            const range = document.createRange();
                            range.selectNodeContents(input);
                            const sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);

                            // 定义提交函数
                            const submit = () => {
                                const newName = input.innerText.trim();
                                input.style.display = 'none'; // 隐藏输入框
                                
                                if (newName && newName !== '') {
                                    // 保存自定义名称到 customName 字段，并更新 name
                                    store.updateApp(id, { customName: newName, name: newName });
                                    this.renderDesktopIcons(); // 重新渲染图标
                                    
                                    // 如果窗口已打开，也更新窗口标题
                                    const winTitle = document.querySelector(`#${id} .win-title`);
                                    if (winTitle) {
                                        const desc = app.description || '';
                                        winTitle.innerText = desc ? `${newName} · ${desc}` : newName;
                                    }
                                }
                            };

                            // 绑定回车和失焦事件
                            const handleKey = (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    submit();
                                    cleanup();
                                }
                            };
                            const handleBlur = () => {
                                submit();
                                cleanup();
                            };

                            // 清理事件监听
                            const cleanup = () => {
                                input.removeEventListener('keydown', handleKey);
                                input.removeEventListener('blur', handleBlur);
                            };

                            input.addEventListener('keydown', handleKey);
                            input.addEventListener('blur', handleBlur);
                        }
                    }
                ]);
            }
        });

        // 🚚 全局拖拽相关事件
        document.addEventListener('mousedown', (e) => {
            // 🛑 只响应左键点击
            if (e.button !== 0) return;

            const target = e.target;
            
            // 🛑 如果点击的是窗口控制按钮，则不触发拖拽
            if (target.closest('.win-btn')) return;

            // 🛑 如果点击的是任务栏，也不触发拖拽 (除非实现了任务栏排序)
            if (target.closest('#taskbar')) return;

            // 🛑 只处理窗口和图标的拖拽
            // 修复：使用 closest 查找图标，支持点击图标内部元素拖拽
            const win = target.closest('.window');
            const icon = target.closest('.desktop-icon');
            
            if (!win && !icon) return;

            // 🛑 检查是否固定位置 (如 Widget)
            const id = (win || icon).id.replace('icon-', '');
            const app = store.getApp(id);
            if (app && app.fixed) return;

            // 📍 记录鼠标按下位置
            this.dragState.startX = e.clientX;
            this.dragState.startY = e.clientY;
            this.dragState.active = true; // 🚩 标记为正在拖拽

            const item = win || icon;
            this.dragState.item = item;
            this.dragState.type = win ? 'window' : 'icon';

            // 📏 计算鼠标相对于元素的偏移
            const rect = item.getBoundingClientRect();
            this.dragState.offsetX = e.clientX - rect.left;
            this.dragState.offsetY = e.clientY - rect.top;

            // 🎨 添加拖拽过程中需要的样式或逻辑
            // item.classList.add('dragging'); // 移到 handleMouseMove 中延迟添加

            // 🛡️ 显示遮罩层
            // const overlay = document.getElementById('drag-overlay');
            // if (overlay) overlay.style.display = 'block'; // 移到 handleMouseMove 中延迟显示

            // 🔗 绑定鼠标移动和抬起事件
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
        });

        // 📊 任务栏区域的点击事件委托
        // 使用 mousedown 而不是 click，以避免与其他事件冲突，并提高响应速度
        // 但为了兼容性，还是保留 click，确保逻辑正确
        // 💖 修复：移除此处的事件监听，因为 document 上的全局委托已经处理了任务栏点击 (case 4)
        // 重复监听会导致 toggleApp 被调用两次，从而导致“最小化后立即恢复”的 bug
        /*
        document.getElementById('taskbar-apps').addEventListener('click', (e) => {
            const target = e.target.closest('.task-app');
            if (target) {
                // ⏳ 节流检查：防止快速点击导致窗口闪烁 (0.1秒冷却)
                // 💖 移除节流，确保单击响应灵敏
                
                // const now = Date.now();
                // if (now - this.lastClickTime < 100) {
                //     // console.log("点击过快，已忽略");
                //     return;
                // }
                // this.lastClickTime = now;
                

                const id = target.dataset.id;
                this.toggleApp(id); // 🔄 切换应用状态
            }
        });
        */
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
        
        // 🛡️ 拖拽阈值检查：只有移动超过 5px 才开始真正的拖拽
        // 这可以防止点击时的微小抖动被误判为拖拽，从而修复点击/双击失效的问题
        if (!this.dragState.isDragging) {
            const moveX = Math.abs(clientX - this.dragState.startX);
            const moveY = Math.abs(clientY - this.dragState.startY);
            if (moveX < 5 && moveY < 5) return; // 移动太小，忽略
            
            // 🚀 确认开始拖拽
            this.dragState.isDragging = true;
            e.preventDefault(); // 🛑 防止选中文本或其他默认行为
            
            // 🎨 添加拖拽样式 (延迟到这里才添加)
            if (this.dragState.item) {
                this.dragState.item.classList.add('dragging');
            }
            
            // 🛡️ 显示遮罩层 (延迟到这里才显示)
            const overlay = document.getElementById('drag-overlay');
            if (overlay) overlay.style.display = 'block';
        }

        const { item, offsetX, offsetY } = this.dragState;

        // 🔢 计算新的位置
        const x = clientX - offsetX;
        const y = clientY - offsetY;

        // 📍 更新元素位置
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
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

        // 📢 通知应用已打开 (可用于恢复运行)
        // 💖 统一发送对象格式，方便扩展
        bus.emit('app:opened', { id });

        // 🔊 播放打开语音 (已移交 AngelApp 处理)
        // if (speak) { ... } 
        this.updateTaskbar(); // 📊 更新任务栏
    }

    closeApp(id) {
        // =================================
        //  🎉 关闭应用 (应用ID) - 统一销毁模式
        //
        //  🎨 代码用途：
        //     点击关闭按钮时，直接销毁应用，释放所有资源。
        //     不再保留“挂起”状态，确保系统轻量化。
        //
        //  💡 易懂解释：
        //     点那个红叉叉，房子直接拆掉！下次要用再重新盖。
        //     这样最省地皮（内存），也不会有奇怪的声音（后台运行）吵到你。🏗️
        // =================================

        this.killApp(id); // 🔄 直接复用销毁逻辑
    }

    killApp(id) {
        // =================================
        //  🎉 终止应用 (应用ID)
        //
        //  🎨 代码用途：
        //     1. 移除 DOM 元素
        //     2. 调用进程管理器清理资源队列
        //     3. 更新任务栏
        // =================================

        const win = document.getElementById(id);
        if (win) {
            win.remove(); // 🗑️ 移除 DOM 元素
        }

        store.updateApp(id, { isOpen: false }); // 💾 保存状态
        
        // 📢 发送关闭信号 (给应用内部逻辑一个最后的通知，让它们有机会自己清理)
        // 💖 必须在 pm.kill 之前发送，否则监听器可能已经被清理了
        bus.emit(`app:closed:${id}`);
        bus.emit('app:destroyed', id); // 兼容旧事件

        // 🛡️ 调用进程管理器，清理该应用名下的所有资源
        pm.kill(id);
        
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
        if (win) {
            win.classList.add('minimized'); // 🔽 添加最小化类名 (CSS控制隐藏)
            store.updateApp(id, { isMinimized: true }); // 💾 保存状态
        }
        this.updateTaskbar();
    }

    restoreApp(id) {
        // =================================
        //  🎉 恢复应用 (应用ID)
        //
        //  🎨 代码用途：
        //     取消最小化状态，显示窗口。
        //
        //  💡 易懂解释：
        //     别躲啦，快出来干活！👷
        // =================================

        const win = document.getElementById(id);
        if (win) {
            win.classList.remove('minimized');
            store.updateApp(id, { isMinimized: false });
        }
        this.updateTaskbar();
    }

    toggleApp(id) {
        // =================================
        //  🎉 切换应用状态 (应用ID)
        //
        //  🎨 代码用途：
        //     处理任务栏图标点击逻辑：打开、最小化、恢复。
        //
        //  💡 易懂解释：
        //     点一下图标，如果没开就打开，如果开了就最小化，如果最小化了就弹出来！🔄
        //
        //  ⚠️ 警告：
        //     无
        // =================================

        const app = store.getApp(id);
        // 如果 store 中没有，尝试从 DOM 判断（兼容旧逻辑）
        const win = document.getElementById(id);
        const isOpen = app ? app.isOpen : (win && win.classList.contains('open'));
        const isMinimized = app ? app.isMinimized : (win && win.classList.contains('minimized'));

        // 💖 修复逻辑：
        // 1. 如果没打开 -> 打开
        // 2. 如果已最小化 -> 恢复
        // 3. 如果已打开且在最前面 -> 最小化
        // 4. 如果已打开但被挡住 -> 置顶

        if (!isOpen) {
            // 1. 如果没打开，则打开
            this.openApp(id);
        } else if (isMinimized) {
            // 2. 如果已最小化，则恢复并置顶
            this.restoreApp(id);
            this.bringToFront(id);
        } else {
            // 3. 如果已打开且未最小化
            // 检查是否是当前最顶层窗口
            // ⚠️ 注意：activeWindowId 可能不准确，或者被其他操作干扰
            // 这里增加一个判断：如果点击的是当前激活窗口，则最小化；否则置顶
            
            // 获取当前最高层级的窗口ID (简单判断 zIndex)
            const currentZ = parseInt(win.style.zIndex || 0);
            // 简单的启发式判断：如果它的 zIndex 是最大的，那它就是激活的
            // 但为了稳健，我们还是依赖 activeWindowId，并确保 bringToFront 正确更新它
            
            if (this.activeWindowId === id) {
                this.minimizeApp(id);
            } else {
                this.bringToFront(id);
            }
        }
    }

    bringToFront(id) {
        // =================================
        //  🎉 窗口置顶 (应用ID)
        //
        //  🎨 代码用途：
        //     将指定窗口的 z-index 设为最大，使其显示在最前面。
        //
        //  💡 易懂解释：
        //     把这个窗口抽出来放到最上面，别让其他窗口挡住它！🔝
        //
        //  ⚠️ 警告：
        //     zIndexCounter 会无限增加，理论上可能溢出，但实际上很难达到 Number.MAX_SAFE_INTEGER。
        // =================================
        
        const win = document.getElementById(id);
        if (win) {
            this.zIndexCounter++;
            win.style.zIndex = this.zIndexCounter;
            this.activeWindowId = id; // 💖 确保更新激活窗口 ID
            
            // 同时更新 store 中的 zIndex (可选，用于持久化层级)
            store.updateApp(id, { zIndex: this.zIndexCounter });
            
            // 更新任务栏高亮
            this.updateTaskbar();
        }
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

        // 🛡️ 容错处理：确保 url 是字符串
        if (!url) return;
        
        // 🎨 统一格式化：确保是 url(...) 格式
        // 如果传入的是纯路径 (如 assets/wp.jpg)，则包裹 url('')
        // 如果传入的已经是 url(...)，则保持不变
        let bgStyle = url.trim();
        if (!bgStyle.startsWith('url(')) {
            bgStyle = `url('${bgStyle}')`;
        }

        // 🎨 应用样式
        // document.documentElement.style.setProperty('--bg-wallpaper', bgStyle);
        const desktop = document.getElementById('desktop');
        if (desktop) desktop.style.backgroundImage = bgStyle;
        localStorage.setItem('seraphim_wallpaper', bgStyle); // 💾 保存完整的 url(...) 字符串

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
            // 💖 过滤掉不显示任务栏图标的应用 (如系统应用)
            if (app.showTaskbarIcon === false) return;

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
                // ✨ 如果窗口处于激活状态 (是当前 activeWindowId 且未最小化)，添加高亮样式
                if (!win.classList.contains('minimized') && this.activeWindowId === id) {
                    div.classList.add('active');
                }
            }
            container.appendChild(div);
        });
    }

    renderTrayIcons() {
        // =================================
        //  🎉 渲染托盘图标 ()
        //
        //  🎨 代码用途：
        //     在任务栏右下角渲染系统应用图标 (如流量、计费)。
        //
        //  💡 易懂解释：
        //     把那些默默工作的小助手放在角落里，不占地方，但随时能找到！📡
        // =================================

        const container = document.getElementById('tray-icons');
        if (!container) return;
        container.innerHTML = ''; // 🧹 清空

        Object.entries(store.apps).forEach(([id, app]) => {
            // 💖 只渲染标记为系统应用且未明确禁止显示的应用
            if (app.system === true) {
                const div = document.createElement('div');
                div.className = 'tray-icon';
                div.dataset.id = id;
                div.title = app.name;
                div.style.cursor = 'pointer';
                div.style.width = '20px';
                div.style.height = '20px';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.justifyContent = 'center';
                
                // 🎨 插入图标 SVG
                const iconPath = app.icon || app.iconPath;
                div.innerHTML = `<svg style="width:16px; height:16px; fill:${app.color || '#ccc'}" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>`;
                
                // 🖱️ 绑定点击事件
                div.onclick = () => this.toggleApp(id);
                
                container.appendChild(div);
            }
        });
    }
}

export const wm = new WindowManager(); // 导出单例实例