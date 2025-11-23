export const config = {
    // =================================
    //  🎉 浏览器配置 (ID, 名称, 图标...)
    //
    //  🎨 代码用途：
    //     定义“全视之眼”浏览器的基础元数据和界面结构
    //
    //  💡 易懂解释：
    //     这是小天使的“望远镜”！通过它，你可以看到服务器那边的网页，还能远程操控哦~ 🔭
    //
    //  ⚠️ 警告：
    //     HTML 结构中的 ID（如 browser-url, btn-browser-go）被 JS 逻辑强依赖，修改时请同步更新 JS 代码。
    // =================================
    id: 'win-angel', // 💖 窗口的唯一标识符，用于 WindowManager 识别
    name: '探索之窗', // 💖 窗口标题栏显示的名称
    description: '发现世界', // 💖 功能描述
    icon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z', // 💖 SVG 图标路径（眼睛形状）
    color: '#6c5ce7', // 💖 窗口的主题颜色（紫色）
    pos: { x: 20, y: 110 }, // 💖 桌面图标的默认位置
    winPos: { x: 400, y: 100 }, // 💖 窗口打开时的默认屏幕坐标
    openMsg: "探索之窗已开启，准备好发现新世界了吗？🌍", // 💖 打开应用时小天使说的话
    content: `
        <!-- 💖 浏览器地址栏容器 -->
        <div style="padding:8px; background:#f1f2f6; display:flex; gap:8px; border-bottom:1px solid #ddd;">
            <!-- 💖 网址输入框 -->
            <input type="text" id="browser-url" placeholder="输入网址 (例如 https://www.bilibili.com)"
                style="flex:1; padding:4px 8px; border:1px solid #ccc; border-radius:4px;">
            <!-- 💖 前往按钮 -->
            <button id="btn-browser-go" style="padding:4px 12px; cursor:pointer;">前往</button>
            <!-- 💖 智能分析按钮 -->
            <button id="btn-browser-analyze"
                style="padding:4px 12px; cursor:pointer; background:var(--primary-color); color:white; border:none; border-radius:4px;">分析画面</button>
        </div>

        <!-- 💖 浏览器内容显示区域 -->
        <div style="flex:1; position:relative; background:black;">
            <!-- 💖 实时画面显示组件 (默认隐藏，有数据时显示) -->
            <img id="live-image" style="width:100%; height:100%; object-fit:contain; display:none;" />
            <!-- 💖 远程控制交互层 (覆盖在画面之上，用于捕获点击) -->
            <div id="remote-screen"
                style="position:absolute; top:0; left:0; width:100%; height:100%; cursor:crosshair;"></div>
            <!-- 💖 视频播放进度条 (悬停显示) -->
            <div id="video-progress-bar"
                style="position:absolute; bottom:0; left:0; width:100%; height:5px; background:rgba(255,255,255,0.3); cursor:pointer; display:none;">
                <!-- 💖 进度条填充部分 -->
                <div style="width:0%; height:100%; background:red;"></div>
            </div>
        </div>
    `,
    contentStyle: 'display:flex; flex-direction:column; padding:0;' // 💖 窗口内容的 CSS 样式
};

import { bus } from '../event_bus.js'; // 💖 导入事件总线，用于模块间通信
import { network } from '../network.js'; // 💖 导入网络模块，用于与服务器通信
import { wm } from '../window_manager.js'; // 💖 导入窗口管理器，用于控制窗口行为

class BrowserApp {
    // =================================
    //  🎉 浏览器应用类 (无参数)
    //
    //  🎨 代码用途：
    //     管理“观察眼”APP的业务逻辑，包括地址栏导航、视频分析、进度条控制和远程点击
    //
    //  💡 易懂解释：
    //     这是你的“网络电视”遥控器！你可以换台（输网址）、让小天使帮你看看电视里演了啥（分析画面）、快进（拖进度条）~ 📺
    //
    //  ⚠️ 警告：
    //     依赖于 DOM 中特定的 ID（如 btn-browser-go, video-progress-bar），如果 HTML 结构改变，这里需要同步修改。
    // =================================
    constructor() {
        // 💖 监听窗口就绪事件，确保 DOM 元素存在后再初始化
        bus.on(`app:ready:${config.id}`, () => this.init());

        // 监听“远程点击”命令 (从 main.js 移过来的逻辑，这里直接处理)
        bus.on('cmd:remote_click', (pos) => {
            network.send('click', pos); // 💖 将点击坐标通过网络发送给服务器
        });
    }

    // =================================
    //  🎉 初始化函数 (无参数)
    //
    //  🎨 代码用途：
    //     启动浏览器的所有功能模块，包括事件绑定和远程控制设置
    //
    //  💡 易懂解释：
    //     给遥控器装上电池，确认每个按钮都能用！🔋
    //
    //  ⚠️ 警告：
    //     必须在 DOM 加载完成后调用，否则找不到按钮。
    // =================================
    init() {
        this.bindEvents(); // 💖 绑定基础按钮事件（如前往、分析）
        this.setupRemoteControl(); // 💖 设置远程控制逻辑（如点击画面、拖动进度条）
    }

    // =================================
    //  🎉 绑定事件 (无参数)
    //
    //  🎨 代码用途：
    //     绑定界面按钮事件（如前往、分析）和网络命令监听（如扫描）
    //
    //  💡 易懂解释：
    //     告诉遥控器，按这个键是换台，按那个键是分析！🔘
    //
    //  ⚠️ 警告：
    //     如果找不到对应的 DOM 元素，事件绑定将不会生效（代码中已做空值检查）。
    // =================================
    bindEvents() {
        // === 监听“开始扫描”命令 ===
        bus.on('cmd:scan', () => {
            network.send('start_scan'); // 💖 发送网络请求，通知服务器开始扫描
            wm.openApp('win-angel'); // 💖 自动打开“观察眼”窗口，显示扫描界面
        });

        // === 浏览器控制逻辑 ===
        const btnGo = document.getElementById('btn-browser-go'); // 💖 获取“前往”按钮 DOM 元素
        const inputUrl = document.getElementById('browser-url'); // 💖 获取地址输入框 DOM 元素
        if (btnGo && inputUrl) { // 💖 确保元素存在，防止报错
            // 点击“前往”按钮时触发
            btnGo.onclick = () => {
                const url = inputUrl.value; // 💖 获取用户输入的网址
                if (url) { // 💖 如果网址不为空
                    window.current_browser_url = url; // 💖 记录当前 URL 到全局变量，供其他模块使用
                    network.send({ type: 'browser_navigate', url: url }); // 💖 发送导航指令给服务器
                    bus.emit('system:speak', "正在前往目标网页..."); // 💖 让小天使语音播报操作状态
                }
            };
        }

        // === 分析按钮 ===
        const btnAnalyze = document.getElementById('btn-browser-analyze'); // 💖 获取“分析画面”按钮 DOM 元素
        if (btnAnalyze) { // 💖 确保元素存在
            // 点击“分析”按钮时触发
            btnAnalyze.onclick = () => {
                network.send({ type: 'agent_analyze' }); // 💖 发送分析指令给服务器，请求 AI 分析当前画面
                bus.emit('system:speak', "正在分析当前视频..."); // 💖 让小天使语音播报操作状态
            };
        }
    }

    // =================================
    //  🎉 设置远程控制 (无参数)
    //
    //  🎨 代码用途：
    //     处理视频进度条拖动和画面远程点击逻辑
    //
    //  💡 易懂解释：
    //     让你能用鼠标点屏幕里的东西，或者拖动进度条快进！🖱️
    //
    //  ⚠️ 警告：
    //     远程点击依赖于图片坐标的相对计算，如果图片显示比例不对，点击位置可能会偏。
    // =================================
    setupRemoteControl() {
        const progressBar = document.getElementById('video-progress-bar'); // 💖 获取视频进度条 DOM 元素
        const remoteScreen = document.getElementById('remote-screen'); // 💖 获取远程屏幕遮罩层 DOM 元素

        if (remoteScreen && progressBar) { // 💖 确保相关元素都存在
            // 鼠标悬停在屏幕上时显示进度条
            remoteScreen.addEventListener('mouseenter', () => progressBar.style.display = 'block'); // 💖 显示进度条
            // 鼠标离开屏幕时隐藏进度条
            remoteScreen.addEventListener('mouseleave', () => progressBar.style.display = 'none'); // 💖 隐藏进度条

            // 点击进度条跳转
            progressBar.addEventListener('click', (e) => {
                e.stopPropagation(); // 💖 阻止事件冒泡，防止触发 remoteScreen 的点击事件
                const rect = progressBar.getBoundingClientRect(); // 💖 获取进度条的尺寸和位置信息
                // 计算点击位置在进度条上的百分比 (0-100)
                const percent = ((e.clientX - rect.left) / rect.width) * 100; // 💖 计算百分比
                network.send({ type: 'video_drag', progress: percent }); // 💖 发送拖拽指令给服务器
                bus.emit('system:speak', `跳转到 ${Math.round(percent)}%`); // 💖 让小天使语音播报跳转进度
            });
        }

        // === 远程点击逻辑 ===
        if (remoteScreen) { // 💖 确保遮罩层存在
            remoteScreen.addEventListener('click', (e) => {
                // 如果点击的是进度条，不触发远程点击（双重保险）
                if (e.target.closest('#video-progress-bar')) return; // 💖 如果点击目标是进度条内部，直接返回

                const img = document.getElementById('live-image'); // 💖 获取实时画面图片元素
                if (!img) return; // 💖 如果没有图片，无法计算坐标，直接返回
                const r = img.getBoundingClientRect(); // 💖 获取图片的尺寸和位置信息
                // 计算相对坐标 (0.0 - 1.0)，发送给服务器
                bus.emit('cmd:remote_click', { // 💖 触发远程点击事件
                    x: (e.clientX - r.left) / r.width, // 💖 计算 X 轴相对坐标
                    y: (e.clientY - r.top) / r.height // 💖 计算 Y 轴相对坐标
                });
            });
        }

        // 监听“远程点击”命令 (从 main.js 移过来的逻辑，这里直接处理)
        // bus.on('cmd:remote_click', (pos) => {
        //    network.send('click', pos); // 💖 将点击坐标通过网络发送给服务器
        // });
    }
}

export const app = new BrowserApp(); // 💖 导出应用实例
