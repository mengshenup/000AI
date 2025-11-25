import { createCapsule } from '../system/capsule_manager.js?v=1'; // 💖 引入胶囊管理器，用于在任务栏显示小组件

export const VERSION = '1.0.0'; // 💖 版本号

// =================================
//  🎉 FPS 监控配置对象
//
//  🎨 代码用途：
//     定义 FPS 监控服务的元数据，如 ID、名称、图标等。
//
//  💡 易懂解释：
//     这是系统的心跳监视器！看看你的电脑是不是跑得气喘吁吁~ 💓
//
//  ⚠️ 警告：
//     showDesktopIcon: false 和 showTaskbarIcon: false 表示它是一个后台服务，只通过胶囊显示。
// =================================
export const config = {
    id: 'svc-fps',
    name: '帧率监控',
    version: '1.0.0', // 🆕 版本号
    description: '实时监控系统渲染帧率',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z', // 💖 SVG 图标路径
    color: '#636e72', // 💖 主题颜色
    system: true, // 💖 标记为系统应用
    type: 'service', // 💖 应用类型为服务
    showDesktopIcon: false, // 💖 不在桌面显示图标
    showTaskbarIcon: false, // 💖 不在任务栏显示图标
    isOpen: true // 默认开启 // 💖 默认自动启动
};

// =================================
//  🎉 初始化 FPS 监控 (无参数)
//
//  🎨 代码用途：
//     创建 FPS 胶囊 DOM，并启动 requestAnimationFrame 循环计算帧率。
//
//  💡 易懂解释：
//     开始数数啦！每秒钟画面闪过多少次？如果太慢了，我会变红警告你哦！🚨
//
//  ⚠️ 警告：
//     使用 requestAnimationFrame 循环，如果页面卡死，FPS 计数也会停止更新。
// =================================
export function init() {
    createCapsule({
        serviceConfig: config, // 💖 传入配置信息
        html: 'FPS: --', // 💖 初始显示内容
        onMount: (el) => { // 💖 当胶囊挂载到 DOM 后执行的回调
            el.style.color = '#666'; // 💖 设置初始文字颜色
            el.style.fontWeight = 'bold'; // 💖 设置字体加粗
            el.style.fontFamily = 'monospace'; // 💖 设置等宽字体，防止数字跳动影响布局

            // FPS 计算逻辑
            let frameCount = 0; // 💖 当前秒内的帧数计数器
            let lastTime = performance.now(); // 💖 上一次计算 FPS 的时间戳
            let fps = 0; // 💖 当前计算出的 FPS 值

            const loop = () => {
                frameCount++; // 💖 每一帧计数加一
                const now = performance.now(); // 💖 获取当前时间
                if (now - lastTime >= 1000) { // 💖 如果距离上次计算超过 1 秒
                    fps = frameCount; // 💖 当前帧数即为 FPS
                    frameCount = 0; // 💖 重置计数器
                    lastTime = now; // 💖 更新上次计算时间
                    el.innerText = `FPS: ${fps}`; // 💖 更新界面显示
                    
                    // 颜色指示
                    if (fps < 30) el.style.color = '#d63031'; // 红色警告 // 💖 低于 30 帧，显示红色
                    else if (fps < 50) el.style.color = '#e17055'; // 橙色注意 // 💖 低于 50 帧，显示橙色
                    else el.style.color = '#00b894'; // 绿色健康 // 💖 50 帧以上，显示绿色
                }
                requestAnimationFrame(loop); // 💖 请求下一帧继续执行 loop
            };
            requestAnimationFrame(loop); // 💖 启动循环
        },
        onClick: () => {
            // FPS 胶囊点击暂时没有功能，或者可以切换显示模式
            console.log('FPS Capsule Clicked'); // 💖 点击时的调试日志
        }
    });
}
