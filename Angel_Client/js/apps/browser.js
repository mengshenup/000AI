export const config = {
    id: 'win-angel',
    name: 'Omni-Eye',
    icon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
    color: '#6c5ce7',
    pos: { x: 20, y: 110 },
    winPos: { x: 400, y: 100 },
    openMsg: "虚空注视者已启动，正在连接全视之眼... 👁️",
    content: `
        <!-- 浏览器地址栏 -->
        <div style="padding:8px; background:#f1f2f6; display:flex; gap:8px; border-bottom:1px solid #ddd;">
            <input type="text" id="browser-url" placeholder="输入网址 (例如 https://www.bilibili.com)"
                style="flex:1; padding:4px 8px; border:1px solid #ccc; border-radius:4px;">
            <button id="btn-browser-go" style="padding:4px 12px; cursor:pointer;">前往</button>
            <button id="btn-browser-analyze"
                style="padding:4px 12px; cursor:pointer; background:var(--primary-color); color:white; border:none; border-radius:4px;">分析画面</button>
        </div>

        <!-- 浏览器内容区域 (iframe) -->
        <div style="flex:1; position:relative; background:black;">
            <!-- 实时画面 (截图) -->
            <img id="live-image" style="width:100%; height:100%; object-fit:contain; display:none;" />
            <!-- 远程控制层 -->
            <div id="remote-screen"
                style="position:absolute; top:0; left:0; width:100%; height:100%; cursor:crosshair;"></div>
            <!-- 视频进度条 -->
            <div id="video-progress-bar"
                style="position:absolute; bottom:0; left:0; width:100%; height:5px; background:rgba(255,255,255,0.3); cursor:pointer; display:none;">
                <div style="width:0%; height:100%; background:red;"></div>
            </div>
        </div>
    `,
    contentStyle: 'display:flex; flex-direction:column; padding:0;'
};

//  函数用处：
//     管理“观察眼”APP的业务逻辑。包括地址栏导航、视频分析、进度条控制和远程点击。
//
//  易懂解释：
//     这是你的“网络电视”遥控器。
//     你可以换台（输网址）、让小天使帮你看看电视里演了啥（分析画面）、快进（拖进度条）。
//
//  警告：
//     依赖于 DOM 中特定的 ID（如 btn-browser-go, video-progress-bar），如果 HTML 结构改变，这里需要同步修改。
// ---------------------------------------------------------------- //

import { bus } from '../event_bus.js';
import { network } from '../network.js';
import { wm } from '../window_manager.js';

class BrowserApp {
    constructor() {
        // 监听窗口就绪事件，替代 setTimeout
        bus.on(`app:ready:${config.id}`, () => this.init());
    }

    init() {
        // ---------------------------------------------------------------- //
        //  初始化()
        //
        //  函数用处：
        //     启动浏览器的所有功能模块，包括事件绑定和远程控制设置。
        //
        //  易懂解释：
        //     给遥控器装上电池，确认每个按钮都能用。
        //
        //  警告：
        //     必须在 DOM 加载完成后调用。
        // ---------------------------------------------------------------- //
        this.bindEvents(); // 绑定基础按钮事件
        this.setupRemoteControl(); // 设置远程控制逻辑
    }

    bindEvents() {
        // ---------------------------------------------------------------- //
        //  绑定事件()
        //
        //  函数用处：
        //     绑定界面按钮事件（如前往、分析）和网络命令监听（如扫描）。
        //
        //  易懂解释：
        //     告诉遥控器，按这个键是换台，按那个键是分析。
        //
        //  警告：
        //     如果找不到对应的 DOM 元素，事件绑定将不会生效（代码中已做空值检查）。
        // ---------------------------------------------------------------- //

        // === 监听“开始扫描”命令 ===
        bus.on('cmd:scan', () => {
            network.send('start_scan'); // 发送网络请求，通知服务器开始扫描
            wm.openApp('win-angel'); // 自动打开“观察眼”窗口，显示扫描界面
        });

        // === 浏览器控制逻辑 ===
        const btnGo = document.getElementById('btn-browser-go'); // 获取“前往”按钮
        const inputUrl = document.getElementById('browser-url'); // 获取地址输入框
        if (btnGo && inputUrl) {
            // 点击“前往”按钮时触发
            btnGo.onclick = () => {
                const url = inputUrl.value; // 获取输入的网址
                if (url) {
                    window.current_browser_url = url; // 记录当前 URL 到全局变量，供其他模块使用
                    network.send({ type: 'browser_navigate', url: url }); // 发送导航指令给服务器
                    bus.emit('system:speak', "正在前往目标网页..."); // 让小天使语音播报
                }
            };
        }

        // === 分析按钮 ===
        const btnAnalyze = document.getElementById('btn-browser-analyze'); // 获取“分析画面”按钮
        if (btnAnalyze) {
            // 点击“分析”按钮时触发
            btnAnalyze.onclick = () => {
                network.send({ type: 'agent_analyze' }); // 发送分析指令给服务器
                bus.emit('system:speak', "正在分析当前视频..."); // 让小天使语音播报
            };
        }
    }

    setupRemoteControl() {
        // ---------------------------------------------------------------- //
        //  设置远程控制()
        //
        //  函数用处：
        //     处理视频进度条拖动和画面远程点击逻辑。
        //
        //  易懂解释：
        //     让你能用鼠标点屏幕里的东西，或者拖动进度条快进。
        //
        //  警告：
        //     远程点击依赖于图片坐标的相对计算，如果图片显示比例不对，点击位置可能会偏。
        // ---------------------------------------------------------------- //

        const progressBar = document.getElementById('video-progress-bar'); // 获取视频进度条元素
        const remoteScreen = document.getElementById('remote-screen'); // 获取远程屏幕遮罩层

        if (remoteScreen && progressBar) {
            // 鼠标悬停在屏幕上时显示进度条
            remoteScreen.addEventListener('mouseenter', () => progressBar.style.display = 'block');
            // 鼠标离开屏幕时隐藏进度条
            remoteScreen.addEventListener('mouseleave', () => progressBar.style.display = 'none');

            // 点击进度条跳转
            progressBar.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止冒泡触发 remoteScreen 的点击事件
                const rect = progressBar.getBoundingClientRect(); // 获取进度条的尺寸和位置
                // 计算点击位置在进度条上的百分比 (0-100)
                const percent = ((e.clientX - rect.left) / rect.width) * 100;
                network.send({ type: 'video_drag', progress: percent }); // 发送拖拽指令给服务器
                bus.emit('system:speak', `跳转到 ${Math.round(percent)}%`); // 让小天使语音播报
            });
        }

        // === 远程点击逻辑 ===
        if (remoteScreen) {
            remoteScreen.addEventListener('click', (e) => {
                // 如果点击的是进度条，不触发远程点击（双重保险）
                if (e.target.closest('#video-progress-bar')) return;

                const img = document.getElementById('live-image'); // 获取实时画面图片元素
                if (!img) return; // 如果没有图片，无法计算坐标
                const r = img.getBoundingClientRect(); // 获取图片的尺寸和位置
                // 计算相对坐标 (0.0 - 1.0)，发送给服务器
                bus.emit('cmd:remote_click', {
                    x: (e.clientX - r.left) / r.width,
                    y: (e.clientY - r.top) / r.height
                });
            });
        }

        // 监听“远程点击”命令 (从 main.js 移过来的逻辑，这里直接处理)
        bus.on('cmd:remote_click', (pos) => {
            network.send('click', pos); // 将点击坐标通过网络发送给服务器
        });
    }
}

export const app = new BrowserApp();
