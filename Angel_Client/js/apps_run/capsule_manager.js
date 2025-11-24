import { bus } from './event_bus.js';
import { store } from './store.js';

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
 */
function enableDrag(capsule) {
    let isDragging = false;
    let startX = 0;
    let currentX = 0;

    capsule.style.cursor = 'grab';
    capsule.style.position = 'relative'; // 确保可以移动
    capsule.style.transition = 'transform 0.1s'; // 平滑移动

    capsule.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - currentX;
        capsule.style.cursor = 'grabbing';
        capsule.style.transition = 'none'; // 拖拽时移除过渡，防止延迟
        e.preventDefault(); // 防止选中文本
        e.stopPropagation(); // 防止冒泡
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        capsule.style.transform = `translateX(${currentX}px)`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            capsule.style.cursor = 'grab';
            capsule.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // 释放时添加回弹效果
            // 💖 修复：拖拽结束后恢复原位，或者保存位置？目前逻辑是恢复原位（因为没有保存逻辑）
            capsule.style.transform = 'translateX(0px)'; 
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
    const {
        serviceConfig,
        detailConfig,
        html,
        onMount,
        onClick
    } = options;

    // 1. 注册详情窗口 (如果有)
    if (detailConfig) {
        store.setAppMetadata(detailConfig.id, detailConfig);
    }

    // 2. 动态创建胶囊 DOM
    const container = document.getElementById('taskbar-status');
    if (!container) {
        console.warn('CapsuleManager: 找不到 #taskbar-status 容器');
        return;
    }

    const el = document.createElement('div');
    el.id = `capsule-${serviceConfig.id}`; // 生成唯一 DOM ID
    el.className = 'status-capsule';
    el.title = serviceConfig.description || serviceConfig.name;
    
    // 初始可见性
    const appState = store.getApp(serviceConfig.id);
    const isOpen = appState ? appState.isOpen : serviceConfig.isOpen;
    el.style.display = isOpen ? 'flex' : 'none';

    // 填充内容
    if (html) el.innerHTML = html;

    // 插入 DOM (默认插入到时钟之前)
    const clock = document.getElementById('clock-time');
    if (clock) container.insertBefore(el, clock);
    else container.appendChild(el);

    // 3. 启用拖拽
    enableDrag(el);

    // 4. 绑定点击事件
    el.addEventListener('click', (e) => {
        // 如果提供了自定义点击回调，优先执行
        if (typeof onClick === 'function') {
            onClick(e, el);
            return;
        }

        // 默认行为：切换详情窗口
        if (detailConfig) {
            const wm = window.wm;
            if (!wm) return;

            const appId = detailConfig.id;
            const app = store.getApp(appId);

            if (app && app.isOpen) {
                wm.closeApp(appId);
            } else {
                wm.openApp(appId, false);
                // 智能定位：在胶囊上方居中显示
                setTimeout(() => {
                    const win = document.getElementById(appId);
                    if (win) {
                        const cRect = el.getBoundingClientRect();
                        const winWidth = detailConfig.width || 200;
                        const winHeight = detailConfig.height || 200;
                        
                        // 计算位置 (居中对齐)
                        let left = cRect.left + (cRect.width / 2) - (winWidth / 2);
                        let top = cRect.top - winHeight - 10; // 上方留 10px 间隙

                        // 简单的边界检查
                        if (left < 0) left = 10;
                        if (top < 0) top = 10; // 理论上不会发生，因为任务栏在底部

                        win.style.left = `${left}px`;
                        win.style.top = `${top}px`;
                    }
                }, 0);
            }
        }
    });

    // 5. 监听服务状态 (显示/隐藏胶囊)
    const updateVisibility = (id, isOpen) => {
        if (id === serviceConfig.id) {
            el.style.display = isOpen ? 'flex' : 'none';
            
            // 如果服务关闭，且有关联的详情窗口，也一并关闭
            if (!isOpen && detailConfig) {
                const wm = window.wm;
                if (wm) wm.closeApp(detailConfig.id);
            }
        }
    };

    bus.on('app:opened', (data) => updateVisibility(data.id, true));
    bus.on('app:closed', (data) => updateVisibility(data.id, false));

    // 6. 执行挂载回调 (用于启动定时器、绑定特定事件等)
    if (typeof onMount === 'function') {
        onMount(el);
    }

    return el;
}
