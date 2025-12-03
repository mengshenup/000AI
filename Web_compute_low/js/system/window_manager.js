import { store } from './store.js'; // 📦 导入状态存储
import { bus } from './event_bus.js'; // 🚌 导入事件总线
import { DEFAULT_WALLPAPER } from './config.js'; // 🖼️ 导入壁纸配置
import { WALLPAPERS } from '../apps/personalization.js'; // 🖼️ 导入壁纸列表
import { pm } from './process_manager.js'; // 🛡️ 导入进程管理器
import { contextMenuApp } from '../apps_system/context_menu.js'; // 📖 导入右键菜单

export const VERSION = '1.0.0'; // 💖 系统核心模块版本号

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
        
        // ⚡ 懒加载：只创建那些状态为“打开”的窗口 DOM
        // 这样可以避免一次性创建所有 DOM，减少内存占用，并解决“100+应用同时运行”的问题
        Object.entries(store.apps).forEach(([id, app]) => {
            if (app.isOpen) {
                this.createWindow(id, app);
            }
        });

        // this.updateTaskbar();      // 📊 更新任务栏 (已移交 apps_system/taskbar.js)
        // this.initWallpaperApp();   // 🎨 初始化壁纸设置 APP 的内容 (已移除，改为独立 App)
        this.restoreWindows();     // 🔄 恢复上次窗口的位置和状态
        this.setupGlobalEvents();  // 🖱️ 设置全局鼠标点击等事件监听

        // 暴露 wm 到全局，方便 store 异步加载后调用
        window.wm = this;
    }

    // === 1. 初始化与渲染 ===

    createWindow(id, app) {
        // =================================
        //  🎉 创建窗口 (Create Window) (应用ID，应用配置)
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

        // 💖 如果是服务类型 (如胶囊)，不创建窗口
        if (app.type === 'service') return; // 🛑 服务不需要窗口

        // 💖 检查是否已存在
        if (document.getElementById(id)) return; // 🛑 防止重复创建

        const desktop = document.getElementById('desktop'); // 🖥️ 获取桌面容器
        
        // 📦 创建窗口容器
        const win = document.createElement('div'); // 🧱 创建窗口 DIV
        win.id = id; // 🏷️ 设置 ID
        win.className = 'window'; // 🎨 设置类名

        // 💖 图标容错处理：如果 app.icon 缺失，使用默认图标
        const iconPath = app.icon || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'; // ℹ️ 默认图标路径

        // 🏷️ 创建标题栏 (仅当非无边框模式时)
        if (!app.frameless) { // 🖼️ 如果不是无边框模式
            const titleBar = document.createElement('div'); // 🎩 创建标题栏
            titleBar.className = 'title-bar'; // 🎨 设置类名

            // 🎮 窗口控制按钮
            const controls = document.createElement('div'); // 🎮 创建控制按钮区
            controls.className = 'win-controls'; // 🎨 设置类名
            controls.innerHTML = `
                <button class="win-btn min-btn" title="最小化"></button>
                <button class="win-btn close-btn" title="关闭"></button>
            `; // 🔘 添加最小化和关闭按钮

            // 📝 窗口标题
            const title = document.createElement('div'); // 📝 创建标题区
            title.className = 'win-title'; // 🎨 设置类名
            // 组合名称和提示 (使用空格分隔)
            // 💖 增加图标显示
            title.innerHTML = `
                <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor; margin-right:5px; vertical-align:text-bottom;">
                    <path d="${iconPath}"></path>
                </svg>
                ${app.description ? `${app.name}     ${app.description}` : app.name}
            `; // 🖋️ 设置标题内容

            // 交换顺序：按钮在右，标题在左 (恢复经典布局)
            titleBar.appendChild(title); // 👈 添加标题
            titleBar.appendChild(controls); // 👉 添加按钮
            win.appendChild(titleBar); // 📌 添加到窗口
        } else { // 🖼️ 如果是无边框模式
            win.classList.add('frameless'); // 🎨 添加无边框样式类
        }

        // 📄 内容区域
        const content = document.createElement('div'); // 📄 创建内容区
        content.className = 'content'; // 🎨 设置类名
        if (app.contentStyle) { // 💅 如果有自定义样式
            content.style.cssText = app.contentStyle; // 🎨 应用样式
        }
        // 💉 注入 HTML 模板
        content.innerHTML = app.content || ''; // 📝 填充内容

        // 🏗️ 组装窗口 (标题栏已在上面处理)
        win.appendChild(content); // 📌 添加内容区
        
        // 📌 添加到桌面
        desktop.appendChild(win); // 📌 将窗口挂载到桌面

        // 📏 设置窗口大小 (如果有配置)
        if (app.width) win.style.width = typeof app.width === 'number' ? `${app.width}px` : app.width; // 📏 设置宽度
        if (app.height) win.style.height = typeof app.height === 'number' ? `${app.height}px` : app.height; // 📏 设置高度

        // 📏 启用调整大小 (如果配置允许)
        if (app.resizable) { // ↔️ 如果允许调整大小
            win.style.resize = 'both'; // ↔️ 启用 CSS resize
            // 注意：resize 属性通常需要 overflow 不为 visible 才能生效
            // .window 类默认 overflow: hidden，所以这里不需要额外设置
            // 但为了更好的体验，可能需要设置最小宽高
            win.style.minWidth = '320px'; // 📏 最小宽度
            win.style.minHeight = '240px'; // 📏 最小高度
        }

        // 📍 设置初始位置 (优先使用保存的位置，否则使用默认位置，最后兜底)
        // 修复：防止因位置信息丢失导致窗口不可见
        // 💖 强制修正：如果是固定窗口 (fixed)，则忽略 store 中的历史位置，强制使用配置中的位置
        // 这解决了用户修改配置后，因缓存导致位置不更新的问题
        let initialPos = app.winPos || app.pos || { x: 100, y: 100 }; // 📍 获取初始位置
        if (app.fixed) { // 📌 如果是固定窗口
            // 尝试从原始元数据中获取位置，或者直接信任当前的 app 对象 (如果 store 更新逻辑正确)
            // 这里假设 app 对象已经包含了最新的配置信息 (store.checkVersion 应该处理了合并)
            // 但为了保险，如果 app.fixed 为 true，我们应该优先信任 right/bottom 属性
            // 如果 store 里存了 x/y，可能会覆盖 right/bottom，所以这里要做个清理
            if (initialPos.right !== undefined || initialPos.bottom !== undefined) { // 📐 如果有相对定位
                // 如果配置了 right/bottom，就用它们
            }
        }
        
        // 支持 right/bottom 定位
        if (initialPos.right !== undefined) { // 👉 如果有 right 属性
            win.style.right = `${initialPos.right}px`; // 👉 设置 right
            win.style.left = 'auto'; // 🚫 清除 left
        } else { // 👈 否则使用 left
            // 确保坐标是有效数值
            const safeX = isNaN(initialPos.x) ? 100 : initialPos.x; // 🛡️ 安全检查
            win.style.left = `${safeX}px`; // 👈 设置 left
            win.style.right = 'auto'; // 🚫 清除 right
        }

        if (initialPos.bottom !== undefined) { // 👇 如果有 bottom 属性
            win.style.bottom = `${initialPos.bottom}px`; // 👇 设置 bottom
            win.style.top = 'auto'; // 🚫 清除 top
        } else { // 👆 否则使用 top
            const safeY = isNaN(initialPos.y) ? 100 : initialPos.y; // 🛡️ 安全检查
            win.style.top = `${safeY}px`; // 👆 设置 top
            win.style.bottom = 'auto'; // 🚫 清除 bottom
        }

        // 📢 通知应用窗口已就绪 (解决竞态条件)
        bus.emit(`app:ready:${id}`); // 📣 发送就绪事件
    }

    loadWallpaper() {
        // =================================
        //  🎉 加载壁纸 (Load Wallpaper) (无参数)
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
        let savedWp = localStorage.getItem('seraphim_wallpaper'); // 💾 读取本地存储
        
        // 🛡️ 如果没有保存过，使用默认壁纸 (注意：DEFAULT_WALLPAPER 是纯路径)
        if (!savedWp) { // 🤷‍♂️ 如果没有记录
            savedWp = DEFAULT_WALLPAPER; // 🖼️ 使用默认壁纸
        }

        // 🎨 统一格式化：确保是 url(...) 格式
        let bgStyle = savedWp.trim(); // 🧹 去除空格
        if (!bgStyle.startsWith('url(')) { // 🔍 如果不是 url() 格式
            bgStyle = `url('${bgStyle}')`; // 📦 包装成 url()
        }
        
        // 🎨 设置 CSS 变量 --bg-wallpaper，这会立即改变页面背景
        // document.documentElement.style.setProperty('--bg-wallpaper', bgStyle);
        // 🐛 修复：直接设置 #desktop 背景，避免 CSS 变量解析相对路径时的 404 问题 (crbug/css-variables)
        const desktop = document.getElementById('desktop'); // 🖥️ 获取桌面元素
        if (desktop) desktop.style.backgroundImage = bgStyle; // 🖼️ 应用背景图
    }

    changeWallpaper(url, el) {
        // =================================
        //  🎉 初始化壁纸网格 (Init Wallpaper Grid) (无参数)
        //
        //  🎨 代码用途：
        //     在“设置”窗口中生成壁纸选择网格。
        //     (注意：此方法名与下方的 changeWallpaper 冲突，实际运行时会被覆盖，此处仅作注释保留)
        //
        //  💡 易懂解释：
        //     把所有可选的壁纸像照片一样铺开，让你挑一张最喜欢的！🖼️
        //
        //  ⚠️ 警告：
        //     此方法名重复，实际代码中可能无法调用。
        // =================================

        const grid = document.getElementById('wp-grid'); // 📦 获取壁纸网格容器
        if (!grid) return; // 🛑 如果容器不存在则跳过
        grid.innerHTML = ''; // 🧹 清空容器

        // 🔄 遍历配置中的壁纸列表
        WALLPAPERS.forEach(wp => { // 🔄 遍历壁纸列表
            const el = document.createElement('div'); // 🧱 创建壁纸项
            el.className = 'wp-item'; // 🏷️ 设置类名
            el.style.backgroundImage = `url('${wp.url}')`; // 🖼️ 设置缩略图
            // 🖱️ 点击时调用 changeWallpaper 切换壁纸
            el.onclick = () => this.changeWallpaper(wp.url, el); // 🖱️ 绑定点击事件
            grid.appendChild(el); // 📌 添加到网格
        });
    }

    restoreWindows() {
        // =================================
        //  🎉 恢复窗口状态 (Restore Windows) (无参数)
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

        Object.entries(store.apps).forEach(([id, app]) => { // 🔄 遍历所有应用
            const win = document.getElementById(id); // 🪟 获取窗口 DOM
            if (win) { // ✅ 如果窗口存在
                // 📍 如果有保存的位置，恢复位置
                // 修复：增加对无效位置的检查和兜底
                const pos = app.winPos || app.pos || { x: 100, y: 100 }; // 📍 获取位置信息
                
                // 💖 强制修正：如果是固定窗口，优先使用 right/bottom
                // 即使 store 里有 x/y (可能是旧数据)，只要配置了 fixed，就强制归位
                if (app.fixed) { // 📌 如果是固定窗口
                    if (pos.right !== undefined) { // 👉 如果有 right
                        win.style.right = `${pos.right}px`; // 👉 设置 right
                        win.style.left = 'auto'; // 🚫 清除 left
                    }
                    if (pos.bottom !== undefined) { // 👇 如果有 bottom
                        win.style.bottom = `${pos.bottom}px`; // 👇 设置 bottom
                        win.style.top = 'auto'; // 🚫 清除 top
                    }
                    // 如果没有 right/bottom，则回退到 x/y
                    if (pos.right === undefined && pos.bottom === undefined) { // 🤷‍♂️ 如果都没有
                         const safeX = isNaN(pos.x) ? 100 : pos.x; // 🛡️ 安全 X
                         const safeY = isNaN(pos.y) ? 100 : pos.y; // 🛡️ 安全 Y
                         win.style.left = `${safeX}px`; // 👈 设置 left
                         win.style.top = `${safeY}px`; // 👆 设置 top
                    }
                } else { // 🪟 普通窗口
                    // 普通窗口逻辑
                    if (pos.right !== undefined) { // 👉 如果有 right
                        win.style.right = `${pos.right}px`; // 👉 设置 right
                        win.style.left = 'auto'; // 🚫 清除 left
                    } else { // 👈 否则
                        const safeX = isNaN(pos.x) ? 100 : pos.x; // 🛡️ 安全 X
                        win.style.left = `${safeX}px`; // 👈 设置 left
                        win.style.right = 'auto'; // 🚫 清除 right
                    }

                    if (pos.bottom !== undefined) { // 👇 如果有 bottom
                        win.style.bottom = `${pos.bottom}px`; // 👇 设置 bottom
                        win.style.top = 'auto'; // 🚫 清除 top
                    } else { // 👆 否则
                        const safeY = isNaN(pos.y) ? 100 : pos.y; // 🛡️ 安全 Y
                        win.style.top = `${safeY}px`; // 👆 设置 top
                        win.style.bottom = 'auto'; // 🚫 清除 bottom
                    }
                }

                // 🔓 如果上次是打开状态，则重新打开
                if (app.isOpen) this.openApp(id, false); // false 表示不播放语音 🔓 重新打开
            }
        });
    }

    // === 2. 事件委托与交互 ===

    // 💖 新增：处理窗口点击
    handleWindowClick(win) {
        // =================================
        //  🎉 处理窗口点击 (Handle Window Click) (窗口元素)
        //
        //  🎨 代码用途：
        //     当用户点击窗口时，将其置顶。
        //
        //  💡 易懂解释：
        //     谁被点到了，谁就站到最前面来！🙋‍♂️
        // =================================
        const id = win.id; // 🆔 获取窗口 ID
        // 如果点击的不是当前激活窗口，则置顶并更新状态
        if (this.activeWindowId !== id) { // 🔄 如果不是当前激活的
            this.bringToFront(id); // 🔝 置顶
        }
    }

    setupGlobalEvents() {
        // =================================
        //  🎉 设置全局事件 (Setup Global Events) (无参数)
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
        document.addEventListener('mousedown', (e) => { // 👂 监听全局鼠标按下
            const target = e.target; // 🎯 获取被点击的元素

            // 1. 处理窗口点击 (置顶)
            const win = target.closest('.window'); // 🔍 查找最近的窗口元素
            if (win) { // ✅ 如果点到了窗口
                this.handleWindowClick(win); // 💖 统一处理窗口点击
            }

            // 2. 处理窗口控制按钮 (关闭)
            if (target.closest('.close-btn')) { // ❌ 如果点到了关闭按钮
                // const win = target.closest('.window'); // 上面已经获取了
                if (win) this.closeApp(win.id); // ❌ 关闭窗口
            }
            // 2. 处理窗口控制按钮 (最小化)
            else if (target.closest('.min-btn')) { // 🔽 如果点到了最小化按钮
                const win = target.closest('.window'); // 🔍 查找窗口
                if (win) this.minimizeApp(win.id); // 🔽 最小化窗口
            } else {
                // 3. 处理图标点击 (使用 closest 查找父级)
                const icon = target.closest('.desktop-icon'); // 🔍 查找桌面图标
                if (icon) { // ✅ 如果点到了图标
                    // 💖 改为双击打开，此处仅做选中处理
                    // 🛑 仅阻止冒泡，不阻止默认行为 (防止影响双击)
                    // e.preventDefault(); // ❌ 移除此行，否则双击事件无法触发
                    e.stopPropagation(); // 阻止冒泡
                    return; // 🛑 结束处理
                }
                
                // 4. 处理任务栏图标点击 (使用 closest 查找父级)
                const taskApp = target.closest('.task-app'); // 🔍 查找任务栏图标
                if (taskApp) { // ✅ 如果点到了任务栏图标
                    const id = taskApp.dataset.id; // 🆔 获取应用 ID
                    this.toggleApp(id); // 🔄 切换应用状态
                    return; // 🛑 结束处理
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
                const capsuleWindows = ['win-traffic', 'win-billing', 'win-fps']; // 📋 需要自动关闭的窗口列表
                capsuleWindows.forEach(id => { // 🔄 遍历列表
                    const win = document.getElementById(id); // 🪟 获取窗口 DOM
                    // 如果窗口存在且已打开
                    if (win && win.classList.contains('open')) { // ✅ 如果窗口是打开的
                        // 检查点击是否在窗口内部
                        if (win.contains(target)) return; // 🛑 如果点在窗口内，不关闭
                        
                        // 检查点击是否在对应的胶囊按钮上 (防止点击按钮时刚打开就被关闭)
                        // 💖 修复：胶囊ID规则为 capsule-svc-xxx (win-traffic -> capsule-svc-traffic)
                        // 映射规则：win-xxx -> capsule-svc-xxx
                        const serviceId = id.replace('win-', 'svc-'); // win-traffic -> svc-traffic
                        const capsuleId = `capsule-${serviceId}`; // -> capsule-svc-traffic
                        
                        const capsule = document.getElementById(capsuleId); // 💊 获取胶囊 DOM
                        if (capsule && capsule.contains(target)) return; // 🛑 如果点在胶囊上，不关闭

                        // 如果既不在窗口内，也不在按钮上，则关闭
                        this.closeApp(id); // ❌ 关闭窗口
                    }
                });
            }
        });

        // 🖱️🖱️ 全局双击委托
        document.addEventListener('dblclick', (e) => {
            const icon = e.target.closest('.desktop-icon');
            if (icon) {
                const id = icon.dataset.id;
                this.openApp(id);
            }
        });

        // 🖱️ 右键菜单委托
        document.addEventListener('contextmenu', (e) => { // 👂 监听右键菜单事件
            const icon = e.target.closest('.desktop-icon'); // 🔍 查找桌面图标
            if (icon) { // ✅ 如果点到了图标
                e.preventDefault(); // 🚫 阻止默认右键菜单
                const id = icon.dataset.id; // 🆔 获取应用 ID
                const app = store.getApp(id); // 📊 获取应用数据
                
                contextMenuApp.show(e.clientX, e.clientY, [ // 📖 显示自定义右键菜单
                    {
                        label: '打开', // 🏷️ 菜单项文本
                        icon: '🚀', // 🖼️ 菜单项图标
                        action: () => this.openApp(id) // 🚀 点击动作
                    },
                    {
                        label: '重命名', // 🏷️ 菜单项文本
                        icon: '✏️', // 🖼️ 菜单项图标
                        action: () => { // ✏️ 点击动作
                            // 获取输入框元素
                            const input = document.getElementById('rename-input'); // 📝 获取重命名输入框
                            if (!input) return; // 🛑 如果输入框不存在

                            // 获取图标位置
                            const rect = icon.getBoundingClientRect(); // 📏 获取图标位置
                            
                            // 设置输入框位置 (在图标下方)
                            input.style.left = `${rect.left + rect.width / 2 - 50}px`; // 📍 水平居中
                            input.style.top = `${rect.bottom + 5}px`; // 📍 垂直位置
                            input.style.display = 'block'; // 👁️ 显示输入框
                            input.innerText = app.name; // 📝 填充当前名称
                            
                            // 聚焦并全选
                            input.focus(); // 🔦 聚焦
                            const range = document.createRange(); // 📏 创建选区
                            range.selectNodeContents(input); // 📝 选中内容
                            const sel = window.getSelection(); // 🖱️ 获取选区对象
                            sel.removeAllRanges(); // 🧹 清除旧选区
                            sel.addRange(range); // ➕ 添加新选区

                            // 定义提交函数
                            const submit = () => { // 💾 提交修改
                                const newName = input.innerText.trim(); // 🧹 获取新名称
                                input.style.display = 'none'; // 🙈 隐藏输入框
                                
                                if (newName && newName !== '') { // ✅ 如果名称有效
                                    // 保存自定义名称到 customName 字段，并更新 name
                                    store.updateApp(id, { customName: newName, name: newName }); // 💾 更新 store
                                    
                                    // 📢 通知桌面更新图标
                                    bus.emit('app:renamed', { id, newName }); // 📣 发送重命名事件
                                    
                                    // 如果窗口已打开，也更新窗口标题
                                    const winTitle = document.querySelector(`#${id} .win-title`); // 🔍 查找窗口标题
                                    if (winTitle) { // ✅ 如果窗口存在
                                        const desc = app.description || ''; // 📝 获取描述
                                        winTitle.innerText = desc ? `${newName} · ${desc}` : newName; // 📝 更新标题文本
                                    }
                                }
                            };

                            // 绑定回车和失焦事件
                            const handleKey = (e) => { // ⌨️ 键盘事件
                                if (e.key === 'Enter') { // ↵ 如果按了回车
                                    e.preventDefault(); // 🚫 阻止换行
                                    submit(); // 💾 提交
                                    cleanup(); // 🧹 清理监听器
                                }
                            };
                            const handleBlur = () => { // 🖱️ 失焦事件
                                submit(); // 💾 提交
                                cleanup(); // 🧹 清理监听器
                            };

                            // 清理事件监听
                            const cleanup = () => { // 🧹 清理函数
                                input.removeEventListener('keydown', handleKey); // ➖ 移除键盘监听
                                input.removeEventListener('blur', handleBlur); // ➖ 移除失焦监听
                            };

                            input.addEventListener('keydown', handleKey); // ➕ 添加键盘监听
                            input.addEventListener('blur', handleBlur); // ➕ 添加失焦监听
                        }
                    }
                ]);
            }
        });

        // 🚚 全局拖拽相关事件
        document.addEventListener('mousedown', (e) => { // 👂 监听鼠标按下
            // 🛑 只响应左键点击
            if (e.button !== 0) return; // 🖱️ 必须是左键

            const target = e.target; // 🎯 获取目标元素
            
            // 🛑 如果点击的是窗口控制按钮，则不触发拖拽
            if (target.closest('.win-btn')) return; // 🚫 忽略按钮

            // 🛑 如果点击的是任务栏，也不触发拖拽 (除非实现了任务栏排序)
            if (target.closest('#taskbar')) return; // 🚫 忽略任务栏

            // 🛑 只处理窗口和图标的拖拽
            // 修复：使用 closest 查找图标，支持点击图标内部元素拖拽
            const win = target.closest('.window'); // 🔍 查找窗口
            const icon = target.closest('.desktop-icon'); // 🔍 查找图标
            
            if (!win && !icon) return; // 🛑 如果都不是，忽略

            // 💖 修复：窗口只能通过标题栏拖拽 (解决内容区域点击冲突和调整大小失效问题)
            if (win) {
                // 💖 特殊处理：小天使窗口 (win-companion) 允许任意位置拖拽
                // 因为它没有标题栏，且需要支持拖拽移动
                if (win.id === 'win-companion') {
                    // 允许拖拽，除非点击的是交互元素 (如输入框、按钮)
                    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('.angel-chat-box')) {
                        return;
                    }
                    // 继续执行拖拽逻辑
                }
                // 如果点击的不是标题栏，且不是无边框窗口(无边框可能需要特殊处理，暂且允许任意拖拽或指定区域)
                // 这里假设无边框窗口 (如 Widget) 也可以通过任意位置拖拽，或者它们有自己的拖拽区
                // 但为了解决浏览器拖拽冲突，必须限制
                else if (!target.closest('.title-bar') && !win.classList.contains('frameless')) {
                    return; // 🛑 不是标题栏，不拖拽
                }
                // 如果是无边框窗口，可能需要允许拖拽，或者检查特定 class
                // 目前 Widget 似乎没有 title-bar，所以可能需要保留原逻辑?
                // 检查 Widget 结构: 胶囊窗口通常是 frameless
                if (win.classList.contains('frameless')) {
                    // 对于无边框窗口，如果点击的是交互元素(如按钮、输入框)，也不应该拖拽
                    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('.interactive')) {
                        return;
                    }
                }
            }

            // 🛑 检查是否固定位置 (如 Widget)
            const id = (win || icon).id.replace('icon-', ''); // 🆔 获取 ID
            const app = store.getApp(id); // 📊 获取应用数据
            if (app && app.fixed) return; // 📌 如果固定，忽略

            // 📍 记录鼠标按下位置
            this.dragState.startX = e.clientX; // 📍 记录 X
            this.dragState.startY = e.clientY; // 📍 记录 Y
            this.dragState.active = true; // 🚩 标记为正在拖拽

            const item = win || icon; // 📦 确定拖拽对象
            this.dragState.item = item; // 📦 保存对象
            this.dragState.type = win ? 'window' : 'icon'; // 🏷️ 记录类型

            // 📏 计算鼠标相对于元素的偏移
            const rect = item.getBoundingClientRect(); // 📏 获取元素位置
            this.dragState.offsetX = e.clientX - rect.left; // 📏 计算 X 偏移
            this.dragState.offsetY = e.clientY - rect.top; // 📏 计算 Y 偏移

            // 🎨 添加拖拽过程中需要的样式或逻辑
            // item.classList.add('dragging'); // 移到 handleMouseMove 中延迟添加

            // 🛡️ 显示遮罩层
            // const overlay = document.getElementById('drag-overlay');
            // if (overlay) overlay.style.display = 'block'; // 移到 handleMouseMove 中延迟显示

            // 🔗 绑定鼠标移动和抬起事件
            document.addEventListener('mousemove', this.handleMouseMove); // ➕ 监听移动
            document.addEventListener('mouseup', this.handleMouseUp); // ➕ 监听抬起
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
        //  🎉 处理鼠标移动 (Handle Mouse Move) (事件对象)
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

        if (!this.dragState.active) return; // 🛑 如果没在拖拽，直接返回

        const { clientX, clientY } = e; // 📍 获取当前鼠标位置
        
        // 🛡️ 拖拽阈值检查：只有移动超过 5px 才开始真正的拖拽
        // 这可以防止点击时的微小抖动被误判为拖拽，从而修复点击/双击失效的问题
        if (!this.dragState.isDragging) { // 🔍 如果还没确认开始拖拽
            const moveX = Math.abs(clientX - this.dragState.startX); // 📏 计算 X 移动距离
            const moveY = Math.abs(clientY - this.dragState.startY); // 📏 计算 Y 移动距离
            if (moveX < 5 && moveY < 5) return; // 🛑 移动太小，忽略
            
            // 🚀 确认开始拖拽
            this.dragState.isDragging = true; // ✅ 标记为正在拖拽
            e.preventDefault(); // 🛑 防止选中文本或其他默认行为
            
            // 🎨 添加拖拽样式 (延迟到这里才添加)
            if (this.dragState.item) { // ✅ 如果有拖拽对象
                this.dragState.item.classList.add('dragging'); // 🎨 添加样式类
            }
            
            // 🛡️ 显示遮罩层 (延迟到这里才显示)
            const overlay = document.getElementById('drag-overlay'); // 🛡️ 获取遮罩层
            if (overlay) overlay.style.display = 'block'; // 👁️ 显示遮罩层
        }

        const { item, offsetX, offsetY } = this.dragState; // 📦 解构状态

        // 🔢 计算新的位置
        const x = clientX - offsetX; // 🧮 计算新 Left
        const y = clientY - offsetY; // 🧮 计算新 Top

        // 📍 更新元素位置
        item.style.left = `${x}px`; // 📍 应用 Left
        item.style.top = `${y}px`; // 📍 应用 Top
    }

    handleMouseUp(e) {
        // =================================
        //  🎉 处理鼠标抬起 (Handle Mouse Up) (事件对象)
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

        if (!this.dragState.active) return; // 🛑 如果没在拖拽，直接返回

        // 💾 只有真正拖拽过才保存位置
        if (this.dragState.isDragging) { // ✅ 如果发生过拖拽
            // 📍 获取最终位置
            const x = parseInt(this.dragState.item.style.left); // 📏 获取最终 X
            const y = parseInt(this.dragState.item.style.top); // 📏 获取最终 Y
            // 🆔 获取应用 ID (去掉 icon- 前缀)
            const id = this.dragState.item.id.replace('icon-', ''); // 🆔 解析 ID

            // 💾 根据类型保存到 store
            if (this.dragState.type === 'window') { // 🪟 如果是窗口
                store.updateApp(id, { winPos: { x, y } }); // 💾 保存窗口位置
            } else if (this.dragState.type === 'icon') { // 🖼️ 如果是图标
                store.updateApp(id, { pos: { x, y } }); // 💾 保存图标位置
            }
        }

        // 🧹 清理状态
        this.dragState.active = false; // ❌ 取消激活
        this.dragState.isDragging = false; // ❌ 取消拖拽标记
        this.dragState.item = null; // 🗑️ 清空对象引用
        // 🔌 移除监听器
        document.removeEventListener('mousemove', this.handleMouseMove); // ➖ 移除移动监听
        document.removeEventListener('mouseup', this.handleMouseUp); // ➖ 移除抬起监听

        // 🛡️ 隐藏遮罩层
        const overlay = document.getElementById('drag-overlay'); // 🛡️ 获取遮罩层
        if (overlay) overlay.style.display = 'none'; // 🙈 隐藏遮罩层
    }

    // === 4. 窗口操作 ===

    openApp(id, speak = true) {
        // =================================
        //  🎉 打开应用 (Open App) (应用ID，是否说话)
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
        let win = document.getElementById(id); // 🔍 查找窗口 DOM
        if (!win) { // 🤷‍♂️ 如果窗口不存在
            let appInfo = store.getApp(id); // 📊 获取应用配置
            
            // 💖 懒加载逻辑：如果 store 里有配置但没有加载代码 (通常不会发生，因为 store.apps 是运行时内存)
            // 或者如果 store 里根本没有这个 app (可能是新安装的，或者懒加载未触发)
            // 我们需要检查 lazyRegistry
            if (!appInfo) { // 🤷‍♂️ 如果配置也不存在
                const lazyPath = store.getLazyAppPath(id); // 🔍 检查懒加载注册表
                if (lazyPath) { // ✅ 如果是懒加载应用
                    console.log(`[WindowManager] 触发懒加载: ${id} -> ${lazyPath}`); // 📝 打印日志
                    bus.emit('system:speak', "正在安装应用..."); // 💖 语音提示正在安装
                    
                    // 动态加载模块
                    // 注意：这里需要异步处理，但 openApp 是同步的。
                    // 我们需要把 openApp 变成 async，或者在这里使用 .then
                    // 为了保持兼容性，我们使用 .then 并在加载完成后重新调用 openApp
                    import(lazyPath).then(m => { // 📦 动态导入模块
                        console.log(`[WindowManager] 模块加载成功: ${id}`, m);

                        // 💖 兼容 default export 和直接 export
                        const config = m.config || (m.default && m.default.config);

                        if (config) { // ✅ 如果模块有配置
                            // 注册元数据
                            store.setAppMetadata(config.id, config); // 💾 注册应用
                            
                            // 🛡️ 安全初始化：防止 init 报错阻断流程
                            if (typeof m.init === 'function') {
                                try {
                                    console.log(`[WindowManager] 执行应用初始化: ${id}`);
                                    m.init(); // 🚀 初始化应用
                                } catch (e) {
                                    console.error(`[WindowManager] 应用 ${id} 初始化失败 (非致命):`, e);
                                }
                            }
                            
                            // 💖 修复无限循环：检查 ID 是否匹配
                            if (config.id !== id) {
                                console.warn(`[WindowManager] ID Mismatch: requested ${id}, loaded ${config.id}. Redirecting...`);
                                this.openApp(config.id, speak); // 🔄 打开正确的 ID
                                return;
                            }

                            // 重新打开
                            console.log(`[WindowManager] 重新打开应用: ${id}`);
                            this.openApp(id, speak); // 🔄 递归调用打开
                        } else {
                            console.error(`[WindowManager] 模块 ${id} 缺少 config 导出`);
                            bus.emit('system:speak', "应用文件损坏");
                        }
                    }).catch(err => { // ❌ 加载失败
                        console.error(`无法懒加载应用 ${id}:`, err); // ❌ 打印错误
                        bus.emit('system:speak', "应用安装失败");
                    });
                    return; // 退出当前执行，等待异步加载完成
                }
            }

            if (appInfo) { // ✅ 如果找到了配置
                // 💖 如果是服务类型，不需要创建窗口，直接标记为打开
                if (appInfo.type === 'service') { // ⚙️ 如果是服务
                    store.updateApp(id, { isOpen: true }); // 💾 标记为打开
                    bus.emit('app:opened', { id }); // 📣 发送打开事件
                    return; // 🛑 结束
                }

                this.createWindow(id, appInfo); // 🏗️ 创建窗口
                win = document.getElementById(id); // 🔍 重新获取窗口 DOM
            } else { // ❌ 如果还是找不到配置
                console.error(`无法打开应用 ${id}: 配置不存在`); // ❌ 报错
                // 💖 尝试重新注册懒加载 (针对 Intelligence 等可能丢失的情况)
                const lazyPath = store.getLazyAppPath(id);
                if (lazyPath) {
                     console.log(`[WindowManager] 尝试紧急懒加载: ${id}`);
                     import(lazyPath).then(m => {
                         if (m.config) {
                             store.setAppMetadata(m.config.id, m.config);
                             this.openApp(id, speak);
                         }
                     });
                }
                return; // 🛑 结束
            }
        }

        if (!win) return; // 🛡️ 双重保险

        win.classList.remove('minimized'); // 🔼 移除最小化状态
        win.classList.add('open');         // 🔓 添加打开状态
        this.bringToFront(id);             // 🔝 置顶
        store.updateApp(id, { isOpen: true }); // 💾 保存状态

        // 📢 通知应用已打开 (可用于恢复运行)
        // 💖 统一发送对象格式，方便扩展
        bus.emit('app:opened', { id }); // 📣 发送打开事件

        // 🔊 播放打开语音 (已移交 AngelApp 处理)
        // if (speak) { ... } 
        // this.updateTaskbar(); // 📊 更新任务栏 (已移交 apps_system/taskbar.js)
    }

    closeApp(id) {
        // =================================
        //  🎉 关闭应用 (Close App) (应用ID) - 统一销毁模式
        //
        //  🎨 代码用途：
        //     点击关闭按钮时，直接销毁应用，释放所有资源。
        //     不再保留“挂起”状态，确保系统轻量化。
        //
        //  💡 易懂解释：
        //     点那个红叉叉，房子直接拆掉！下次要用再重新盖。
        //     这样最省地皮（内存），也不会有奇怪的声音（后台运行）吵到你。🏗️
        // =================================

        // 💖 检查是否为系统应用
        const app = store.getApp(id); // 📊 获取应用数据
        if (app && app.isSystem) { // 🛡️ 如果是系统应用
            console.log(`[WindowManager] 系统应用 ${id} 被关闭，正在重启...`); // 📝 打印日志
            
            // 1. 先彻底销毁
            this.killApp(id); // ☠️ 销毁

            // 2. 延迟一小会儿后重新打开 (模拟重启效果)
            setTimeout(() => { // ⏳ 延迟执行
                this.openApp(id, false); // false 表示不播放语音 🔄 重启
            }, 1000); // 1秒后
            return; // 🛑 结束
        }

        this.killApp(id); // 🔄 直接复用销毁逻辑
    }

    killApp(id) {
        // =================================
        //  🎉 终止应用 (Kill App) (应用ID)
        //
        //  🎨 代码用途：
        //     1. 移除 DOM 元素
        //     2. 调用进程管理器清理资源队列
        //     3. 更新任务栏
        // =================================

        const win = document.getElementById(id); // 🔍 查找窗口 DOM
        if (win) { // ✅ 如果存在
            win.remove(); // 🗑️ 移除 DOM 元素
        }

        store.updateApp(id, { isOpen: false }); // 💾 保存状态为关闭
        
        // 📢 发送关闭信号 (给应用内部逻辑一个最后的通知，让它们有机会自己清理)
        // 💖 必须在 pm.kill 之前发送，否则监听器可能已经被清理了
        bus.emit(`app:closed:${id}`); // 📣 发送关闭事件
        bus.emit('app:closed', { id }); // 💖 发送通用关闭事件，供任务栏等监听
        bus.emit('app:destroyed', id); // 兼容旧事件

        // 🛡️ 调用进程管理器，清理该应用名下的所有资源
        pm.kill(id); // ☠️ 清理进程资源
        
        // this.updateTaskbar(); // 📊 更新任务栏 (已移交 apps_system/taskbar.js)
    }

    minimizeApp(id) {
        // =================================
        //  🎉 最小化应用 (Minimize App) (应用ID)
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

        const win = document.getElementById(id); // 🔍 查找窗口 DOM
        if (win) { // ✅ 如果存在
            win.classList.add('minimized'); // 🔽 添加最小化类名 (CSS控制隐藏)
            store.updateApp(id, { isMinimized: true }); // 💾 保存状态
            
            // 💖 修复：最小化时清除激活状态，防止任务栏显示为激活
            if (this.activeWindowId === id) {
                this.activeWindowId = null;
                bus.emit('window:blur', { id }); // 📣 发送失焦事件 (如果有监听的话)
            }
            bus.emit('app:minimized', { id }); // 💖 发送最小化事件
        }
        // this.updateTaskbar(); // 📊 更新任务栏 (已移交 apps_system/taskbar.js)
    }

    restoreApp(id) {
        // =================================
        //  🎉 恢复应用 (Restore App) (应用ID)
        //
        //  🎨 代码用途：
        //     取消最小化状态，显示窗口。
        //
        //  💡 易懂解释：
        //     别躲啦，快出来干活！👷
        // =================================

        const win = document.getElementById(id); // 🔍 查找窗口 DOM
        if (win) { // ✅ 如果存在
            win.classList.remove('minimized'); // 🔼 移除最小化类名
            store.updateApp(id, { isMinimized: false }); // 💾 保存状态
        }
        // this.updateTaskbar(); // 📊 更新任务栏 (已移交 apps_system/taskbar.js)
    }

    toggleApp(id) {
        // =================================
        //  🎉 切换应用状态 (Toggle App) (应用ID)
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

        const app = store.getApp(id); // 📊 获取应用数据
        // 如果 store 中没有，尝试从 DOM 判断（兼容旧逻辑）
        const win = document.getElementById(id); // 🔍 查找窗口 DOM
        const isOpen = app ? app.isOpen : (win && win.classList.contains('open')); // 👁️ 判断是否打开
        const isMinimized = app ? app.isMinimized : (win && win.classList.contains('minimized')); // 🔽 判断是否最小化

        // 💖 修复逻辑：
        // 1. 如果没打开 -> 打开
        // 2. 如果已最小化 -> 恢复
        // 3. 如果已打开且在最前面 -> 最小化
        // 4. 如果已打开但被挡住 -> 置顶

        if (!isOpen) { // 1. 如果没打开
            // 1. 如果没打开，则打开
            this.openApp(id); // 🚀 打开
        } else if (isMinimized) { // 2. 如果已最小化
            // 2. 如果已最小化，则恢复并置顶
            this.restoreApp(id); // 🔼 恢复
            this.bringToFront(id); // 🔝 置顶
        } else { // 3. 如果已打开且未最小化
            // 3. 如果已打开且未最小化
            // 检查是否是当前最顶层窗口
            // ⚠️ 注意：activeWindowId 可能不准确，或者被其他操作干扰
            // 这里增加一个判断：如果点击的是当前激活窗口，则最小化；否则置顶
            
            // 获取当前最高层级的窗口ID (简单判断 zIndex)
            const currentZ = parseInt(win.style.zIndex || 0); // 📏 获取当前层级
            // 简单的启发式判断：如果它的 zIndex 是最大的，那它就是激活的
            // 但为了稳健，我们还是依赖 activeWindowId，并确保 bringToFront 正确更新它
            
            if (this.activeWindowId === id) { // 🎯 如果是当前激活窗口
                this.minimizeApp(id); // 🔽 最小化
            } else { // 🔙 如果不是当前激活窗口
                this.bringToFront(id); // 🔝 置顶
            }
        }
    }

    bringToFront(id) {
        // =================================
        //  🎉 窗口置顶 (Bring To Front) (应用ID)
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
        
        const win = document.getElementById(id); // 🔍 查找窗口 DOM
        if (win) { // ✅ 如果存在
            this.zIndexCounter++; // ➕ 增加计数器
            win.style.zIndex = this.zIndexCounter; // 🔝 设置层级
            this.activeWindowId = id; // 💖 确保更新激活窗口 ID
            
            // 同时更新 store 中的 zIndex (可选，用于持久化层级)
            store.updateApp(id, { zIndex: this.zIndexCounter }); // 💾 保存层级
            
            // 📢 发送窗口聚焦事件，通知任务栏等组件更新
            bus.emit('window:focus', { id }); // 📣 发送聚焦事件
        }
    }

    changeWallpaper(url, el) {
        // =================================
        //  🎉 更换壁纸 (Change Wallpaper) (图片URL，被点击的元素)
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
        if (!url) return; // 🛑 如果 URL 无效
        
        // 🎨 统一格式化：确保是 url(...) 格式
        // 如果传入的是纯路径 (如 assets/wp.jpg)，则包裹 url('')
        // 如果传入的已经是 url(...)，则保持不变
        let bgStyle = url.trim(); // 🧹 去除空格
        if (!bgStyle.startsWith('url(')) { // 🔍 如果不是 url() 格式
            bgStyle = `url('${bgStyle}')`; // 📦 包装成 url()
        }

        // 🎨 应用样式
        // document.documentElement.style.setProperty('--bg-wallpaper', bgStyle);
        const desktop = document.getElementById('desktop'); // 🖥️ 获取桌面元素
        if (desktop) desktop.style.backgroundImage = bgStyle; // 🖼️ 应用背景图
        localStorage.setItem('seraphim_wallpaper', bgStyle); // 💾 保存完整的 url(...) 字符串

        // 🎨 更新选中状态样式
        if (el) { // ✅ 如果有点击元素
            document.querySelectorAll('.wp-item').forEach(i => i.classList.remove('active')); // 🧹 移除旧选中
            el.classList.add('active'); // 🎯 添加新选中
        }
        bus.emit('system:speak', "壁纸换好啦！🌿"); // 🗣️ 语音播报
    }
}

export const wm = new WindowManager(); // 导出单例实例
