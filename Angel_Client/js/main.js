import { bus } from './event_bus.js'; // 🚌 导入事件总线
import { network as net } from './network.js'; // 🌐 导入网络模块
import { wm } from './window_manager.js'; // 🪟 导入窗口管理器
import { store } from './store.js'; // 💾 导入状态存储

// 导入应用模块以确保它们被加载
import './apps/browser.js'; // 🌍 浏览器应用
import './apps/settings.js'; // ⚙️ 设置应用
import './apps/manual.js'; // 📖 说明书应用
import './apps/intelligence.js'; // 🧠 情报应用
import './apps/task_manager.js'; // 📊 任务管理器
import './apps/context_menu.js'; // 🖱️ 右键菜单
import './apps/angel.js'; // 👼 小天使应用
import './apps/traffic.js'; // 📡 流量监控
import './apps/billing.js'; // 💰 账单助手

function setupBusinessLogic() {
    // =================================
    //  🎉 设置业务逻辑 (无参数)
    //
    //  🎨 代码用途：
    //     定义各个模块之间如何协作。主要通过事件总线 (EventBus) 来解耦。
    //     这里集中处理网络消息对 UI 的更新，以及 UI 操作对网络的请求。
    //
    //  💡 易懂解释：
    //     这是制定“作战计划”。比如“收到敌人情报(网络消息)后，大屏幕(UI)要显示出来，小天使要报警”。
    //
    //  ⚠️ 警告：
    //     随着业务变复杂，这个函数可能会变得很长。建议将来按功能拆分。
    // =================================

    // === 监听网络事件 -> 更新 UI ===

    // 监听网络统计数据更新 (上传/下载速度, 费用)
    bus.on('net:stats', (stats) => {
        // 辅助函数：安全更新 DOM 文本
        const update = (id, val) => { 
            // 尝试在多个可能的地方更新，因为现在有独立的APP窗口
            const els = document.querySelectorAll(`#${id}`);
            els.forEach(el => el.innerText = val);
        }; 
        
        // 更新任务栏胶囊数据
        update('bar-tx', stats.net.up);
        update('bar-rx', stats.net.down);
        update('bar-total', stats.grand_total);

        // 更新详情窗口数据
        update('tx-stat', stats.net.up);    // ⬆️ 更新上传速度
        update('rx-stat', stats.net.down);  // ⬇️ 更新下载速度
        update('ai-cost', stats.grand_total); // 💰 更新总费用
        update('pop-net', stats.net.cost);    // 💸 更新弹窗里的流量费
        update('pop-total', stats.grand_total); // 💵 更新弹窗里的总费用

        // 更新账单详情列表 (支持多个实例)
        const mbs = document.querySelectorAll('#pop-models'); // 🧾 账单详情容器
        mbs.forEach(mb => {
            if (stats.ai.details.length) {
                // 将详情数组转换为 HTML 字符串并插入
                mb.innerHTML = stats.ai.details.map(t => `<div class="bill-row bill-sub"><span>${t.split(': ')[0]}</span><span>${t.split(': ')[1]}</span></div>`).join(''); // 📝 生成账单HTML
            }
        });
    });

    // 监听实时画面帧更新
    bus.on('net:frame', (imgSrc) => {
        const el = document.getElementById('live-image'); // 📺 实时画面元素
        if (el) {
            el.src = imgSrc; // 🖼️ 更新图片源
            el.style.display = 'block'; // 👁️ 确保图片显示
        }
    });

    // 监听收到新情报 (转发给 IntelligenceApp，这里只做中转)
    bus.on('net:new_intel', (data) => {
        bus.emit('net:new_intel', data); // 📡 重新分发给 IntelligenceApp 监听
    });

    // 监听收到分析结果
    bus.on('net:analysis_result', (data) => {
        bus.emit('net:analysis_result', data); // 📤 转发分析结果
    });

    // === 监听 UI 命令 -> 发送网络请求 ===
    // (原本的 cmd:scan 和 cmd:remote_click 已移动到 browser.js)
}

window.onload = () => {
    // =================================
    //  🎉 窗口加载完成回调 (无参数)
    //
    //  🎨 代码用途：
    //     当网页所有资源加载完毕后执行。
    //
    //  💡 易懂解释：
    //     等舞台都搭好了，演员都化好妆了，再拉开大幕。
    //
    //  ⚠️ 警告：
    //     如果 JS 报错，可能会导致这里的初始化代码中断执行，整个页面瘫痪。
    // =================================

    // 初始化各个模块
    // angel.init(); // 移除：小天使现在作为应用由 WindowManager 初始化

    // 注入应用元数据 (解耦名称和配置)
    // 使用 Promise.all 确保所有元数据都加载完成后，再初始化窗口管理器
    Promise.all([
        import('./apps/manual.js').then(m => ({id: 'win-manual', config: m.config})),
        import('./apps/browser.js').then(m => ({id: 'win-angel', config: m.config})),
        import('./apps/intelligence.js').then(m => ({id: 'win-intel', config: m.config})),
        import('./apps/settings.js').then(m => ({id: 'win-settings', config: m.config})),
        import('./apps/task_manager.js').then(m => ({id: 'win-taskmgr', config: m.config})),
        import('./apps/angel.js').then(m => ({id: 'win-companion', config: m.config})),
        import('./apps/traffic.js').then(m => ({id: 'win-traffic', config: m.config})),
        import('./apps/billing.js').then(m => ({id: 'win-billing', config: m.config}))
    ]).then((modules) => {
        console.log("应用元数据注入完成，启动窗口管理器..."); // 📝 日志记录
        
        // 1. 收集所有配置
        const metadataMap = {};
        modules.forEach(({id, config}) => {
            metadataMap[id] = config;
        });

        // 2. 执行动态版本检查 (在注入之前)
        store.checkVersion(metadataMap);

        // 3. 注入元数据
        modules.forEach(({id, config}) => {
            store.setAppMetadata(id, config);
        });

        // 4. 清理僵尸数据
        store.prune(modules.map(m => m.id));

        wm.init();    // 🚀 启动窗口管理器 (此时 store 中已经有了名字)
        setupBusinessLogic(); // 🔗 绑定业务逻辑
        net.connect(); // 🔌 连接服务器

        // 🌟 启动系统级应用 (优先加载)
        // 这些应用默认应该在后台或前台运行
        const SYSTEM_APPS = ['win-companion']; // 💖 移除 traffic 和 billing，因为它们现在默认关闭，点击才显示
        SYSTEM_APPS.forEach(id => {
            // 如果没有打开，则强制打开
            // 注意：openApp 会检查是否已存在，不会重复创建
            // 传递 false 表示不播放语音，避免启动时太吵
            if (!store.apps[id]?.isOpen) {
                wm.openApp(id, false);
            }
        });

    }).catch(err => {
        console.error("应用元数据加载失败:", err); // ❌ 错误日志
        // 即使失败也尝试启动，避免完全白屏
        wm.init(); // ⚠️ 强制启动窗口管理器
        setupBusinessLogic(); // ⚠️ 强制绑定逻辑
        net.connect(); // ⚠️ 强制连接网络
    });

    // 启动时钟逻辑 (每秒更新一次)
    setInterval(() => {
        const clock = document.getElementById('clock-time'); // ⏰ 时钟元素
        // 获取当前时间并格式化为 HH:MM
        if (clock) clock.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // 🕒 更新时间显示
    }, 1000);

    // === 特定 UI 绑定 (非通用部分) ===

    // 绑定任务栏胶囊点击事件 -> 打开详情窗口
    document.getElementById('bar-traffic')?.addEventListener('click', () => {
        // 切换显示/隐藏
        const id = 'win-traffic';
        const app = store.getApp(id);
        if (app && app.isOpen) {
            wm.closeApp(id);
        } else {
            wm.openApp(id, false);
        }
    });

    document.getElementById('bar-billing')?.addEventListener('click', () => {
        const id = 'win-billing';
        const app = store.getApp(id);
        if (app && app.isOpen) {
            wm.closeApp(id);
        } else {
            wm.openApp(id, false);
        }
    });

    // 绑定扫描按钮点击事件 (保留在这里，因为它可能属于全局工具栏，或者也可以移到 browser.js，但目前先保留)
    // 实际上 browser.js 已经监听了 cmd:scan，这里只是触发事件
    document.getElementById('btn-scan')?.addEventListener('click', () => bus.emit('cmd:scan')); // 🔍 绑定扫描按钮

    // (浏览器控制、视频进度条、远程点击逻辑已移动到 apps/browser.js)

    // === 小天使特殊拖拽绑定 ===
    // 移除：小天使现在是标准窗口，自动拥有拖拽功能
    // const angelEl = document.getElementById('angel-companion');
    // if (angelEl) {
    //     angelEl.addEventListener('mousedown', (e) => {
    //         if (e.button === 0) wm.startDrag(e, angelEl, 'window'); // 复用 window 拖拽逻辑
    //     });
    // }

    // (自定义壁纸按钮逻辑已移动到 apps/settings.js)
};