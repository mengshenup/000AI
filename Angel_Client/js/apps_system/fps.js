import { bus } from '../apps_run/event_bus.js';
import { store } from '../apps_run/store.js';

export const config = {
    // =================================
    //  🎉 FPS 监控配置
    //
    //  🎨 代码用途：
    //     定义 FPS 监控服务的元数据
    //
    //  💡 易懂解释：
    //     这是系统的心跳监视器！看看你的电脑是不是跑得气喘吁吁~ 💓
    // =================================
    id: 'svc-fps',
    name: '帧率监控',
    description: '实时监控系统渲染帧率',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    color: '#636e72',
    system: true,
    type: 'service',
    showDesktopIcon: false,
    showTaskbarIcon: false,
    isOpen: true // 默认开启
};

export function init() {
    // =================================
    //  🎉 初始化 FPS 监控
    //
    //  🎨 代码用途：
    //     创建 FPS 胶囊 DOM，并启动 requestAnimationFrame 循环计算帧率。
    // =================================

    // 1. 创建 DOM 元素
    const container = document.getElementById('taskbar-status');
    if (!container) return;

    const el = document.createElement('div');
    el.id = 'fps-display';
    el.className = 'status-capsule';
    el.style.color = '#666';
    el.style.fontWeight = 'bold';
    el.style.fontFamily = 'monospace';
    el.style.display = 'none'; // 默认隐藏，由 isOpen 控制
    el.innerText = 'FPS: --';
    
    // 插入到时钟之前 (时钟通常是最后一个)
    const clock = document.getElementById('clock-time');
    if (clock) {
        container.insertBefore(el, clock);
    } else {
        container.appendChild(el);
    }

    // 2. FPS 计算逻辑
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;

    const loop = () => {
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = now;
            el.innerText = `FPS: ${fps}`;
            
            // 颜色指示
            if (fps < 30) el.style.color = '#d63031'; // 红色警告
            else if (fps < 50) el.style.color = '#e17055'; // 橙色注意
            else el.style.color = '#00b894'; // 绿色健康
        }
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // 3. 状态控制
    const updateVisibility = () => {
        const app = store.getApp(config.id);
        // 如果 store 里还没数据（刚加载），或者 isOpen 为 true，则显示
        // 注意：store.getApp 可能返回 undefined，此时默认为 config.isOpen
        const isOpen = app ? app.isOpen : config.isOpen;
        el.style.display = isOpen ? 'flex' : 'none';
    };

    // 监听开启/关闭事件
    bus.on('app:opened', ({ id }) => {
        if (id === config.id) updateVisibility();
    });
    bus.on('app:closed', ({ id }) => {
        if (id === config.id) updateVisibility();
    });

    // 初始状态检查
    updateVisibility();
}
