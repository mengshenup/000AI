import { bus } from './event_bus.js'; // 导入事件总线，用于组件间通信
import { ANGEL_QUOTES } from './config.js'; // 导入小天使的台词配置

export class Angel {
    // ---------------------------------------------------------------- //
    //  天使类(容器ID)
    //
    //  函数用处：
    //     定义了3D小天使角色的所有行为、外观和交互逻辑。
    //
    //  易懂解释：
    //     这是小天使的“灵魂”和“身体”蓝图。它告诉电脑小天使长什么样、怎么动、以及怎么和你说话。
    //
    //  警告：
    //     依赖 THREE.js 库，必须确保 index.html 中已加载 three.min.js。
    // ---------------------------------------------------------------- //
    constructor(containerId) {
        // 获取 HTML 中用于放置 3D 场景的容器元素
        this.container = document.getElementById(containerId);
        // 初始化场景变量，稍后会在 init() 中赋值
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.group = null; // 用于把小天使的所有身体部件打组，方便一起移动
        this.timer = null; // 用于气泡显示的定时器

        // 翅膀部件，需要单独引用以便在动画中让它们扇动
        this.wL = null; // 左翅膀
        this.wR = null; // 右翅膀

        // 交互状态记录
        this.state = {
            r: false, // rotating: 是否正在被鼠标右键拖拽旋转
            sx: 0,    // start x: 拖拽开始时的鼠标 X 坐标
            ir: 0     // initial rotation: 拖拽开始时小天使的初始角度
        };

        // 绑定 animate 函数的 this 指向，防止在 requestAnimationFrame 中丢失上下文
        this.animate = this.animate.bind(this);
    }

    init() {
        // ---------------------------------------------------------------- //
        //  初始化()
        //
        //  函数用处：
        //     设置 3D 场景、相机、灯光、渲染器，并构建模型和启动动画循环。
        //
        //  易懂解释：
        //     就像是在搭舞台。先把灯光打好，摄像机架好，然后把演员（小天使）请上台，最后喊“Action”开始表演。
        //
        //  警告：
        //     如果 THREE.js 没加载，这里会报错并直接退出。
        // ---------------------------------------------------------------- //

        // 检查 THREE.js 库是否已加载
        if (!window.THREE) {
            // 如果没加载，打印错误日志
            console.error("THREE.js not loaded!");
            return; // 退出函数，无法继续
        }
        // 获取容器的宽度
        const w = this.container.clientWidth;
        // 获取容器的高度
        const h = this.container.clientHeight;

        // 创建一个新的 3D 场景
        this.scene = new THREE.Scene();
        // 添加环境光，让场景整体亮起来，不会有死黑
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        // 创建平行光，模拟太阳光，产生阴影和立体感
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        // 设置光源位置
        dirLight.position.set(5, 10, 10);
        // 把光源加入场景
        this.scene.add(dirLight);

        // 创建透视相机 (视角, 长宽比, 近裁剪面, 远裁剪面)
        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        // 设置相机位置 (x, y, z)，让它稍微往后退一点，能看到小天使全身
        this.camera.position.set(0, 1, 10);

        // ---------------------------------------------------------------- //
        //  渲染器配置()
        //
        //  函数用处：
        //     创建 WebGL 渲染器，负责把 3D 场景画到屏幕上。
        //
        //  易懂解释：
        //     这是负责画画的画家。我们告诉他要画在透明背景上，而且要画得快一点（高性能模式）。
        // ---------------------------------------------------------------- //
        this.renderer = new THREE.WebGLRenderer({
            alpha: true, // 允许背景透明，这样小天使就可以浮在网页上
            antialias: window.devicePixelRatio <= 1, // 如果是普通屏幕就开启抗锯齿，高清屏关闭以节省性能
            powerPreference: "high-performance",      // 告诉浏览器尽量用独立显卡
            precision: "mediump"                      // 使用中等精度计算，在手机或低端机上更流畅
        });
        // 限制像素比，防止在 4K 屏上渲染压力过大，最高只渲染 1.5 倍清晰度
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        // 设置渲染尺寸填满容器
        this.renderer.setSize(w, h);
        // 把渲染出来的画布 (canvas) 放到 HTML 容器里
        this.container.appendChild(this.renderer.domElement);

        // 开始搭建小天使的模型
        this.buildModel();
        // 初始化鼠标交互事件
        this.initInteraction();
        // 开始动画循环
        this.animate();
    }

    buildModel() {
        // ---------------------------------------------------------------- //
        //  构建模型()
        //
        //  函数用处：
        //     使用基础几何体（方块）拼凑出小天使的身体结构。
        //
        //  易懂解释：
        //     就像玩“我的世界” (Minecraft) 或者搭积木。用一个个小方块拼出头、身体、手、脚和翅膀。
        //
        //  警告：
        //     这里涉及很多坐标调整，改动数值会导致身体部件错位。
        // ---------------------------------------------------------------- //

        // 创建一个组，把所有身体部件都放进去，方便整体移动
        this.group = new THREE.Group();

        // 定义各种材质（皮肤、衣服、头发、眼睛、翅膀、光环）
        const matSkin = new THREE.MeshLambertMaterial({ color: 0xffe0bd }); // 肤色
        const matDress = new THREE.MeshLambertMaterial({ color: 0xffffff }); // 白裙子
        const matHair = new THREE.MeshLambertMaterial({ color: 0xffb6c1 }); // 粉头发
        const matEye = new THREE.MeshBasicMaterial({ color: 0x20c997 });    // 绿眼睛
        const matWing = new THREE.MeshLambertMaterial({ color: 0xcceeff, transparent: true, opacity: 0.8 }); // 半透明翅膀
        const matGold = new THREE.MeshBasicMaterial({ color: 0xffd700 });   // 金色光环

        // 辅助函数：快速创建一个长方体
        const box = (w, h, d, mat, x, y, z) => {
            // 创建几何体
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            // 设置位置
            m.position.set(x, y, z);
            return m; // 返回做好的方块
        };

        // 1. 头部 (Head)
        const head = new THREE.Group(); // 头部也是一个组
        head.position.y = 1.4; // 头部整体抬高
        head.add(box(1, 0.9, 0.9, matSkin, 0, 0, 0)); // 脸
        head.add(box(1.1, 0.8, 0.6, matHair, 0, 0.2, -0.3)); // 后脑勺头发
        head.add(box(1.1, 0.3, 1.0, matHair, 0, 0.55, 0));   // 头顶头发
        head.add(box(0.2, 0.7, 0.2, matHair, -0.5, 0.1, 0.4)); // 左鬓角
        head.add(box(0.2, 0.7, 0.2, matHair, 0.5, 0.1, 0.4));  // 右鬓角
        head.add(box(0.15, 0.15, 0.05, matEye, -0.25, -0.1, 0.46)); // 左眼
        head.add(box(0.15, 0.15, 0.05, matEye, 0.25, -0.1, 0.46));  // 右眼
        head.add(box(0.3, 1.8, 0.3, matHair, -0.7, -0.5, 0)); // 左双马尾
        head.add(box(0.3, 1.8, 0.3, matHair, 0.7, -0.5, 0));  // 右双马尾
        this.group.add(head); // 把头装到身体组里

        // 2. 身体 (Body)
        this.group.add(box(0.8, 0.8, 0.5, matDress, 0, 0.6, 0)); // 上半身
        this.group.add(box(1.0, 0.4, 0.6, matDress, 0, 0.1, 0)); // 裙摆

        // 3. 腿部 (Legs)
        const legs = new THREE.Group();
        legs.position.y = -0.5; // 腿部位置下移
        legs.add(box(0.25, 0.8, 0.25, matSkin, -0.2, 0, 0)); // 左腿
        legs.add(box(0.25, 0.8, 0.25, matSkin, 0.2, 0, 0));  // 右腿
        this.group.add(legs);

        // 4. 手臂 (Arms)
        this.group.add(box(0.2, 0.7, 0.2, matSkin, -0.5, 0.6, 0)); // 左臂
        this.group.add(box(0.2, 0.7, 0.2, matSkin, 0.5, 0.6, 0));  // 右臂

        // 5. 翅膀 (Wings)
        this.wL = new THREE.Group(); // 左翅膀组
        this.wL.add(box(0.8, 0.3, 0.1, matWing, -0.5, 0, 0)); // 翅膀主体
        this.wL.position.set(-0.3, 0.8, -0.3); // 设置左翅膀根部位置

        this.wR = new THREE.Group(); // 右翅膀组
        this.wR.add(box(0.8, 0.3, 0.1, matWing, 0.5, 0, 0)); // 翅膀主体
        this.wR.position.set(0.3, 0.8, -0.3); // 设置右翅膀根部位置

        this.group.add(this.wL); // 装上左翅膀
        this.group.add(this.wR); // 装上右翅膀

        // 6. 光环 (Halo)
        this.group.add(box(1, 0.05, 1, matGold, 0, 2.2, 0)); // 头顶的光环

        // 最后把整个小天使组加入场景
        this.scene.add(this.group);
    }

    animate() {
        // ---------------------------------------------------------------- //
        //  动画循环()
        //
        //  函数用处：
        //     每一帧调用一次，更新模型位置（悬浮、扇翅膀）并重新渲染画面。
        //
        //  易懂解释：
        //     这是动画片的“播放键”。它每秒钟刷新 60 次，每次都让小天使动一点点，看起来就像活了一样。
        //
        //  警告：
        //     这个函数运行频率很高，不要在这里写太复杂的计算，否则电脑会卡。
        // ---------------------------------------------------------------- //

        // 请求浏览器在下一帧再次调用此函数，形成死循环
        requestAnimationFrame(this.animate);

        // FPS 计算逻辑 (Frame Per Second)
        const now = performance.now(); // 获取当前精确时间
        if (!this.lastTime) this.lastTime = now; // 初始化上次时间
        const delta = now - this.lastTime; // 计算两帧之间的时间差
        this.frameCount = (this.frameCount || 0) + 1; // 帧数加一
        if (delta >= 1000) { // 如果累计时间超过 1 秒
            const fps = Math.round((this.frameCount * 1000) / delta); // 计算 FPS
            const fpsEl = document.getElementById('fps-display'); // 获取显示 FPS 的 HTML 元素
            if (fpsEl) fpsEl.innerText = `FPS: ${fps}`; // 更新界面文字
            this.frameCount = 0; // 重置帧数
            this.lastTime = now; // 重置时间
        }

        // 动画逻辑
        const t = now / 1000; // 把毫秒转换成秒
        // 让身体上下浮动 (正弦波)
        if (this.group) this.group.position.y = Math.sin(t * 1) * 0.2;
        // 让左翅膀扇动
        if (this.wL) this.wL.rotation.y = 0.3 + Math.sin(t * 2) * 0.3;
        // 让右翅膀扇动 (反向)
        if (this.wR) this.wR.rotation.y = -0.3 - Math.sin(t * 2) * 0.3;

        // 渲染画面
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    initInteraction() {
        // ---------------------------------------------------------------- //
        //  初始化交互()
        //
        //  函数用处：
        //     绑定鼠标点击、右键旋转等事件，以及监听系统说话指令。
        //
        //  易懂解释：
        //     给小天使装上“耳朵”和“触觉”。让她能听到系统指令说话，也能感觉到你用鼠标摸她。
        // ---------------------------------------------------------------- //

        // 监听 'system:speak' 事件，如果收到就显示气泡
        bus.on('system:speak', (msg) => this.showBubble(msg));

        // 阻止默认的右键菜单，因为我们要用右键来旋转模型
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());

        // 监听鼠标按下事件
        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                // 如果是左键 (0)，触发对话
                this.chat();
            } else if (e.button === 2) {
                // 如果是右键 (2)，开始处理旋转
                this.handleRightClick(e);
            }
        });
    }

    chat() {
        // ---------------------------------------------------------------- //
        //  聊天()
        //
        //  函数用处：
        //     随机选择一句台词并显示。
        //
        //  易懂解释：
        //     戳一下小天使，她就随机说一句话。
        // ---------------------------------------------------------------- //

        // 从台词列表中随机挑一句
        const quote = ANGEL_QUOTES[Math.floor(Math.random() * ANGEL_QUOTES.length)];
        // 显示气泡
        this.showBubble(quote);
    }

    showBubble(text) {
        // ---------------------------------------------------------------- //
        //  显示气泡(文本内容)
        //
        //  函数用处：
        //     在小天使头顶显示一个包含文本的对话框，几秒后自动消失。
        //
        //  易懂解释：
        //     就像漫画书里的对话气泡。
        // ---------------------------------------------------------------- //

        // 获取气泡的 HTML 元素
        const b = document.getElementById('angel-speech');
        if (b) {
            // 设置文字内容
            b.innerText = text;
            // 添加 'show' 类名，触发 CSS 的淡入动画
            b.classList.add('show');
            // 如果之前有定时器，先清除，防止旧的定时器把新消息关掉了
            if (this.timer) clearTimeout(this.timer);
            // 设置新的定时器，4秒后移除 'show' 类名，气泡消失
            this.timer = setTimeout(() => b.classList.remove('show'), 4000);
        }
    }

    handleRightClick(e) {
        // ---------------------------------------------------------------- //
        //  处理右键点击(鼠标事件对象)
        //
        //  函数用处：
        //     实现鼠标右键拖拽旋转小天使的功能。
        //
        //  易懂解释：
        //     按住右键左右拖动，可以把小天使转个圈，看看她的背面。
        // ---------------------------------------------------------------- //

        e.preventDefault(); // 再次确保不弹出菜单
        this.state.r = true; // 标记为正在旋转
        this.state.sx = e.clientX; // 记录鼠标按下的 X 坐标
        if (this.group) this.state.ir = this.group.rotation.y; // 记录小天使当前的旋转角度

        // 定义旋转函数
        const rotate = (ev) => {
            // 只有在标记为旋转且模型存在时才执行
            if (this.state.r && this.group) {
                // 新角度 = 初始角度 + (鼠标移动距离 * 灵敏度系数)
                this.group.rotation.y = this.state.ir + (ev.clientX - this.state.sx) * 0.01;
            }
        };

        // 定义停止旋转函数
        const stop = () => {
            this.state.r = false; // 取消旋转标记
            // 移除鼠标移动监听
            document.removeEventListener('mousemove', rotate);
            // 移除鼠标松开监听
            document.removeEventListener('mouseup', stop);
        };

        // 在 document 上监听移动和松开，这样即使鼠标移出了小天使范围也能正常处理
        document.addEventListener('mousemove', rotate);
        document.addEventListener('mouseup', stop);
    }
}