import { createCapsule } from '../system/capsule_manager.js?v=1';

export const VERSION = '1.0.0'; // 💖 版本号

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
    version: '1.0.0', // 🆕 版本号
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

    createCapsule({
        serviceConfig: config,
        html: 'FPS: --',
        onMount: (el) => {
            el.style.color = '#666';
            el.style.fontWeight = 'bold';
            el.style.fontFamily = 'monospace';

            // FPS 计算逻辑
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
        },
        onClick: () => {
            // FPS 胶囊点击暂时没有功能，或者可以切换显示模式
            console.log('FPS Capsule Clicked');
        }
    });
}
