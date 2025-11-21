
function setupBusinessLogic() {
    // ---------------------------------------------------------------- //
    //  设置业务逻辑()
    //
    //  函数用处：
    //     定义各个模块之间如何协作。主要通过事件总线 (EventBus) 来解耦。
    //     这里集中处理网络消息对 UI 的更新，以及 UI 操作对网络的请求。
    //
    //  易懂解释：
    //     这是制定“作战计划”。比如“收到敌人情报(网络消息)后，大屏幕(UI)要显示出来，小天使要报警”。
    //
    //  警告：
    //     随着业务变复杂，这个函数可能会变得很长。建议将来按功能拆分。
    // ---------------------------------------------------------------- //

    // === 监听网络事件 -> 更新 UI ===

    // 监听网络统计数据更新 (上传/下载速度, 费用)
    bus.on('net:stats', (stats) => {
        // 辅助函数：安全更新 DOM 文本
        const update = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        update('tx-stat', stats.net.up);    // 更新上传速度
        update('rx-stat', stats.net.down);  // 更新下载速度
        update('ai-cost', stats.grand_total); // 更新总费用
        update('pop-net', stats.net.cost);    // 更新弹窗里的流量费
        update('pop-total', stats.grand_total); // 更新弹窗里的总费用

        // 更新账单详情列表
        const mb = document.getElementById('pop-models');
        if (mb && stats.ai.details.length) {
            // 将详情数组转换为 HTML 字符串并插入
            mb.innerHTML = stats.ai.details.map(t => `<div class="bill-row bill-sub"><span>${t.split(': ')[0]}</span><span>${t.split(': ')[1]}</span></div>`).join('');
        }
    });

    // 监听实时画面帧更新
    bus.on('net:frame', (imgSrc) => {
        const el = document.getElementById('live-image');
        if (el) {
            el.src = imgSrc; // 更新图片源
            el.style.display = 'block'; // 确保图片显示
        }
    });

    // 监听收到新情报 (转发给 IntelligenceApp，这里只做中转)
    bus.on('net:new_intel', (data) => {
        bus.emit('net:new_intel', data); // 重新分发给 IntelligenceApp 监听
    });

    // 监听收到分析结果
    bus.on('net:analysis_result', (data) => {
        bus.emit('net:analysis_result', data); // 转发
    });

    // === 监听 UI 命令 -> 发送网络请求 ===
    // (原本的 cmd:scan 和 cmd:remote_click 已移动到 browser.js)
}

window.onload = () => {
    // ---------------------------------------------------------------- //
    //  窗口加载完成回调()
    //
    //  函数用处：
    //     当网页所有资源加载完毕后执行。
    //
    //  易懂解释：
    //     等舞台都搭好了，演员都化好妆了，再拉开大幕。
    //
    //  警告：
    //     如果 JS 报错，可能会导致这里的初始化代码中断执行，整个页面瘫痪。
    // ---------------------------------------------------------------- //

    // 初始化各个模块
    angel.init(); // 启动小天使
    wm.init();    // 启动窗口管理器
    setupBusinessLogic(); // 绑定逻辑
    net.connect(); // 连接服务器

    // 启动时钟逻辑 (每秒更新一次)
    setInterval(() => {
        const clock = document.getElementById('clock-time');
        // 获取当前时间并格式化为 HH:MM
        if (clock) clock.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);

    // === 特定 UI 绑定 (非通用部分) ===

    // 绑定扫描按钮点击事件 (保留在这里，因为它可能属于全局工具栏，或者也可以移到 browser.js，但目前先保留)
    // 实际上 browser.js 已经监听了 cmd:scan，这里只是触发事件
    document.getElementById('btn-scan')?.addEventListener('click', () => bus.emit('cmd:scan'));

    // (浏览器控制、视频进度条、远程点击逻辑已移动到 apps/browser.js)

    // === 小天使特殊拖拽绑定 ===
    // 因为小天使不是标准 Window，需要单独绑定拖拽逻辑
    const angelEl = document.getElementById('angel-companion');
    if (angelEl) {
        angelEl.addEventListener('mousedown', (e) => {
            if (e.button === 0) wm.startDrag(e, angelEl, 'window'); // 复用 window 拖拽逻辑
        });
    }

    // === 账单开关 ===
    document.getElementById('btn-billing')?.addEventListener('click', () => {
        const el = document.getElementById('billing-popover');
        // 切换显示/隐藏
        el.style.display = el.style.display === 'block' ? 'none' : 'block';
    });

    // (自定义壁纸按钮逻辑已移动到 apps/settings.js)
};