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
    description: '智能伴侣',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
    color: '#ff7675',
    pos: { x: window.innerWidth - 320, y: 100 }, // 💖 默认出生在屏幕右侧，不挡视线
    winPos: { x: window.innerWidth - 320, y: 100 },
    isOpen: true, // 💖 默认打开小天使窗口
    openMsg: "Seraphim 已上线，随时待命！✨",
    // 💖 这是一个特殊的“透明”窗口，我们通过 CSS 覆盖默认样式
    content: `
        <div id="angel-container" style="width:100%; height:100%; position:relative;">
            <div id="angel-scene" style="width:100%; height:100%;"></div>
            <div id="angel-speech" class="speech-bubble" style="position:absolute; top:-60px; left:50%; transform:translateX(-50%); width:200px; pointer-events:none; opacity:0; transition:opacity 0.3s;">...</div>
        </div>
        <style>
            /* 💖 特殊样式：让这个窗口背景透明，去掉边框和阴影 */
            #win-companion {
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
            }
            #win-companion .title-bar {
                display: none !important; /* 💖 隐藏标题栏，让它看起来像悬浮在桌面上 */
            }
            #win-companion .window-content {
                background: transparent !important;
                overflow: visible !important; /* 💖 允许气泡溢出窗口边界 */
            }
            /* 💖 气泡样式 */
            .speech-bubble {
                background: white;
                border-radius: 15px;
                padding: 10px 15px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                font-size: 14px;
                color: #333;
                text-align: center;
                z-index: 1000;
            }
            .speech-bubble::after {
                content: '';
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                border-width: 10px 10px 0;
                border-style: solid;
                border-color: white transparent transparent transparent;
            }
            .speech-bubble.show {
                opacity: 1 !important;
            }
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
    "我是你的专属小天使 Seraphim~ ✨",
    "今天也要加油哦！(ง •_•)ง",
    "正在监控网络流量... 一切正常！📊",
    "你可以拖拽我哦~ 别转晕我就行 😵",
    "右键点击我可以旋转视角查看背面哦 🔄",
    "双击桌面图标可以打开应用 📱",
    "累了吗？休息一下吧 ☕",
    "我在听，请吩咐~ 👂"
];

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

        // 绑定 animate
        this.animate = this.animate.bind(this);

        // 监听窗口就绪事件
        this.ctx.on(`app:ready:${this.id}`, () => this.init());

        // 注册清理函数
        this.ctx.onCleanup(() => this.onDestroy());
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
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); // alpha: true 允许背景透明
        // 确保容器有尺寸
        const width = this.container.clientWidth || 300;
        const height = this.container.clientHeight || 400;
        this.renderer.setSize(width, height);
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

        // 启动动画循环
        this.isRunning = true;
        this.animate();

        // 💖 显示欢迎语
        this.showBubble(config.openMsg);
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
        this.group.scale.set(0.7, 0.7, 0.7); // 💖 缩小模型尺寸
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
        this.wL = new THREE.Group(); // 💖 左翅膀组
        this.wL.add(box(0.8, 0.3, 0.1, matWing, -0.5, 0, 0));
        this.wL.position.set(-0.3, 0.8, -0.3);
        this.wR = new THREE.Group(); // 💖 右翅膀组
        this.wR.add(box(0.8, 0.3, 0.1, matWing, 0.5, 0, 0));
        this.wR.position.set(0.3, 0.8, -0.3);
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
        this.frameCount = (this.frameCount || 0) + 1; // 💖 帧数计数器
        if (delta >= 1000) { // 💖 每秒更新一次 FPS
            const fps = Math.round((this.frameCount * 1000) / delta);
            const fpsEl = document.getElementById('fps-display');
            if (fpsEl) fpsEl.innerText = `FPS: ${fps}`;
            this.frameCount = 0;
            this.lastTime = now;
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

        // 阻止默认右键
        this.container.addEventListener('contextmenu', (e) => e.preventDefault()); // 💖 禁用默认右键菜单

        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 💖 左键点击
                this.chat(); // 💖 触发对话
                // 拖拽逻辑由 WindowManager 全局接管，无需手动调用
            } else if (e.button === 2) { // 💖 右键点击
                this.handleRightClick(e); // 💖 处理旋转逻辑
            }
        });
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
