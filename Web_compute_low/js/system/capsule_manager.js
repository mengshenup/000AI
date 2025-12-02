import { bus } from './event_bus.js'; // 💖 引入事件总线
import { store } from './store.js'; // 💖 引入全局状态管理

// =================================
//  🎉 胶囊管理器 (Capsule Manager)
//
//  🎨 代码用途：
//     提供系统胶囊应用（如流量、计费、FPS）的通用逻辑封装。
//     处理 DOM 创建、状态监听、详情窗口联动以及拖拽交互。
//
//  💡 易懂解释：
//     这是胶囊们的“模具”！不管你是装流量的胶囊，还是装金币的胶囊，
//     只要用这个模具压一下，就能自动拥有开关、点击弹窗、甚至被拖来拖去的超能力！💊
//
//  ⚠️ 警告：
//     请确保传入的配置对象包含正确的 id 和 type。
// =================================

/**
 * 启用元素的拖拽功能 (水平方向)
 * @param {HTMLElement} capsule - 需要启用拖拽的 DOM 元素
 * @param {number} initialOffset - 初始偏移量
 */
function enableDrag(capsule, initialOffset = 0) {
    // =================================
    //  🎉 启用拖拽 (Enable Drag) (capsule)
    //
    //  🎨 代码用途：
    //     为指定的 DOM 元素添加水平方向的拖拽交互能力。
    //
    //  💡 易懂解释：
    //     给这个小胶囊装上轮子！按住它，就能左右滑来滑去啦！🚗
    //
    //  ⚠️ 警告：
    //     目前仅支持水平拖拽 (translateX)。拖拽结束后会自动回弹归位。
    // =================================
    let isDragging = false; // 🖱️ 标记当前是否正在拖拽中
    let startX = 0; // 🏁 记录鼠标按下时的初始 X 坐标
    let currentX = initialOffset; // 📍 记录当前拖拽的实时 X 偏移量 (初始化为已有的偏移)

    capsule.style.cursor = 'grab'; // 👆 设置鼠标样式为“抓取手势”
    capsule.style.position = 'relative'; // 🧩 设置定位方式，确保 transform 生效
    capsule.style.transition = 'transform 0.1s'; // 🌊 设置平滑过渡，让移动更自然

    capsule.addEventListener('mousedown', (e) => { // 👂 监听鼠标按下事件
        isDragging = true; // ✅ 激活拖拽状态
        // 💖 修复：startX 应该是当前鼠标位置减去当前的偏移量
        // 这样 currentX = e.clientX - startX 就会等于 (e.clientX - (e.clientX - currentX)) = currentX
        startX = e.clientX - currentX; 
        capsule.style.cursor = 'grabbing'; // ✊ 鼠标变成“紧抓手势”
        capsule.style.transition = 'none'; // ⚡ 移除过渡，防止拖拽时的延迟感
        e.preventDefault(); // 🚫 阻止默认行为（如选中文本）
        e.stopPropagation(); // 🛑 阻止事件冒泡
    });

    document.addEventListener('mousemove', (e) => { // 👂 监听全局鼠标移动事件
        if (!isDragging) return; // 🛑 如果没在拖拽，直接忽略
        currentX = e.clientX - startX; // 📏 计算当前的水平位移量
        capsule.style.transform = `translateX(${currentX}px)`; // 🚀 应用位移，移动元素
    });

    document.addEventListener('mouseup', () => { // 👂 监听全局鼠标松开事件
        if (isDragging) { // 🔄 如果之前在拖拽中
            isDragging = false; // ❌ 结束拖拽状态
            capsule.style.cursor = 'grab'; // 👆 恢复鼠标为“抓取手势”
            capsule.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // 🏀 添加弹性回弹动画
            
            // 💖 修复：拖拽结束后保存位置，而不是恢复原位
            // capsule.style.transform = 'translateX(0px)'; // 🏠 让胶囊乖乖回到原位 (已移除)
            
            // 💾 保存位置到 Store (需要 store.js 支持 updateApp)
            // 注意：这里我们保存的是视觉偏移量，下次加载时需要恢复
            // 获取应用 ID (从 capsule-ID 中提取)
            const appId = capsule.id.replace('capsule-', '');
            console.log(`[Capsule] 拖拽结束，保存位置: ${appId} -> ${currentX}px`); // 💖 添加调试日志
            import('./store.js').then(({ store }) => {
                store.updateApp(appId, { capsuleOffsetX: currentX });
            });
        }
    });
}

/**
 * 创建并注册一个系统胶囊
 * @param {Object} options - 配置选项
 * @param {Object} options.serviceConfig - 服务配置 (必须，包含 id, name, description, isOpen)
 * @param {Object} [options.detailConfig] - 详情窗口配置 (可选)
 * @param {string} [options.html] - 胶囊内部 HTML (可选)
 * @param {Function} [options.onMount] - DOM 创建后的回调 (可选，用于绑定特定逻辑)
 * @param {Function} [options.onClick] - 点击回调 (可选，默认行为是打开详情窗口)
 * @returns {HTMLElement} 创建的胶囊 DOM 元素
 */
export function createCapsule(options) {
    // =================================
    //  🎉 创建胶囊 (Create Capsule) (options)
    //
    //  🎨 代码用途：
    //     根据配置动态生成胶囊 DOM，并绑定点击、拖拽及状态同步逻辑。
    //
    //  💡 易懂解释：
    //     这是胶囊工厂的流水线！把图纸（options）扔进去，
    //     它就给你造出一个功能齐全、能点能拖的漂亮胶囊！🏭
    //
    //  ⚠️ 警告：
    //     依赖全局 store 和 bus。如果 taskbar-status 容器不存在，会创建失败。
    // =================================
    const {
        serviceConfig, // ⚙️ 服务的基础配置（ID、名称等）
        detailConfig, // 🪟 关联的详情窗口配置（可选）
        html, // 🎨 胶囊内部的 HTML 结构
        onMount, // 🔌 挂载完成后的回调函数
        onClick // 🖱️ 自定义点击事件处理函数
    } = options; // 📦 解构配置对象

    // 1. 注册详情窗口 (如果有)
    if (detailConfig) { // 🔍 如果有详情窗口配置
        store.setAppMetadata(detailConfig.id, detailConfig); // 📝 在 Store 中注册这个应用
    }

    // 2. 动态创建胶囊 DOM
    const container = document.getElementById('taskbar-status'); // 🏠 获取任务栏状态区域容器
    if (!container) { // 🛑 如果容器找不到
        console.warn('CapsuleManager: 找不到 #taskbar-status 容器'); // ⚠️ 打印警告日志
        return; // ❌ 终止执行
    }

    const el = document.createElement('div'); // 🧱 创建胶囊的外层 DIV
    el.id = `capsule-${serviceConfig.id}`; // 🏷️ 设置唯一的 DOM ID
    el.className = 'status-capsule'; // 🎨 应用胶囊的 CSS 类名
    el.title = serviceConfig.description || serviceConfig.name; // 💬 设置鼠标悬停提示
    
    // 初始可见性
    const appState = store.getApp(serviceConfig.id); // 📊 获取应用当前的存储状态
    const isOpen = appState ? appState.isOpen : serviceConfig.isOpen; // 👁️ 判断是否应该显示
    el.style.display = isOpen ? 'flex' : 'none'; // 🎭 设置显示或隐藏

    // 💖 恢复保存的位置偏移
    if (appState && appState.capsuleOffsetX) {
        el.style.transform = `translateX(${appState.capsuleOffsetX}px)`;
    }

    // 填充内容
    if (html) el.innerHTML = html; // 📝 填充胶囊内部的 HTML

    // 插入 DOM (默认插入到托盘图标之前，如果没有托盘则插入到时钟之前)
    const tray = document.getElementById('tray-icons'); // 💖 获取托盘容器
    const clock = document.getElementById('clock-time'); // ⏰ 获取时钟元素
    const ref = tray || clock; // 💖 确定插入参考点 (优先插在托盘前)
    
    if (ref) container.insertBefore(el, ref); // 👈 插入到参考点之前
    else container.appendChild(el); // 👉 否则直接追加到末尾

    // 3. 启用拖拽
    // 💖 修复：从 inline style 中解析初始偏移量，防止拖拽跳变
    const match = el.style.transform.match(/translateX\(([-0-9.]+)px\)/);
    const initialOffset = match ? parseFloat(match[1]) : 0;
    enableDrag(el, initialOffset); // 🚗 赋予胶囊拖拽能力

    // 4. 绑定点击事件
    el.addEventListener('click', (e) => { // 👂 监听点击事件
        // 如果提供了自定义点击回调，优先执行
        if (typeof onClick === 'function') { // ⚡ 如果有自定义回调
            onClick(e, el); // 🚀 执行自定义回调
            return; // 🛑 阻止默认行为
        }

        // 默认行为：切换详情窗口
        if (detailConfig) { // 🪟 如果有关联的详情窗口
            const wm = window.wm; // 🖥️ 获取全局窗口管理器
            if (!wm) return; // 🛑 如果窗口管理器未就绪，直接返回

            const appId = detailConfig.id; // 🆔 获取应用 ID
            const app = store.getApp(appId); // 📊 获取应用状态

            if (app && app.isOpen) { // 🔄 如果窗口已经打开
                wm.closeApp(appId); // ❌ 关闭窗口
            } else { // 🔄 如果窗口未打开
                wm.openApp(appId, false); // ✅ 打开窗口
                // 智能定位：在胶囊上方居中显示
                setTimeout(() => { // ⏳ 延迟执行，确保 DOM 已渲染
                    const win = document.getElementById(appId); // 🪟 获取窗口 DOM
                    if (win) { // ✅ 如果窗口存在
                        const cRect = el.getBoundingClientRect(); // 📏 获取胶囊的位置尺寸
                        const winWidth = detailConfig.width || 200; // 📏 获取窗口宽度
                        const winHeight = detailConfig.height || 200; // 📏 获取窗口高度
                        
                        // 计算位置 (居中对齐)
                        let left = cRect.left + (cRect.width / 2) - (winWidth / 2); // 🧮 计算水平居中位置
                        let top = cRect.top - winHeight - 10; // 🧮 计算垂直位置（上方留空）

                        // 简单的边界检查
                        if (left < 0) left = 10; // 🚧 防止超出左边界
                        if (top < 0) top = 10; // 🚧 防止超出上边界

                        win.style.left = `${left}px`; // 📍 应用 Left 坐标
                        win.style.top = `${top}px`; // 📍 应用 Top 坐标
                        
                        // 💖 强制置顶
                        wm.bringToFront(appId);
                    }
                }, 0); // ⚡ 立即执行
            }
        }
    });

    // 5. 监听服务状态 (显示/隐藏胶囊)
    const updateVisibility = (id, isOpen) => { // 🔄 定义可见性更新函数
        if (id === serviceConfig.id) { // 🎯 如果是当前胶囊的服务
            el.style.display = isOpen ? 'flex' : 'none'; // 🎭 更新显示状态
            
            // 如果服务关闭，且有关联的详情窗口，也一并关闭
            if (!isOpen && detailConfig) { // 🔒 如果服务关闭且有窗口
                const wm = window.wm; // 🖥️ 获取窗口管理器
                if (wm) wm.closeApp(detailConfig.id); // ❌ 关闭关联窗口
            }
        }
    };

    bus.on('app:opened', (data) => updateVisibility(data.id, true)); // 👂 监听应用打开事件
    bus.on('app:closed', (data) => updateVisibility(data.id, false)); // 👂 监听应用关闭事件

    // 6. 执行挂载回调 (用于启动定时器、绑定特定事件等)
    if (typeof onMount === 'function') { // 🔌 如果有挂载回调
        onMount(el); // 🚀 执行挂载回调
    }

    return el; // 🎁 返回创建好的胶囊元素
}

export const VERSION = '1.0.0'; // 💖 系统核心模块版本号
