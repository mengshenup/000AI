import { store } from '../system/store.js'; // 💖 引入全局状态管理
import { bus } from '../system/event_bus.js'; // 💖 引入事件总线
import { contextMenuApp } from './context_menu.js'; // 💖 引入右键菜单

export const VERSION = '1.0.0'; // 💖 版本号

// =================================
//  🎉 桌面配置对象
//
//  🎨 代码用途：
//     定义桌面服务的元数据，如 ID、名称、类型等。
//
//  💡 易懂解释：
//     这是桌面的“身份证”，告诉系统它是谁，负责管理那些漂亮的图标！📇
//
//  ⚠️ 警告：
//     isSystem: true 标记这是系统级服务，不可被普通用户卸载。
// =================================
export const config = {
    id: 'sys-desktop',
    name: '桌面',
    version: '1.0.0', // 🆕 版本号
    type: 'service',
    isSystem: true,
    description: '系统桌面图标管理器'
};

// =================================
//  🎉 初始化函数 (无参数)
//
//  🎨 代码用途：
//     启动桌面渲染，并监听应用重命名事件以更新图标。
//
//  💡 易懂解释：
//     桌面启动啦！先把图标画出来，然后竖起耳朵听：“有没有应用改名字啦？” 👂
//
//  ⚠️ 警告：
//     依赖 DOM 中 id="desktop" 的元素。
// =================================
export function init() {
    render(); // 💖 初始渲染桌面图标
    
    // 监听应用重命名事件
    bus.on('app:renamed', () => render()); // 💖 当应用改名时，重新渲染图标
    
    // 监听应用加载完成事件
    bus.on('system:apps_loaded', () => render()); // 💖 当所有应用加载完成后，重新渲染图标
}

// =================================
//  🎉 渲染桌面图标 (无参数)
//
//  🎨 代码用途：
//     根据已安装的应用列表，在桌面上动态生成图标元素。
//     实现了自动网格排序功能，防止图标重叠。
//
//  💡 易懂解释：
//     把你的应用一个个摆在桌面上，就像整理书桌一样！📚
//     系统应用和不想显示的应用会被藏起来哦~
//
//  ⚠️ 警告：
//     会清空 #desktop 下所有 .desktop-icon 元素，但保留 drag-overlay。
// =================================
function render() {
    const dt = document.getElementById('desktop'); // 💖 获取桌面容器元素
    if (!dt) return; // 💖 如果找不到桌面容器，直接返回
    
    // 🧹 清除旧的图标元素 (保留 drag-overlay)
    dt.querySelectorAll('.desktop-icon').forEach(e => e.remove()); // 💖 移除所有旧的图标

    // 💖 渲染逻辑升级：优先使用 installedApps (包含所有已安装应用)，如果没有则回退到 store.apps
    const source = Object.keys(store.installedApps).length > 0 ? store.installedApps : store.apps;

    // 📏 网格配置
    const GRID_X = 100; // 💖 网格单元宽度
    const GRID_Y = 100; // 💖 网格单元高度
    const START_X = 20; // 💖 起始 X 坐标
    const START_Y = 20; // 💖 起始 Y 坐标
    const COLS = Math.floor((window.innerWidth - START_X) / GRID_X); // 💖 计算列数
    const ROWS = Math.floor((window.innerHeight - START_Y) / GRID_Y); // 💖 计算行数
    
    const occupied = new Set(); // 💖 记录已占用的网格坐标 "c,r"
    
    // 辅助函数：检查和标记占用
    const isOccupied = (c, r) => occupied.has(`${c},${r}`);
    const markOccupied = (c, r) => occupied.add(`${c},${r}`);
    
    const appsToPlace = []; // 💖 待放置的应用列表

    // 1. 优先处理有保存位置的应用
    Object.entries(source).forEach(([id, app]) => {
        if (app.isSystem) return; // 💖 跳过系统应用
        if (app.showDesktopIcon === false) return; // 💖 跳过不显示的应用
        
        const userState = store.apps[id] || {}; // 💖 获取用户状态
        // 优先使用用户保存的位置，其次是默认配置的位置
        const savedPos = userState.pos || app.pos;
        
        if (savedPos && (savedPos.x !== undefined || savedPos.y !== undefined)) {
             // 计算网格坐标
             let c = Math.round((savedPos.x - START_X) / GRID_X);
             let r = Math.round((savedPos.y - START_Y) / GRID_Y);
             
             // 边界检查
             if (c < 0) c = 0;
             if (r < 0) r = 0;
             
             // 如果位置未被占用，则直接放置
             if (!isOccupied(c, r)) {
                 markOccupied(c, r);
                 appsToPlace.push({ id, app, pos: { x: START_X + c * GRID_X, y: START_Y + r * GRID_Y }, placed: true });
             } else {
                 // 如果被占用了，标记为未放置，稍后自动寻找空位
                 appsToPlace.push({ id, app, placed: false }); 
             }
        } else {
            appsToPlace.push({ id, app, placed: false }); // 💖 没有位置信息的，标记为未放置
        }
    });
    
    // 2. 为未放置的应用寻找空位 (按列优先顺序: 先从上到下，再从左到右)
    appsToPlace.forEach(item => {
        if (item.placed) return; // 💖 已放置的跳过
        
        let found = false;
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                if (!isOccupied(c, r)) {
                    markOccupied(c, r);
                    item.pos = { x: START_X + c * GRID_X, y: START_Y + r * GRID_Y };
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
        
        // 如果屏幕满了，就堆叠在左上角 (或者可以扩展网格)
        if (!found) {
            item.pos = { x: START_X, y: START_Y }; 
        }
    });

    // 3. 渲染图标
    appsToPlace.forEach(item => {
        const { id, app, pos } = item;
        // 💖 修复：增加默认图标路径，防止 pathData 为 undefined 导致 SVG 渲染报错
        const pathData = app.icon || app.iconPath || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';
        
        const el = document.createElement('div'); // 💖 创建图标容器
        el.className = 'desktop-icon'; // 💖 添加 CSS 类名
        el.id = `icon-${id}`; // 💖 设置唯一 ID
        el.style.left = `${pos.x}px`; // 💖 设置水平位置
        el.style.top = `${pos.y}px`; // 💖 设置垂直位置
        el.dataset.id = id; // 💖 存储应用 ID
        el.dataset.type = 'icon'; // 💖 标记类型为图标

        el.innerHTML = `
            <svg class="icon-svg" viewBox="0 0 24 24" fill="${app.color || '#ccc'}">
                <path d="${pathData}"/> <!-- 💖 绘制 SVG 图标路径 -->
            </svg>
            <div class="icon-text">${app.name}</div> <!-- 💖 显示应用名称 -->
        `;
        
        // 🖱️ 绑定右键菜单：固定到任务栏
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            contextMenuApp.show(e.clientX, e.clientY, [
                {
                    label: '打开',
                    icon: '🚀',
                    action: () => window.wm.openApp(id)
                },
                {
                    label: '重命名', // 🏷️ 菜单项文本
                    icon: '✏️', // 🖼️ 菜单项图标
                    action: () => { // ✏️ 点击动作
                        // 获取输入框元素 (需要在 index.html 中预置，或者动态创建)
                        // 这里假设 index.html 中已经有了 id="rename-input"
                        let input = document.getElementById('rename-input'); 
                        if (!input) {
                            // 如果不存在，动态创建一个
                            input = document.createElement('div');
                            input.id = 'rename-input';
                            input.contentEditable = true;
                            input.style.position = 'absolute';
                            input.style.background = 'white';
                            input.style.border = '1px solid #0078d7';
                            input.style.padding = '2px 5px';
                            input.style.zIndex = '9999';
                            input.style.minWidth = '100px';
                            input.style.textAlign = 'center';
                            input.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                            document.body.appendChild(input);
                        }

                        // 获取图标位置
                        const rect = el.getBoundingClientRect(); // 📏 获取图标位置
                        
                        // 设置输入框位置 (覆盖在文字上)
                        input.style.left = `${rect.left + rect.width / 2 - 50}px`; // 📍 水平居中
                        input.style.top = `${rect.bottom - 20}px`; // 📍 垂直位置
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
                                    // 简单的文本替换，保留图标
                                    // winTitle.innerText 会覆盖 SVG，所以需要小心
                                    // 重新生成 innerHTML
                                    const iconPath = app.icon || app.iconPath || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';
                                    winTitle.innerHTML = `
                                        <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor; margin-right:5px; vertical-align:text-bottom;">
                                            <path d="${iconPath}"></path>
                                        </svg>
                                        ${desc ? `${newName}     ${desc}` : newName}
                                    `;
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
                },
                {
                    label: '固定到任务栏',
                    icon: '📌',
                    action: () => {
                        store.updateApp(id, { showTaskbarIcon: true });
                        bus.emit('app:updated', id); // 💖 通知任务栏更新
                        bus.emit('system:speak', "已固定到任务栏");
                    }
                }
            ]);
        });

        dt.appendChild(el); // 💖 将图标添加到桌面
    });
}

