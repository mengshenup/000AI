import { Angel } from './angel.js';
import { Network } from './network.js';
import { WindowManager } from './window_manager.js';
import { bus } from './event_bus.js';

// 1. 瀹炰緥鍖栨ā鍧?const net = new Network();
const wm = new WindowManager();
const angel = new Angel('angel-companion');

// 2. 缁戝畾涓氬姟閫昏緫 (Business Logic Glue)
function setupBusinessLogic() {
    // 缃戠粶鐘舵€佹洿鏂?-> UI 鏄剧ず
    bus.on('net:stats', (stats) => {
        const update = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
        update('tx-stat', stats.net.up);
        update('rx-stat', stats.net.down);
        update('ai-cost', stats.grand_total);
        update('pop-net', stats.net.cost);
        update('pop-total', stats.grand_total);
        
        // 璐﹀崟璇︽儏
        const mb = document.getElementById('pop-models');
        if(mb && stats.ai.details.length) {
            mb.innerHTML = stats.ai.details.map(t=>`<div class="bill-row bill-sub"><span>${t.split(': ')[0]}</span><span>${t.split(': ')[1]}</span></div>`).join('');
        }
    });

    // 瀹炴椂鐢婚潰甯?    bus.on('net:frame', (imgSrc) => {
        const el = document.getElementById('live-image');
        if(el) {
            el.src = imgSrc;
            el.style.display = 'block';
        }
    });

    // 鏀跺埌鏂版儏鎶?    bus.on('net:intel', (d) => {
        const list = document.getElementById('file-list');
        if(list) {
            if (list.innerText.includes("杩樻病鏈夋暟鎹?)) list.innerHTML = "";
            const el = document.createElement('div');
            el.className = 'file-item';
            el.onclick = () => {
                bus.emit('system:speak', `姝ｅ湪璺宠浆...`);
                net.send('jump_to', {timestamp: d.raw_time, url: d.url});
                wm.openApp('win-angel');
            };
            el.innerHTML = `<div style="font-weight:bold;">馃搷 ${d.name}</div><div style="font-size:11px;color:#666;">${d.time_str}</div>`;
            list.appendChild(el);
            bus.emit('system:speak', "鍙戠幇鏂扮偣浣嶏紒馃帀");
        }
    });

    // 鐩戝惉鑷畾涔変簨浠讹細浠?UI 鍙戣捣鐨勫懡浠?    bus.on('cmd:scan', () => {
        net.send('start_scan');
        wm.openApp('win-angel');
    });
    
    bus.on('cmd:remote_click', (pos) => {
        net.send('click', pos);
    });
}

// 3. 鍚姩
window.onload = () => {
    angel.init();
    wm.init();
    setupBusinessLogic();
    net.connect();

    // 鏃堕挓閫昏緫
    setInterval(() => {
        const clock = document.getElementById('clock-time');
        if(clock) clock.innerText = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    }, 1000);

    // 鐗瑰畾 UI 缁戝畾 (闈為€氱敤閮ㄥ垎)
    document.getElementById('btn-scan')?.addEventListener('click', () => bus.emit('cmd:scan'));
    
    // 杩滅▼鐐瑰嚮閫昏緫
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

    // 灏忓ぉ浣跨壒娈婃嫋鎷界粦瀹?(鍥犱负灏忓ぉ浣夸笉鏄爣鍑?Window)
    const angelEl = document.getElementById('angel-companion');
    if(angelEl) {
        angelEl.addEventListener('mousedown', (e) => {
            if(e.button === 0) wm.startDrag(e, angelEl, 'window'); // 澶嶇敤 window 鎷栨嫿閫昏緫
        });
    }
    
    // 璐﹀崟寮€鍏?    document.getElementById('btn-billing')?.addEventListener('click', () => {
         const el = document.getElementById('billing-popover');
         el.style.display = el.style.display === 'block' ? 'none' : 'block';
    });
    
    // 鑷畾涔夊绾告寜閽?    document.getElementById('btn-custom-wp')?.addEventListener('click', () => {
        const url = document.getElementById('custom-wp')?.value;
        if(url) wm.changeWallpaper(url);
    });
};
