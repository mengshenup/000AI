import { bus } from '../event_bus.js';
import { wm } from '../window_manager.js';
import { pm } from '../process_manager.js'; // 🛡️ 导入进程管理器

export const config = {
    // =================================
    //  🎉 应用配置 (ID, 名称, 图标...)
    //
    //  🎨 代码用途：
    //     定义 Seraphim 小天使应用的基础元数据和窗口样式配置
    //
    //  💡 易懂解释：
    //     这是小天使的“身份证”和“穿衣指南”！告诉系统它叫什么、长什么样、住在哪里~ 👗
    //
    //  ⚠️ 警告：
    //     content 里的 HTML 结构不要随意破坏，否则小天使会“骨折”的！CSS 里的 !important 是为了覆盖默认窗口样式，别删哦！
    // =================================
    id: 'win-companion',
    name: '守护天使',
    description: '永远陪伴在你身边的守护者', // 💖 更长的描述
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
    color: '#ff7675',
    showDesktopIcon: false, // 💖 不显示桌面图标
    showTaskbarIcon: false, // 💖 不显示任务栏图标
    pos: { x: window.innerWidth - 320, y: 100 }, // 💖 默认出生在屏幕右侧，不挡视线
    winPos: { x: window.innerWidth - 320, y: 100 },
    isOpen: true, // 💖 默认打开小天使窗口
    // openMsg: "Seraphim 已上线，愿你的每一天都充满阳光！✨", // 💖 已移除，统一由 angel.js 管理
    // 💖 这是一个特殊的“透明”窗口，我们通过 CSS 覆盖默认样式
    content: `
        <div id="angel-container" style="width:100%; height:100%; position:relative;">
            <div id="angel-scene" style="width:100%; height:100%;"></div>
            <div id="angel-speech" class="speech-bubble">...</div>
            
            <!-- 💖 新增：聊天交互框 -->
            <div id="angel-chat" class="angel-chat-box">
                <div class="chat-input-wrapper">
                    <input type="text" id="angel-input" class="angel-input" placeholder="输入指令或聊天..." autocomplete="off">
                    <button id="btn-voice" class="chat-btn" title="语音输入">
                        <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    </button>
                    <!-- 💖 新增：静音按钮 -->
                    <button id="btn-mute" class="chat-btn" title="开启/关闭语音">
                        <svg id="icon-sound-on" viewBox="0 0 24 24" style="display:block"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                        <svg id="icon-sound-off" viewBox="0 0 24 24" style="display:none"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                    </button>
                    <button id="btn-send" class="chat-btn" title="发送">
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>
        </div>
        <style>
            /* 💖 特殊样式：让这个窗口背景透明，去掉边框和阴影 */
            #win-companion {
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
                overflow: visible !important; /* 💖 允许气泡溢出窗口边界 */
                -webkit-backdrop-filter: none !important;
                backdrop-filter: none !important; /* 🚫 移除毛玻璃效果 */
            }
            #win-companion .title-bar {
                display: none !important; /* 💖 隐藏标题栏，让它看起来像悬浮在桌面上 */
            }
            #win-companion .window-content {
                background: transparent !important;
                overflow: visible !important; /* 💖 允许气泡溢出窗口边界 */
            }
            /* 💖 气泡样式已移至 style.css 统一管理 */
        </style>
    `,
    contentStyle: 'background:transparent; overflow:visible;'
};

// =================================
//  🎉 小天使台词库 (无参数)
//
//  🎨 代码用途：
//     存储小天使随机对话的文本数组
//
//  💡 易懂解释：
//     这些是小天使的“口头禅”小本本，每次点击它，它就会从这里随机挑一句跟你撒娇~ 💬
//
//  ⚠️ 警告：
//     数组内容必须是字符串，太长的话气泡可能会爆掉哦！
// =================================
const ANGEL_QUOTES = [
    "我是你的专属小天使 Seraphim，永远支持你~ ✨",
    "相信自己，你拥有改变世界的力量！(ง •_•)ง",
    "每一个挑战都是成长的机会，加油！🌟",
    "休息一下吧，照顾好自己才是最重要的~ ☕",
    "你的努力我都看在眼里，真棒！👍",
    "无论发生什么，我都会一直陪着你。💖",
    "保持微笑，好运自然来！😊",
    "我在听，把你的烦恼都告诉我吧~ 👂"
];

// =================================
//  🎉 应用启动语录库
// =================================
const APP_OPEN_MESSAGES = {
    'win-billing': "金色收获已开启，每一分耕耘都有回报！💰",
    'win-angel': "探索之窗已打开，世界那么大，我们去看看！🌍",
    'win-intel': "智慧锦囊已解开，灵感女神正在眷顾你！💡",
    'win-manual': "光明指引已点亮，前方的路不再迷茫！🕯️",
    'win-settings': "美好工坊已就绪，来打造你的梦想空间吧！🎨",
    'win-taskmgr': "活力源泉已涌动，系统状态满格！💪",
    'win-traffic': "脉动监测中，感受数据的每一次跳动！💓",
    'win-companion': "Seraphim 已上线，愿你的每一天都充满阳光！✨",
    'default': "应用已启动，随时为你服务！✨"
};

export class AngelApp {
    // =================================
    //  🎉 小天使应用类
    //
    //  🎨 代码用途：
    //     管理 3D 小天使的生命周期、渲染循环和交互逻辑
    //
    //  💡 易懂解释：
    //     这是小天使的“灵魂”！它负责把小天使画出来，让她动起来，还能听懂你的鼠标点击哦~ 🧚‍♀️
    //
    //  ⚠️ 警告：
    //     依赖 THREE.js 库，如果库没加载，小天使就现不了身啦！
    // =================================
    constructor() {
        this.id = config.id;
        this.ctx = pm.getContext(this.id);
        
        this.scene = null; // 💖 3D 场景容器
        this.camera = null; // 💖 观察小天使的摄像机
        this.renderer = null; // 💖 负责把 3D 变成画面的渲染器
        this.group = null; // 💖 小天使身体各部分的组合
        this.timer = null; // 💖 气泡显示的定时器
        this.wL = null; // 💖 左翅膀
        this.wR = null; // 💖 右翅膀
        this.state = { r: false, sx: 0, ir: 0 }; // 💖 交互状态：r=旋转中, sx=起始X坐标, ir=初始旋转角度
        this.isRunning = false; // 💖 运行状态标志
        this.isMuted = false; // 💖 默认开启语音

        // 绑定 animate
        this.animate = this.animate.bind(this);

        // 监听窗口就绪事件 (使用 bus.on 而不是 ctx.on，确保在进程被 kill 后仍能响应重启信号)
        bus.on(`app:ready:${this.id}`, () => this.init());

        // 注册清理函数
        this.ctx.onCleanup(() => this.onDestroy());

        // 💖 监听重置指令 (通过事件总线)
        bus.on('angel:reset', () => this.resetState());
    }

    // =================================
    //  🎉 重置状态
    // =================================
    resetState() {
        console.log("执行小天使重置指令...");
        // 1. 重置位置
        if (this.group) {
            this.group.position.set(0, 0, 0);
            this.group.rotation.set(0, 0, 0);
        }
        // 2. 重置交互状态
        this.state = { r: false, sx: 0, ir: 0 };
        // 3. 清除本地存储的静音设置等 (可选)
        localStorage.removeItem('angel_is_muted');
        localStorage.removeItem('angel_performance_mode');
        
        this.showBubble("已重置所有状态！✨");
    }

    // =================================
    //  🎉 初始化函数 (无参数)
    //
    //  🎨 代码用途：
    //     设置 3D 场景、相机、灯光，并启动渲染循环
    //
    //  💡 易懂解释：
    //     这是小天使的“诞生仪式”！搭建舞台（场景）、打光（灯光）、架摄像机，然后把小天使请出来~ 🎬
    //
    //  ⚠️ 警告：
    //     必须确保 DOM 元素 #angel-scene 已经存在，否则无法挂载渲染器。
    // =================================
    init() {
        // 💖 读取静音状态
        const savedMute = localStorage.getItem('angel_is_muted');
        if (savedMute !== null) {
            this.isMuted = savedMute === 'true';
        }

        // 💖 读取性能配置 (通过事件总线监听变更)
        // 初始值读取
        const savedPerf = localStorage.getItem('angel_performance_mode');
        this.setPerfMode(savedPerf || 'high');

        // 监听配置变更
        this.ctx.on('config:changed', (data) => {
            if (data.key === 'perfMode') {
                this.setPerfMode(data.value);
            }
        });

        // 🛑 防止重复初始化导致多个渲染循环
        if (this.renderer) {
            // 如果已经有渲染器，说明是重新打开窗口
            // 我们需要重新挂载 DOM，但不需要重新创建 Scene
            this.container = document.getElementById('angel-scene');
            if (this.container && !this.container.contains(this.renderer.domElement)) {
                this.container.appendChild(this.renderer.domElement);
                // 💖 重新设置尺寸，防止窗口大小变化导致变形
                const width = this.container.clientWidth || 300;
                const height = this.container.clientHeight || 400;
                this.renderer.setSize(width, height);
            }
            this.isRunning = true;
            this.animate(); // 确保恢复运行
            this.updateMuteIcon(); // 💖 更新图标状态
            return;
        }

        // 获取容器
        this.container = document.getElementById('angel-scene');
        if (!this.container) return;

        // 创建场景
        this.scene = new THREE.Scene();

        // 创建相机
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 1, 5);

        // 创建渲染器
        // 💖 性能优化：根据配置决定是否开启抗锯齿
        try {
            // 🕵️‍♂️ 预检：检测是否为软件渲染环境
            const checkCanvas = document.createElement('canvas');
            const gl = checkCanvas.getContext('webgl');
            let isSoftware = false;

            // 🐢 检查是否强制开启了 CPU 兼容模式
            const forceCpu = localStorage.getItem('angel_force_cpu') === 'true';
            if (forceCpu) {
                isSoftware = true;
                console.warn("用户强制开启了 CPU 兼容模式");
            } else if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    if (renderer && (renderer.toLowerCase().includes('software') || renderer.toLowerCase().includes('swiftshader'))) {
                        isSoftware = true;
                        console.warn("检测到软件渲染环境 (CPU Mode)，将启用兼容性配置");
                    }
                }
            }

            // 第一次尝试：标准模式 (检测性能陷阱)
            // 如果检测到是软件渲染，直接跳过高配尝试，进入兼容模式
            if (!isSoftware) {
                this.renderer = new THREE.WebGLRenderer({ 
                    alpha: true, 
                    antialias: this.perfMode === 'high',
                    powerPreference: "default",
                    failIfMajorPerformanceCaveat: true 
                }); 
            } else {
                throw new Error("Force CPU Mode");
            }
        } catch (e1) {
            console.warn("WebGL 标准模式启动失败或检测到 CPU 模式，尝试兼容模式...", e1);
            try {
                // 第二次尝试：兼容模式 (CPU 友好型)
                // 1. 关闭抗锯齿
                // 2. 使用低功耗优先
                // 3. 允许性能陷阱 (软件渲染)
                // 4. 降低分辨率 (在 setSize 中处理)
                this.perfMode = 'low'; // 强制低配
                this.renderer = new THREE.WebGLRenderer({ 
                    alpha: true, 
                    antialias: false,
                    powerPreference: "low-power",
                    failIfMajorPerformanceCaveat: false,
                    precision: "lowp" // 使用低精度浮点数，减轻 CPU 负担
                });
                
                // 提示用户
                this.showBubble("正在使用 CPU 兼容模式运行，可能会有些卡顿哦~ 🐢");
            } catch (e2) {
                console.error("WebGL 启动彻底失败", e2);
                alert("启动失败：您的浏览器无法创建 WebGL 上下文。\n\n可能原因：\n1. 显卡驱动未安装或过旧。\n2. 浏览器硬件加速被禁用 (请检查 edge://settings/system)。\n3. 系统资源耗尽 (请尝试关闭服务端或其他大型软件)。");
                return;
            }
        }

        // 确保容器有尺寸
        const width = this.container.clientWidth || 300;
        const height = this.container.clientHeight || 400;
        this.renderer.setSize(width, height);
        // 💖 性能优化：设置像素比，低配模式下降低分辨率
        this.renderer.setPixelRatio(this.perfMode === 'low' ? 1 : window.devicePixelRatio);
        
        this.container.appendChild(this.renderer.domElement);

        // 添加灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        // 创建小天使模型
        this.buildModel();

        // 初始化交互
        this.initInteraction();

        // 💖 性能优化：监听页面可见性，不可见时停止渲染
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isRunning = false;
            } else {
                this.isRunning = true;
                this.lastTime = performance.now();
                this.animate();
            }
        });

        // 启动动画循环
        this.isRunning = true;
        this.animate();

        // 💖 更新静音图标
        this.updateMuteIcon();

        // 💖 显示欢迎语 (使用统一的消息库)
        const msg = APP_OPEN_MESSAGES['win-companion'] || APP_OPEN_MESSAGES['default'];
        this.showBubble(msg);
    }

    // =================================
    //  🎉 设置性能模式
    // =================================
    setPerfMode(mode) {
        this.perfMode = mode; // high, low
        this.targetFPS = this.perfMode === 'low' ? 30 : 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        // 如果渲染器已存在，动态调整参数
        if (this.renderer) {
            this.renderer.setPixelRatio(this.perfMode === 'low' ? 1 : window.devicePixelRatio);
        }
    }

    // =================================
    //  🎉 销毁钩子 (覆盖基类)
    //
    //  🎨 代码用途：
    //     清理 WebGL 资源
    // =================================
    onDestroy() {
        this.isRunning = false;
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            this.renderer.domElement = null;
            this.renderer = null;
        }
        this.scene = null;
        this.camera = null;
        this.group = null;
    }

    // =================================
    //  🎉 构建模型 (无参数)
    //
    //  🎨 代码用途：
    //     使用基础几何体（BoxGeometry）拼装出小天使的 3D 模型
    //
    //  💡 易懂解释：
    //     像搭积木一样把小天使拼出来！头、身体、翅膀、光环，一个都不能少~ 🧱
    //
    //  ⚠️ 警告：
    //     坐标调整很繁琐，修改时要小心，不然小天使可能会“断手断脚”！
    // =================================
    buildModel() {
        this.group = new THREE.Group(); // 💖 创建一个组，把所有部件打包在一起
        this.group.scale.set(0.54, 0.54, 0.54); // 💖 放大模型尺寸 (0.45 * 1.2 = 0.54)
        const matSkin = new THREE.MeshLambertMaterial({ color: 0xffe0bd }); // 💖 皮肤材质
        const matDress = new THREE.MeshLambertMaterial({ color: 0xffffff }); // 💖 衣服材质
        const matHair = new THREE.MeshLambertMaterial({ color: 0xffb6c1 }); // 💖 头发材质
        const matEye = new THREE.MeshBasicMaterial({ color: 0x20c997 }); // 💖 眼睛材质
        const matWing = new THREE.MeshLambertMaterial({ color: 0xcceeff, transparent: true, opacity: 0.8 }); // 💖 翅膀材质（半透明）
        const matGold = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // 💖 光环材质

        // 💖 辅助函数：快速创建一个立方体 Mesh
        const box = (w, h, d, mat, x, y, z) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            return m;
        };

        // Head
        const head = new THREE.Group(); // 💖 头部组
        head.position.y = 1.4; // 💖 头部位置
        head.add(box(1, 0.9, 0.9, matSkin, 0, 0, 0)); // 💖 脸
        head.add(box(1.1, 0.8, 0.6, matHair, 0, 0.2, -0.3)); // 💖 后脑勺头发
        head.add(box(1.1, 0.3, 1.0, matHair, 0, 0.55, 0)); // 💖 头顶头发
        head.add(box(0.2, 0.7, 0.2, matHair, -0.5, 0.1, 0.4)); // 💖 左鬓角
        head.add(box(0.2, 0.7, 0.2, matHair, 0.5, 0.1, 0.4)); // 💖 右鬓角
        head.add(box(0.15, 0.15, 0.05, matEye, -0.25, -0.1, 0.46)); // 💖 左眼
        head.add(box(0.15, 0.15, 0.05, matEye, 0.25, -0.1, 0.46)); // 💖 右眼
        head.add(box(0.3, 1.8, 0.3, matHair, -0.7, -0.5, 0)); // 💖 左马尾
        head.add(box(0.3, 1.8, 0.3, matHair, 0.7, -0.5, 0)); // 💖 右马尾
        this.group.add(head); // 💖 把头装到身体组上

        // Body
        this.group.add(box(0.8, 0.8, 0.5, matDress, 0, 0.6, 0)); // 💖 上半身
        this.group.add(box(1.0, 0.4, 0.6, matDress, 0, 0.1, 0)); // 💖 裙摆

        // Legs
        const legs = new THREE.Group(); // 💖 腿部组
        legs.position.y = -0.5;
        legs.add(box(0.25, 0.8, 0.25, matSkin, -0.2, 0, 0)); // 💖 左腿
        legs.add(box(0.25, 0.8, 0.25, matSkin, 0.2, 0, 0)); // 💖 右腿
        this.group.add(legs);

        // Arms
        this.group.add(box(0.2, 0.7, 0.2, matSkin, -0.5, 0.6, 0)); // 💖 左臂
        this.group.add(box(0.2, 0.7, 0.2, matSkin, 0.5, 0.6, 0)); // 💖 右臂

        // Wings
        // 💖 辅助函数：创建更饱满的翅膀 (修正版：向上展开)
        const createWing = (isLeft) => {
            const wing = new THREE.Group();
            const dir = isLeft ? -1 : 1; // 💖 方向系数
            
            // 💖 材质：更洁白、更透亮
            const matBone = new THREE.MeshLambertMaterial({ color: 0xffffff });
            const matFeather = new THREE.MeshLambertMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.95, 
            });

            // 1. 翅膀骨架 (连接身体的部分)
            const bone = box(0.5, 0.15, 0.08, matBone, dir * 0.25, 0.05, 0);
            bone.rotation.z = dir * 0.1;
            wing.add(bone);

            // 2. 内层绒羽 (填充根部) - 增加密度
            for(let i = 0; i < 8; i++) {
                const f = box(0.15, 0.45, 0.03, matFeather, dir * (0.15 + i*0.05), 0.05 + i*0.02, 0.02); 
                f.rotation.z = dir * (0.1 + i * 0.08); 
                f.rotation.x = 0.1; 
                wing.add(f);
            }

            // 3. 中层覆羽 (主要覆盖层) - 增加层次感
            for(let i = 0; i < 10; i++) {
                const f = box(0.15, 0.7, 0.03, matFeather, dir * (0.2 + i*0.08), 0.15 + i*0.05, 0.04); 
                f.rotation.z = dir * (0.2 + i * 0.12); 
                f.rotation.x = 0.05;
                wing.add(f);
            }

            // 4. 外层飞羽 (长而有力，向上展开) - 更加修长和展开
            for(let i = 0; i < 12; i++) {
                const len = 1.0 + Math.sin(i * 0.3) * 0.5; // 增加长度变化
                const f = box(0.12, len, 0.03, matFeather, dir * (0.25 + i*0.1), 0.2 + len/2 + i*0.06, 0.06); 
                f.rotation.z = dir * (0.3 + i * 0.18); // 增加展开角度
                f.rotation.y = dir * -0.2; // 增加立体感
                wing.add(f);
            }
            
            return wing;
        };

        this.wL = createWing(true); // 💖 左翅膀组
        this.wL.position.set(-0.3, 0.6, -0.4); // 💖 降低 y 坐标 (0.8 -> 0.6)
        
        this.wR = createWing(false); // 💖 右翅膀组
        this.wR.position.set(0.3, 0.6, -0.4); // 💖 降低 y 坐标 (0.8 -> 0.6)
        
        this.group.add(this.wL);
        this.group.add(this.wR);

        // Halo
        this.group.add(box(1, 0.05, 1, matGold, 0, 2.2, 0)); // 💖 天使光环

        this.scene.add(this.group); // 💖 把整个小天使放入场景
    }

    // =================================
    //  🎉 动画循环 (无参数)
    //
    //  🎨 代码用途：
    //     每帧更新模型的位置和旋转，并执行渲染
    //
    //  💡 易懂解释：
    //     这是小天使的“心跳”！每一帧都让她上下浮动一点点，翅膀扇动一下下，看起来是活的！💓
    //
    //  ⚠️ 警告：
    //     这里是性能敏感区，不要在循环里创建新对象或进行复杂计算，否则电脑会变卡哦！
    // =================================
    animate() {
        if (!this.isRunning) return; // 💖 如果停止运行则跳过
        this.ctx.requestAnimationFrame(this.animate); // 💖 请求下一帧动画 (使用 ctx 自动管理)

        const now = performance.now(); // 💖 获取当前时间
        if (!this.lastTime) this.lastTime = now; // 💖 初始化上一帧时间
        const delta = now - this.lastTime; // 💖 计算时间差

        // 💖 性能优化：帧率限制
        if (this.frameInterval && delta < this.frameInterval) return;

        // 💖 性能优化：动态降级检测 (如果帧率持续过低，自动切换到低配模式)
        if (delta > 100) { // 如果一帧超过 100ms (FPS < 10)
            this.lowFpsCount = (this.lowFpsCount || 0) + 1;
            if (this.lowFpsCount > 20 && this.perfMode !== 'low') {
                console.warn("检测到性能卡顿，自动切换至低性能模式");
                this.perfMode = 'low';
                this.targetFPS = 30;
                this.frameInterval = 1000 / 30;
                this.renderer.setPixelRatio(1);
                this.renderer.antialias = false; // 注意：WebGLRenderer 的 antialias 属性通常只在构造时生效，这里可能无效，但意图是降级
                this.lowFpsCount = 0;
            }
        } else {
            this.lowFpsCount = 0;
        }

        this.lastTime = now - (delta % (this.frameInterval || 16.67)); // 💖 修正时间戳，保持平滑

        this.frameCount = (this.frameCount || 0) + 1; // 💖 帧数计数器
        // 💖 仅在调试模式或每秒更新一次 FPS
        if (now - (this.lastFpsTime || 0) >= 1000) { 
            const fps = Math.round((this.frameCount * 1000) / (now - (this.lastFpsTime || 0)));
            const fpsEl = document.getElementById('fps-display');
            if (fpsEl) fpsEl.innerText = `FPS: ${fps}`;
            this.frameCount = 0;
            this.lastFpsTime = now;
        }

        const t = now / 1000; // 💖 转换为秒
        if (this.group) this.group.position.y = Math.sin(t * 1) * 0.2; // 💖 上下浮动
        if (this.wL) this.wL.rotation.y = 0.3 + Math.sin(t * 2) * 0.3; // 💖 左翅膀扇动
        if (this.wR) this.wR.rotation.y = -0.3 - Math.sin(t * 2) * 0.3; // 💖 右翅膀扇动

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera); // 💖 执行渲染
        }
    }

    // =================================
    //  🎉 初始化交互 (无参数)
    //
    //  🎨 代码用途：
    //     绑定鼠标点击、右键旋转等事件监听器
    //
    //  💡 易懂解释：
    //     给小天使装上“触觉”！你点她、拖她、右键转她，她都会有反应哦~ 👆
    //
    //  ⚠️ 警告：
    //     右键事件被拦截用于旋转模型，所以在这个窗口上不会出现系统菜单。
    // =================================
    initInteraction() {
        this.ctx.on('system:speak', (msg) => this.showBubble(msg)); // 💖 监听系统说话事件
        
        // 💖 监听应用打开事件，自动播放欢迎语
        this.ctx.on('app:opened', (data) => {
            const msg = APP_OPEN_MESSAGES[data.id] || APP_OPEN_MESSAGES['default'];
            this.showBubble(msg);
        });

        // 阻止默认右键
        this.container.addEventListener('contextmenu', (e) => e.preventDefault()); // 💖 禁用默认右键菜单

        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 💖 左键点击
                // 🛑 如果点击的是聊天框内部，不要触发 toggleChat
                if (e.target.closest('#angel-chat')) return;
                
                this.toggleChat(); // 💖 切换聊天框显示
                // 拖拽逻辑由 WindowManager 全局接管，无需手动调用
            } else if (e.button === 2) { // 💖 右键点击
                this.handleRightClick(e); // 💖 处理旋转逻辑
            }
        });

        // 💖 绑定聊天框事件
        this.bindChatEvents();
    }

    // =================================
    //  🎉 绑定聊天事件
    // =================================
    bindChatEvents() {
        const input = document.getElementById('angel-input');
        const btnSend = document.getElementById('btn-send');
        const btnVoice = document.getElementById('btn-voice');
        const btnMute = document.getElementById('btn-mute'); // 💖 获取静音按钮

        if (!input || !btnSend || !btnVoice) return;

        // 发送按钮点击
        btnSend.addEventListener('click', () => this.handleSend());

        // 回车键发送
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });

        // 语音按钮点击
        btnVoice.addEventListener('click', () => this.toggleVoiceRecognition());

        // 静音按钮点击
        if (btnMute) {
            btnMute.addEventListener('click', () => this.toggleMute());
        }
    }

    // =================================
    //  🎉 切换静音状态
    // =================================
    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('angel_is_muted', this.isMuted); // 💾 保存状态
        this.updateMuteIcon();
        
        if (this.isMuted) {
            window.speechSynthesis.cancel(); // 立即停止发声
        } else {
            this.speak("语音功能已开启");
        }
    }

    // =================================
    //  🎉 更新静音图标
    // =================================
    updateMuteIcon() {
        const iconOn = document.getElementById('icon-sound-on');
        const iconOff = document.getElementById('icon-sound-off');
        
        if (this.isMuted) {
            if (iconOn) iconOn.style.display = 'none';
            if (iconOff) iconOff.style.display = 'block';
        } else {
            if (iconOn) iconOn.style.display = 'block';
            if (iconOff) iconOff.style.display = 'none';
        }
    }

    // =================================
    //  🎉 文字转语音 (TTS)
    // =================================
    speak(text) {
        if (this.isMuted || !window.speechSynthesis) return;

        // 停止之前的语音
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.1; // 💖 语速稍快，更活泼
        utterance.pitch = 1.5; // 💖 音调调高，模拟14岁少女声音

        // 尝试获取中文语音包
        const voices = window.speechSynthesis.getVoices();
        // 优先找包含 "Google" 或 "Microsoft" 的中文语音，通常质量好一点
        const zhVoice = voices.find(v => v.lang.includes('zh') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Xiaoxiao'))) || voices.find(v => v.lang.includes('zh'));
        
        if (zhVoice) {
            utterance.voice = zhVoice;
        }

        window.speechSynthesis.speak(utterance);
    }

    // =================================
    //  🎉 切换聊天框
    // =================================
    toggleChat() {
        const chatBox = document.getElementById('angel-chat');
        const input = document.getElementById('angel-input');
        
        if (chatBox) {
            chatBox.classList.toggle('active');
            if (chatBox.classList.contains('active')) {
                this.chat(); // 💖 打开时也说句话
                setTimeout(() => input && input.focus(), 100); // 💖 自动聚焦
            }
        }
    }

    // =================================
    //  🎉 处理发送逻辑
    // =================================
    handleSend() {
        const input = document.getElementById('angel-input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        // 💖 处理指令
        if (text === '重置' || text.toLowerCase() === 'reset') {
            this.showBubble("正在重置系统... 🔄");
            setTimeout(() => {
                localStorage.clear(); // 🧹 清空缓存
                location.reload(); // 🔄 刷新页面
            }, 1000);
            input.value = '';
            return;
        }

        // 💖 普通对话 (暂时只回显)
        this.showBubble(`收到：${text} (功能开发中...)`);
        input.value = '';
    }

    // =================================
    //  🎉 语音识别功能
    // =================================
    toggleVoiceRecognition() {
        const btnVoice = document.getElementById('btn-voice');
        const input = document.getElementById('angel-input');

        // 检查浏览器支持
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showBubble("抱歉，你的浏览器不支持语音识别 🎤");
            return;
        }

        if (this.isRecording) {
            // 停止录音
            if (this.recognition) this.recognition.stop();
            return;
        }

        // 开始录音
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'zh-CN'; // 设置语言为中文
        this.recognition.interimResults = false; // 不需要临时结果
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isRecording = true;
            btnVoice.classList.add('recording');
            this.showBubble("正在听你说... 👂");
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (input) {
                input.value = transcript;
                // 可选：自动发送
                // this.handleSend(); 
            }
        };

        this.recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            this.showBubble("没听清，请再说一遍 🙉");
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            btnVoice.classList.remove('recording');
        };

        this.recognition.start();
    }

    // =================================
    //  🎉 聊天功能 (无参数)
    //
    //  🎨 代码用途：
    //     随机选择一条台词并显示在气泡中
    //
    //  💡 易懂解释：
    //     小天使想跟你说话啦！随机挑一句甜甜的话讲给你听~ 🗣️
    //
    //  ⚠️ 警告：
    //     无
    // =================================
    chat() {
        const quote = ANGEL_QUOTES[Math.floor(Math.random() * ANGEL_QUOTES.length)]; // 💖 随机选取一句台词
        this.showBubble(quote); // 💖 显示气泡
    }

    // =================================
    //  🎉 显示气泡 (文本内容)
    //
    //  🎨 代码用途：
    //     更新气泡 DOM 的文本内容并控制其显示/隐藏动画
    //
    //  💡 易懂解释：
    //     把想说的话写在头顶的小气泡里，过几秒钟自动消失，像漫画一样！💭
    //
    //  ⚠️ 警告：
    //     如果上一个气泡还没消失，新的会直接覆盖它，并重置定时器。
    // =================================
    showBubble(text) {
        const b = document.getElementById('angel-speech'); // 💖 获取气泡元素
        if (b) {
            b.innerText = text; // 💖 设置文本
            b.classList.add('show'); // 💖 添加显示类（触发 CSS 动画）
            if (this.timer) this.ctx.clearTimeout(this.timer); // 💖 清除上一次的定时器
            this.timer = this.ctx.setTimeout(() => b.classList.remove('show'), 4000); // 💖 4秒后自动隐藏
            
            // 💖 播放语音
            this.speak(text);
        }
    }

    // =================================
    //  🎉 处理右键旋转 (鼠标事件对象)
    //
    //  🎨 代码用途：
    //     实现鼠标右键拖拽旋转模型的功能
    //
    //  💡 易懂解释：
    //     按住右键拖动，就可以360度无死角欣赏小天使啦！转转转~ 🔄
    //
    //  ⚠️ 警告：
    //     一定要记得移除 mousemove 和 mouseup 监听器，否则鼠标松开后还会一直转！
    // =================================
    handleRightClick(e) {
        e.preventDefault(); // 💖 阻止默认行为
        e.stopPropagation(); // 💖 防止冒泡到窗口管理器
        this.state.r = true; // 💖 标记为正在旋转
        this.state.sx = e.clientX; // 💖 记录起始 X 坐标
        if (this.group) this.state.ir = this.group.rotation.y; // 💖 记录初始旋转角度

        const rotate = (ev) => {
            if (this.state.r && this.group) {
                this.group.rotation.y = this.state.ir + (ev.clientX - this.state.sx) * 0.01; // 💖 根据鼠标移动距离计算旋转角度
            }
        };

        const stop = () => {
            this.state.r = false; // 💖 停止旋转
            document.removeEventListener('mousemove', rotate); // 💖 移除监听器
            document.removeEventListener('mouseup', stop); // 💖 移除监听器
        };

        document.addEventListener('mousemove', rotate); // 💖 监听鼠标移动
        document.addEventListener('mouseup', stop); // 💖 监听鼠标松开
    }
}

export const app = new AngelApp();
