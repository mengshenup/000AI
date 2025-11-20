import { Angel } from './angel.js';
import { Network } from './network.js';
import { WindowManager } from './window_manager.js';
import { bus } from './event_bus.js';

// 1. 实例化模块
const net = new Network();
const wm = new WindowManager();
const angel = new Angel('angel-companion');

// 2. 绑定业务逻辑 (Business Logic Glue)
function setupBusinessLogic() {
    // 网络状态更新 -> UI 显示
    bus.on('net:stats', (stats) => {
        const update = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
        update('tx-stat', stats.net.up);
        update('rx-stat', stats.net.down);
        update('ai-cost', stats.grand_total);
        update('pop-net', stats.net.cost);
        update('pop-total', stats.grand_total);
        
        // 账单详情
        const mb = document.getElementById('pop-models');
        if(mb && stats.ai.details.length) {
            mb.innerHTML = stats.ai.details.map(t=>`<div class="bill-row bill-sub"><span>${t.split(': ')[0]}</span><span>${t.split(': ')[1]}</span></div>`).join('');
        }
    });

    // 实时画面帧
    bus.on('net:frame', (imgSrc) => {
        const el = document.getElementById('live-image');
        if(el) {
            el.src = imgSrc;
            el.style.display = 'block';
        }
    });

    // 收到新情报
    bus.on('net:intel', (d) => {
        const list = document.getElementById('file-list');
        if(list) {
            if (list.innerText.includes("还没有数据")) list.innerHTML = "";
            const el = document.createElement('div');
            el.className = 'file-item';
            el.onclick = () => {
                bus.emit('system:speak', `正在跳转...`);
                net.send('jump_to', {timestamp: d.raw_time, url: d.url});
                wm.openApp('win-angel');
            };
            el.innerHTML = `<div style="font-weight:bold;">📍 ${d.name}</div><div style="font-size:11px;color:#666;">${d.time_str}</div>`;
            list.appendChild(el);
            bus.emit('system:speak', "发现新点位！🎉");
        }
    });

    // 监听自定义事件：从 UI 发起的命令
    bus.on('cmd:scan', () => {
        net.send('start_scan');
        wm.openApp('win-angel');
    });
    
    bus.on('cmd:remote_click', (pos) => {
        net.send('click', pos);
    });
}

// 3. 启动
window.onload = () => {
    angel.init();
    wm.init();
    setupBusinessLogic();
    net.connect();

    // 时钟逻辑
    setInterval(() => {
        const clock = document.getElementById('clock-time');
        if(clock) clock.innerText = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    }, 1000);

    // 特定 UI 绑定 (非通用部分)
    document.getElementById('btn-scan')?.addEventListener('click', () => bus.emit('cmd:scan'));
    
    // 远程点击逻辑
    const remoteScreen = document.getElementById('remote-screen');
    if(remoteScreen) {
        remoteScreen.addEventListener('click', (e) => {
            const img = document.getElementById('live-image');
            const r = img.getBoundingClientRect();
            bus.emit('cmd:remote_click', {
                x: (e.clientX - r.left) / r.width,
                y: (e.clientY - r.top) / r.height
            });
        });
    }

    // 小天使特殊拖拽绑定 (因为小天使不是标准 Window)
    const angelEl = document.getElementById('angel-companion');
    if(angelEl) {
        angelEl.addEventListener('mousedown', (e) => {
            if(e.button === 0) wm.startDrag(e, angelEl, 'window'); // 复用 window 拖拽逻辑
        });
    }
    
    // 账单开关
    document.getElementById('btn-billing')?.addEventListener('click', () => {
         const el = document.getElementById('billing-popover');
         el.style.display = el.style.display === 'block' ? 'none' : 'block';
    });
    
    // 自定义壁纸按钮
    document.getElementById('btn-custom-wp')?.addEventListener('click', () => {
        const url = document.getElementById('custom-wp')?.value;
        if(url) wm.changeWallpaper(url);
    });
};