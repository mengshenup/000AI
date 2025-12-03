/* ==========================================================================
   📃 文件功能 : 流量监控服务 (Traffic Monitor Service)
   ⚡ 逻辑摘要 : 实时监控网络上传/下载速度，通过任务栏胶囊展示，并提供可视化的详情窗口。
   💡 易懂解释 : 这是网络世界的看门大爷！谁进来了，谁出去了，带了多少东西，他都记得清清楚楚！👀
   🔋 未来扩展 : 支持历史流量统计，区分不同应用的流量消耗。
   📊 当前状态 : 活跃 (更新: 2025-12-03)
   🧱 traffic.js 踩坑记录 (累积，勿覆盖) :
      1. [2025-12-03] [已修复] [配置丢失]: 动态注册的子窗口 (win-traffic) 被 loader.js 的 prune 逻辑误删 -> 在 config 中添加 relatedApps 字段并在 loader 中豁免 (Line 75)
   ========================================================================== */

import { createCapsule } from '../system/capsule_manager.js?v=1'; // 💖 引入胶囊管理器
import { bus } from '../system/event_bus.js'; // 💖 引入事件总线
import { store } from '../system/store.js'; // 💖 引入全局状态管理

export const VERSION = '1.0.0'; // 💖 版本号

// =================================
//  🎉 详情窗口配置对象
//
//  🎨 代码用途：
//     定义点击流量胶囊后弹出的详情窗口的配置，包括 UI 结构和样式。
//
//  💡 易懂解释：
//     这是流量胶囊的“放大镜”！点一下，就能看到更详细的数据跳动哦~ 🔍
//
//  ⚠️ 警告：
//     frameless: true 表示无边框窗口，需要自定义关闭逻辑（如果需要的话）。
// =================================
const detailConfig = {
    id: 'win-traffic', // 💖 窗口 ID
    name: '脉动监测', // 💖 窗口名称
    version: '1.0.0', // 🆕 版本号
    description: '感受数据的每一次跳动', // 💖 描述
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', // 💖 SVG 图标路径
    color: '#00cec9', // 💖 主题颜色
    system: true, // 💖 系统级应用
    showDesktopIcon: false, // 💖 不显示桌面图标
    showTaskbarIcon: false, // 💖 不显示任务栏图标
    skipTaskbar: true, // 💖 即使运行中也不显示在任务栏
    showTrayIcon: false, // 💖 不显示在系统托盘
    frameless: true, // 💖 无边框模式
    fixed: false, // 💖 不固定位置
    width: 200, // 💖 窗口宽度
    height: 120, // 💖 窗口高度
    pos: { x: 0, y: 0 }, // 💖 初始位置
    isOpen: false, // 💖 默认关闭
    openMsg: "", // 💖 打开时的提示消息
    content: `
        <div style="padding: 15px; background: rgba(30, 39, 46, 0.95); color: #fff; border-radius: 8px; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-size: 12px; color: #00cec9; margin-bottom: 5px; font-weight: bold;">网络脉动监测 (NETWORK)</div> <!-- 💖 标题 -->
            
            <!-- 实时速率 -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="color: #aaa; font-size: 11px;">实时上传</span>
                <span id="tx-stat" style="color: #74b9ff; font-family: monospace;">0 KB/s</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="color: #aaa; font-size: 11px;">实时下载</span>
                <span id="rx-stat" style="color: #55efc4; font-family: monospace;">0 KB/s</span>
            </div>

            <!-- 总流量 -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="color: #aaa; font-size: 11px;">总发送量</span>
                <span id="total-tx" style="color: #fff; font-family: monospace;">0 MB</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="color: #aaa; font-size: 11px;">总接收量</span>
                <span id="total-rx" style="color: #fff; font-family: monospace;">0 MB</span>
            </div>

            <!-- 会话信息 -->
            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; display: flex; justify-content: space-between;">
                <div style="text-align: center;">
                    <div style="color: #aaa; font-size: 10px;">会话时长</div>
                    <div id="session-duration" style="color: #fab1a0; font-family: monospace;">00:00:00</div>
                </div>
                <div style="text-align: center;">
                    <div style="color: #aaa; font-size: 10px;">预估成本</div>
                    <div id="session-cost" style="color: #ffeaa7; font-family: monospace;">$0.0000</div>
                </div>
            </div>

            <div style="margin-top: 10px; height: 2px; background: #333; border-radius: 1px; overflow: hidden;">
                <div style="width: 50%; height: 100%; background: #00cec9; animation: pulse 2s infinite;"></div> <!-- 💖 装饰性动画条 -->
            </div>
        </div>
    `,
    contentStyle: 'background: transparent; padding: 0; box-shadow: none; border: none;' // 💖 自定义内容样式
};

// =================================
//  🎉 流量监控服务配置
//
//  🎨 代码用途：
//     定义流量监控服务的元数据，控制任务栏胶囊的显示。
//
//  💡 易懂解释：
//     这是任务栏上的小哨兵，时刻盯着网络大门，看有多少数据进进出出！👀
//
//  ⚠️ 警告：
//     type: 'service' 表示它主要在后台运行，通过胶囊展示信息。
// =================================
export const config = {
    id: 'svc-traffic',
    name: '流量胶囊',
    description: '任务栏流量监控服务',
    icon: detailConfig.icon, // 💖 复用详情窗口的图标
    color: detailConfig.color, // 💖 复用详情窗口的颜色
    system: true, // 💖 系统级应用
    type: 'service', // 💖 标记为服务类型，不创建窗口
    showDesktopIcon: false, // 💖 不显示桌面图标
    showTaskbarIcon: false, // 💖 不显示任务栏图标
    isOpen: true, // 默认开启服务 // 💖 默认自动启动
    relatedApps: ['win-traffic'] // 💖 关联的子应用 ID (防止被 prune 误删)
};

// =================================
//  🎉 初始化函数 (无参数)
//
//  🎨 代码用途：
//     创建流量胶囊，监听网络统计事件并更新 UI，处理详情窗口的定位。
//
//  💡 易懂解释：
//     哨兵就位！开始汇报数据：“报告长官，现在下载速度是 10MB/s！” 🫡
//     如果你想看更详细的报告，它会把小本本（详情窗口）递到你手边。
//
//  ⚠️ 警告：
//     依赖 bus.on('net:stats') 事件来获取数据。
// =================================
export function init() {
    createCapsule({
        serviceConfig: config, // 💖 传入服务配置
        detailConfig: detailConfig, // 💖 传入详情窗口配置
        html: `
            <span style="color: #aaa;">▲</span> <!-- 💖 上传图标 -->
            <span id="bar-tx">0B</span> <!-- 💖 上传速度显示 -->
            <span style="width: 1px; height: 10px; background: rgba(0,0,0,0.2); margin: 0 5px;"></span> <!-- 💖 分隔线 -->
            <span style="color: #aaa;">▼</span> <!-- 💖 下载图标 -->
            <span id="bar-rx">0B</span> <!-- 💖 下载速度显示 -->
        `
        // 不需要 onMount，因为 traffic 的数据更新逻辑在 loader.js 或 network.js 中通过 id 查找 DOM
        // 只要 ID 匹配 (bar-tx, bar-rx)，现有的更新逻辑就能工作
    });

    // 监听窗口打开事件，自动定位到胶囊上方
    bus.on('app:opened', ({ id }) => {
        if (id === detailConfig.id) { // 💖 如果打开的是流量详情窗口
            setTimeout(() => {
                const win = document.getElementById(detailConfig.id); // 💖 获取窗口元素
                const capsule = document.getElementById('bar-traffic'); // 💖 获取胶囊元素
                if (win && capsule) { // 💖 如果两者都存在
                    const cRect = capsule.getBoundingClientRect(); // 💖 获取胶囊位置
                    const wRect = win.getBoundingClientRect(); // 💖 获取窗口位置
                    let left = cRect.left + (cRect.width / 2) - (wRect.width / 2); // 💖 计算水平居中位置
                    let top = cRect.top - wRect.height - 10; // 💖 计算垂直位置（在胶囊上方）
                    
                    // 边界检查
                    if (left + wRect.width > window.innerWidth) left = window.innerWidth - wRect.width - 10; // 💖 防止右侧溢出
                    if (left < 10) left = 10; // 💖 防止左侧溢出
                    if (top < 10) top = 10; // 💖 防止顶部溢出

                    win.style.left = `${left}px`; // 💖 应用水平位置
                    win.style.top = `${top}px`; // 💖 应用垂直位置
                    store.updateApp(id, { winPos: { x: left, y: top } }); // 💖 更新状态中的位置信息
                }
            }, 0);
        }
    });
    // 监听网络统计数据更新 (上传/下载速度)
    let lastStatsUpdate = 0; // 💖 上次更新时间戳
    bus.on('net:stats', (stats) => { // 💖 监听网络统计事件
        const now = Date.now(); // 💖 获取当前时间
        if (now - lastStatsUpdate < 500) return; // 500ms 节流 // 💖 限制更新频率，避免过于频繁
        lastStatsUpdate = now; // 💖 更新时间戳

        // 🛡️ 安全检查：确保数据结构完整
        if (!stats || !stats.net) return;

        // 辅助函数：安全更新 DOM 文本
        const update = (id, val) => { 
            const els = document.querySelectorAll(`#${id}`); // 💖 查找所有匹配 ID 的元素（可能有多个地方显示）
            els.forEach(el => el.innerText = val); // 💖 更新文本内容
        }; 
        
        // 更新任务栏胶囊数据
        update('bar-tx', stats.net.up); // 💖 更新胶囊上传速度
        update('bar-rx', stats.net.down); // 💖 更新胶囊下载速度

        // 更新详情窗口数据
        update('tx-stat', stats.net.up);    // ⬆️ 更新上传速度 // 💖 更新详情窗口上传速度
        update('rx-stat', stats.net.down);  // ⬇️ 更新下载速度 // 💖 更新详情窗口下载速度
        
        // 新增字段更新
        if (stats.net.total_tx) update('total-tx', stats.net.total_tx);
        if (stats.net.total_rx) update('total-rx', stats.net.total_rx);
        if (stats.session && stats.session.duration) update('session-duration', stats.session.duration);
        if (stats.session && stats.session.cost) update('session-cost', stats.session.cost);
    });

    // 监听服务开启/关闭事件，控制胶囊显示
    const updateVisibility = () => {
        const app = store.getApp(config.id); // 💖 获取应用状态
        const isOpen = app ? app.isOpen : config.isOpen; // 💖 判断是否开启
        const el = document.getElementById('bar-traffic'); // 💖 获取胶囊元素
        if (el) el.style.display = isOpen ? 'flex' : 'none'; // 💖 控制显示/隐藏
    };

    bus.on('app:opened', ({ id }) => {
        if (id === config.id) updateVisibility(); // 💖 如果是流量服务被打开，更新可见性
    });

    bus.on('app:closed', ({ id }) => {
        if (id === config.id) updateVisibility(); // 💖 如果是流量服务被关闭，更新可见性
    });
    
    // 初始状态
    updateVisibility(); // 💖 初始化可见性
}
