import { bus } from '../event_bus.js';
import { wm } from '../window_manager.js';

export const config = {
    id: 'win-companion',
    name: 'Seraphim',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
    color: '#ff7675',
    pos: { x: window.innerWidth - 320, y: 100 }, // 默认在右侧
    winPos: { x: window.innerWidth - 320, y: 100 },
    openMsg: "Seraphim 已上线，随时待命！✨",
    // 这是一个特殊的“透明”窗口，我们通过 CSS 覆盖默认样式
    content: `
        <div id="angel-container" style="width:100%; height:100%; position:relative;">
            <div id="angel-scene" style="width:100%; height:100%;"></div>
            <div id="angel-speech" class="speech-bubble" style="position:absolute; top:-60px; left:50%; transform:translateX(-50%); width:200px; pointer-events:none; opacity:0; transition:opacity 0.3s;">...</div>
        </div>
        <style>
            /* 特殊样式：让这个窗口背景透明，去掉边框和阴影 */
            #win-companion {
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
            }
            #win-companion .title-bar {
                display: none !important; /* 隐藏标题栏 */
            }
            #win-companion .window-content {
                background: transparent !important;
                overflow: visible !important; /* 允许气泡溢出 */
            }
            /* 气泡样式 */
            .speech-bubble {
                background: white;
                border-radius: 15px;
                padding: 10px 15px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                font-size: 14px;
                color: #333;
                text-align: center;
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

// ---------------------------------------------------------------- //
//  小天使台词库
// ---------------------------------------------------------------- //
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
    constructor() {
        this.id = config.id;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.group = null;
        this.timer = null;
        this.wL = null;
        this.wR = null;
        this.state = { r: false, sx: 0, ir: 0 };

        // 绑定 animate
        this.animate = this.animate.bind(this);

        // 监听窗口就绪事件
        bus.on(`app:ready:${this.id}`, () => this.init());
    }

    init() {
        // 获取容器
        this.container = document.getElementById('angel-scene');
        if (!this.container) return;

        // 检查 THREE.js
        if (!window.THREE) {
            console.error("THREE.js not loaded!");
            return;
        }

        const w = this.container.clientWidth || 300;
        const h = this.container.clientHeight || 400;

        // 1. 创建场景
        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 10);
        this.scene.add(dirLight);

        // 2. 创建相机
        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        this.camera.position.set(0, 1, 10);

        // 3. 创建渲染器
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: window.devicePixelRatio <= 1,
            powerPreference: "high-performance",
            precision: "mediump"
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(w, h);
        this.container.appendChild(this.renderer.domElement);

        // 4. 构建模型
        this.buildModel();

        // 5. 初始化交互
        this.initInteraction();

        // 6. 开始动画
        this.animate();
        
        // 7. 自动打开窗口 (如果还没打开)
        // 注意：因为这是个“桌面挂件”，我们希望它默认就是打开的
        // 但 WindowManager 可能已经根据 store 状态打开了它
    }

    buildModel() {
        this.group = new THREE.Group();
        const matSkin = new THREE.MeshLambertMaterial({ color: 0xffe0bd });
        const matDress = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const matHair = new THREE.MeshLambertMaterial({ color: 0xffb6c1 });
        const matEye = new THREE.MeshBasicMaterial({ color: 0x20c997 });
        const matWing = new THREE.MeshLambertMaterial({ color: 0xcceeff, transparent: true, opacity: 0.8 });
        const matGold = new THREE.MeshBasicMaterial({ color: 0xffd700 });

        const box = (w, h, d, mat, x, y, z) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            return m;
        };

        // Head
        const head = new THREE.Group();
        head.position.y = 1.4;
        head.add(box(1, 0.9, 0.9, matSkin, 0, 0, 0));
        head.add(box(1.1, 0.8, 0.6, matHair, 0, 0.2, -0.3));
        head.add(box(1.1, 0.3, 1.0, matHair, 0, 0.55, 0));
        head.add(box(0.2, 0.7, 0.2, matHair, -0.5, 0.1, 0.4));
        head.add(box(0.2, 0.7, 0.2, matHair, 0.5, 0.1, 0.4));
        head.add(box(0.15, 0.15, 0.05, matEye, -0.25, -0.1, 0.46));
        head.add(box(0.15, 0.15, 0.05, matEye, 0.25, -0.1, 0.46));
        head.add(box(0.3, 1.8, 0.3, matHair, -0.7, -0.5, 0));
        head.add(box(0.3, 1.8, 0.3, matHair, 0.7, -0.5, 0));
        this.group.add(head);

        // Body
        this.group.add(box(0.8, 0.8, 0.5, matDress, 0, 0.6, 0));
        this.group.add(box(1.0, 0.4, 0.6, matDress, 0, 0.1, 0));

        // Legs
        const legs = new THREE.Group();
        legs.position.y = -0.5;
        legs.add(box(0.25, 0.8, 0.25, matSkin, -0.2, 0, 0));
        legs.add(box(0.25, 0.8, 0.25, matSkin, 0.2, 0, 0));
        this.group.add(legs);

        // Arms
        this.group.add(box(0.2, 0.7, 0.2, matSkin, -0.5, 0.6, 0));
        this.group.add(box(0.2, 0.7, 0.2, matSkin, 0.5, 0.6, 0));

        // Wings
        this.wL = new THREE.Group();
        this.wL.add(box(0.8, 0.3, 0.1, matWing, -0.5, 0, 0));
        this.wL.position.set(-0.3, 0.8, -0.3);
        this.wR = new THREE.Group();
        this.wR.add(box(0.8, 0.3, 0.1, matWing, 0.5, 0, 0));
        this.wR.position.set(0.3, 0.8, -0.3);
        this.group.add(this.wL);
        this.group.add(this.wR);

        // Halo
        this.group.add(box(1, 0.05, 1, matGold, 0, 2.2, 0));

        this.scene.add(this.group);
    }

    animate() {
        requestAnimationFrame(this.animate);

        const now = performance.now();
        if (!this.lastTime) this.lastTime = now;
        const delta = now - this.lastTime;
        this.frameCount = (this.frameCount || 0) + 1;
        if (delta >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / delta);
            const fpsEl = document.getElementById('fps-display');
            if (fpsEl) fpsEl.innerText = `FPS: ${fps}`;
            this.frameCount = 0;
            this.lastTime = now;
        }

        const t = now / 1000;
        if (this.group) this.group.position.y = Math.sin(t * 1) * 0.2;
        if (this.wL) this.wL.rotation.y = 0.3 + Math.sin(t * 2) * 0.3;
        if (this.wR) this.wR.rotation.y = -0.3 - Math.sin(t * 2) * 0.3;

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    initInteraction() {
        bus.on('system:speak', (msg) => this.showBubble(msg));

        // 阻止默认右键
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());

        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.chat();
                
                // 手动触发窗口拖拽
                // 因为我们隐藏了标题栏，所以需要在这里手动调用 WindowManager 的拖拽逻辑
                const win = document.getElementById(this.id);
                if (win) {
                    wm.startDrag(e, win, 'window');
                }
            } else if (e.button === 2) {
                this.handleRightClick(e);
            }
        });
    }

    chat() {
        const quote = ANGEL_QUOTES[Math.floor(Math.random() * ANGEL_QUOTES.length)];
        this.showBubble(quote);
    }

    showBubble(text) {
        const b = document.getElementById('angel-speech');
        if (b) {
            b.innerText = text;
            b.classList.add('show');
            if (this.timer) clearTimeout(this.timer);
            this.timer = setTimeout(() => b.classList.remove('show'), 4000);
        }
    }

    handleRightClick(e) {
        e.preventDefault();
        e.stopPropagation(); // 防止冒泡到窗口管理器
        this.state.r = true;
        this.state.sx = e.clientX;
        if (this.group) this.state.ir = this.group.rotation.y;

        const rotate = (ev) => {
            if (this.state.r && this.group) {
                this.group.rotation.y = this.state.ir + (ev.clientX - this.state.sx) * 0.01;
            }
        };

        const stop = () => {
            this.state.r = false;
            document.removeEventListener('mousemove', rotate);
            document.removeEventListener('mouseup', stop);
        };

        document.addEventListener('mousemove', rotate);
        document.addEventListener('mouseup', stop);
    }
}

export const app = new AngelApp();
