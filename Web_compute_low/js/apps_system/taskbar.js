import { store } from '../system/store.js'; // 💖 引入全局状态管理
import { bus } from '../system/event_bus.js'; // 💖 引入事件总线
import { contextMenuApp } from './context_menu.js'; // 💖 引入右键菜单

export const VERSION = '1.0.0'; // 💖 版本号

// =================================
//  🎉 任务栏配置对象
//
//  🎨 代码用途：
//     定义任务栏服务的元数据。
//
//  💡 易懂解释：
//     这是屏幕底部的那个长条条，它知道你开了哪些窗口，还藏着开始按钮哦！📏
//
//  ⚠️ 警告：
//     isSystem: true 标记这是系统级服务。
// =================================
export const config = {
    id: 'sys-taskbar',
    name: '任务栏',
    version: '1.0.0', // 🆕 版本号
    type: 'service',
    isSystem: true,
    description: '系统任务栏管理器'
};

// =================================
//  🎉 初始化函数 (无参数)
//
//  🎨 代码用途：
//     启动任务栏渲染，绑定开始按钮，并监听应用状态变化以更新任务栏。
//
//  💡 易懂解释：
//     任务栏准备就绪！先把图标摆好，然后盯着每一个窗口：“你打开了吗？你最小化了吗？” 👀
//
//  ⚠️ 警告：
//     依赖 DOM 中 id="taskbar-apps" 和 id="tray-icons" 的元素。
// =================================
export function init() {
    // 初始渲染
    update(); // 💖 渲染任务栏应用图标
    renderTrayIcons(); // 💖 渲染托盘图标
    bindStartButton(); // 🆕 绑定开始按钮 // 💖 绑定开始按钮点击事件

    // 监听事件
    bus.on('app:opened', () => update()); // 💖 应用打开时更新任务栏
    bus.on('app:closed', () => update()); // 💖 应用关闭时更新任务栏
    bus.on('window:focus', () => update()); // 💖 窗口聚焦时更新任务栏状态
    bus.on('window:blur', () => update()); // 💖 窗口失焦时更新任务栏状态
    bus.on('app:minimized', () => update()); // 💖 应用最小化时更新任务栏状态
    bus.on('app:updated', () => update()); // 💖 应用更新时(如固定/取消固定)更新任务栏
}

// =================================
//  🎉 绑定开始按钮 (无参数)
//
//  🎨 代码用途：
//     为开始按钮添加点击事件监听器，点击时触发系统登录界面。
//
//  💡 易懂解释：
//     给那个最左边的按钮装上弹簧，一按下去，“砰”的一下，登录界面就弹出来啦！🔘
//
//  ⚠️ 警告：
//     依赖 DOM 中 id="btn-start" 的元素。
// =================================
function bindStartButton() {
    const btnStart = document.getElementById('btn-start'); // 💖 获取开始按钮元素
    if (btnStart) { // 💖 如果按钮存在
        btnStart.onclick = () => {
            console.log("[Taskbar] Start button clicked");
            // 💖 检查是否已登录 (通过 localStorage 或 store)
            const userId = localStorage.getItem('current_user_id');
            console.log("[Taskbar] Current User ID:", userId);
            if (userId) {
                // 已登录，打开 Key 管理器
                console.log("[Taskbar] Emitting system:open_key_mgr");
                bus.emit('system:open_key_mgr');
            } else {
                // 未登录，打开登录界面
                console.log("[Taskbar] Emitting system:open_login");
                bus.emit('system:open_login');
            }
        };
    }
}

// =================================
//  🎉 更新任务栏应用图标 (无参数)
//
//  🎨 代码用途：
//     遍历所有应用，根据其状态（打开、活动、最小化）在任务栏渲染对应的图标。
//
//  💡 易懂解释：
//     点名啦！正在运行的应用请举手！🙋‍♂️
//     我会把你们的小图标整整齐齐地排在任务栏上，亮着的表示正在用哦。
//
//  ⚠️ 警告：
//     会清空 #taskbar-apps 下的所有内容并重新生成。
// =================================
function update() {
    const container = document.getElementById('taskbar-apps'); // 💖 获取任务栏应用容器
    if (!container) return; // 💖 如果容器不存在，直接返回
    container.innerHTML = ''; // 💖 清空容器内容

    // 获取全局 WM 实例以检查活动窗口
    const wm = window.wm; // 💖 获取窗口管理器实例

    Object.entries(store.apps).forEach(([id, app]) => { // 💖 遍历所有应用
        if (app.isSystem) return; // 💖 跳过系统应用

        // 💖 新增：如果应用明确要求跳过任务栏 (即使运行中也不显示)
        if (app.skipTaskbar) return;

        const win = document.getElementById(id); // 💖 尝试获取应用对应的窗口 DOM
        
        // 💖 逻辑更新：显示条件 = (已固定) OR (已打开)
        const isPinned = app.showTaskbarIcon !== false; // 默认为 true，除非显式设为 false
        const isRunning = app.isOpen && win && win.classList.contains('open');

        if (!isPinned && !isRunning) return; // 既没固定也没运行，不显示

        const div = document.createElement('div'); // 💖 创建任务栏图标容器
        div.className = 'task-app'; // 💖 添加 CSS 类名
        div.dataset.id = id; // 💖 存储应用 ID
        div.title = app.name || id; // 💖 设置鼠标悬停提示
        const iconPath = app.icon || app.iconPath; // 💖 获取图标路径
        div.innerHTML = `<svg style="width:24px;fill:${app.color}" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>`; // 💖 渲染 SVG 图标

        if (isRunning) { // 💖 如果窗口存在且已打开
            div.classList.add('running'); // 💖 标记为运行中（显示下划线或高亮）
            if (wm && !win.classList.contains('minimized') && wm.activeWindowId === id) { // 💖 如果窗口未最小化且是当前活动窗口
                div.classList.add('active'); // 💖 标记为活动状态（背景高亮）
            }
        }
        
        // 🖱️ 绑定右键菜单：取消固定/固定
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const menuItems = [
                {
                    label: '打开/最小化',
                    icon: '🔄',
                    action: () => window.wm.toggleApp(id)
                }
            ];

            if (isPinned) {
                menuItems.push({
                    label: '取消固定',
                    icon: '🗑️',
                    action: () => {
                        store.updateApp(id, { showTaskbarIcon: false });
                        update(); // 💖 立即刷新
                        bus.emit('system:speak', "已取消固定");
                    }
                });
            } else {
                menuItems.push({
                    label: '固定到任务栏',
                    icon: '📌',
                    action: () => {
                        store.updateApp(id, { showTaskbarIcon: true });
                        update(); // 💖 立即刷新
                        bus.emit('system:speak', "已固定");
                    }
                });
            }
            
            contextMenuApp.show(e.clientX, e.clientY, menuItems);
        });

        container.appendChild(div); // 💖 将图标添加到任务栏
    });
}


// =================================
//  🎉 渲染托盘图标 (无参数)
//
//  🎨 代码用途：
//     渲染系统托盘区域的图标（如网络、音量等系统服务）。
//
//  💡 易懂解释：
//     这里是任务栏的小角落，藏着那些默默工作的小帮手，比如音量调节和网络连接。🔇📶
//
//  ⚠️ 警告：
//     只渲染 system: true 的应用。
// =================================
function renderTrayIcons() {
    const container = document.getElementById('tray-icons'); // 💖 获取托盘容器元素
    if (!container) return; // 💖 如果容器不存在，直接返回
    container.innerHTML = ''; // 💖 清空容器内容

    const wm = window.wm; // 💖 获取窗口管理器实例

    Object.entries(store.apps).forEach(([id, app]) => { // 💖 遍历所有应用
        // 💖 新增：如果应用明确要求不显示托盘图标
        if (app.showTrayIcon === false) return;

        // 💖 只渲染标记为系统应用且未明确禁止显示的应用
        // 💖 修复：过滤掉不需要显示在托盘的系统应用 (如桌面、任务栏本身、右键菜单等)
        // 💖 新增：过滤掉胶囊服务 (svc-traffic, svc-billing, svc-fps)，它们只显示胶囊，不显示托盘图标
        const hiddenSystemApps = ['sys-desktop', 'sys-taskbar', 'sys-context-menu', 'app-login', 'win-companion', 'svc-traffic', 'svc-billing', 'svc-fps'];
        if (app.isSystem === true && !hiddenSystemApps.includes(id)) {
            const div = document.createElement('div'); // 💖 创建托盘图标容器
            div.className = 'tray-icon'; // 💖 添加 CSS 类名
            div.dataset.id = id; // 💖 存储应用 ID
            div.title = app.name; // 💖 设置鼠标悬停提示
            div.style.cursor = 'pointer'; // 💖 设置鼠标样式
            div.style.width = '20px'; // 💖 设置宽度
            div.style.height = '20px'; // 💖 设置高度
            div.style.display = 'flex'; // 💖 使用 Flex 布局
            div.style.alignItems = 'center'; // 💖 垂直居中
            div.style.justifyContent = 'center'; // 💖 水平居中
            
            // 🎨 插入图标 SVG
            const iconPath = app.icon || app.iconPath; // 💖 获取图标路径
            if (!iconPath) return; // 💖 如果没有图标则跳过
            div.innerHTML = `<svg style="width:16px; height:16px; fill:${app.color || '#ccc'}" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>`; // 💖 渲染 SVG 图标
            
            // 🖱️ 绑定点击事件
            div.onclick = () => {
                if (wm) wm.toggleApp(id); // 💖 点击切换应用显示状态
            };
            
            container.appendChild(div); // 💖 将图标添加到托盘
        }
    });
}
