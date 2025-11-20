import { bus } from './event_bus.js';
import { ANGEL_QUOTES } from './config.js';

export class Angel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.group = null;
        this.timer = null;

        // 翅膀部件
        this.wL = null;
        this.wR = null;

        // 交互状态
        this.state = { r: false, sx: 0, ir: 0 };

        this.animate = this.animate.bind(this);
    }

    init() {
        if (!window.THREE) {
            console.error("THREE.js not loaded!");
            return;
        }
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;

        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 10);
        this.scene.add(dirLight);

        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        this.camera.position.set(0, 1, 10);

        // 性能优化的渲染器配置
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: window.devicePixelRatio <= 1, // 高DPI屏幕关闭抗锯齿以提升性能
            powerPreference: "high-performance",      // 强制使用高性能GPU
            precision: "mediump"                      // 中等精度足够,降低GPU负载
        });
        // 限制像素比,避免在高DPI屏幕上过度渲染
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(w, h);
        this.container.appendChild(this.renderer.domElement);

        this.buildModel();
        this.initInteraction();
        this.animate();
    }

    // === 修复点：补全所有 3D 建模代码 ===
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

        // 1. 头部 (Head)
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

        // 2. 身体 (Body)
        this.group.add(box(0.8, 0.8, 0.5, matDress, 0, 0.6, 0));
        this.group.add(box(1.0, 0.4, 0.6, matDress, 0, 0.1, 0));

        // 3. 腿部 (Legs)
        const legs = new THREE.Group();
        legs.position.y = -0.5;
        legs.add(box(0.25, 0.8, 0.25, matSkin, -0.2, 0, 0));
        legs.add(box(0.25, 0.8, 0.25, matSkin, 0.2, 0, 0));
        this.group.add(legs);

        // 4. 手臂 (Arms)
        this.group.add(box(0.2, 0.7, 0.2, matSkin, -0.5, 0.6, 0));
        this.group.add(box(0.2, 0.7, 0.2, matSkin, 0.5, 0.6, 0));

        // 5. 翅膀 (Wings)
        this.wL = new THREE.Group();
        this.wL.add(box(0.8, 0.3, 0.1, matWing, -0.5, 0, 0));
        this.wL.position.set(-0.3, 0.8, -0.3);

        this.wR = new THREE.Group();
        this.wR.add(box(0.8, 0.3, 0.1, matWing, 0.5, 0, 0));
        this.wR.position.set(0.3, 0.8, -0.3);

        this.group.add(this.wL);
        this.group.add(this.wR);

        // 6. 光环 (Halo)
        this.group.add(box(1, 0.05, 1, matGold, 0, 2.2, 0));

        this.scene.add(this.group);
    }

    animate() {
        requestAnimationFrame(this.animate);

        // FPS Calculation
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

        // 简单的右键旋转交互
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());
        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.chat();
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