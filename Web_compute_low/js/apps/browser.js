/* ==========================================================================
   📃 文件功能 : 探索之窗 (浏览器) 应用逻辑
   ⚡ 逻辑摘要 : 管理浏览器窗口的 UI、事件绑定、远程控制交互及视频流显示
   💡 易懂解释 : 这是小天使的眼睛！👀 负责把服务器看到的画面展示给你，还把你的鼠标操作传回去。
   🔋 未来扩展 : 支持多标签页，支持本地书签管理
   📊 当前状态 : 活跃 (更新: 2025-12-03)
   🧱 browser.js 踩坑记录 :
      1. [2025-12-03] [已修复] 点击黑色区域不推流: init 和 mousedown 时强制发送 stream_control: start (Line 180, 280)
   ========================================================================== */
export const config = {
    // =================================
    //  🎉 浏览器配置 (Browser Config)
    //
    //  🎨 代码用途：
    //     定义“探索之窗”浏览器的基础元数据和界面结构。
    //
    //  💡 易懂解释：
    //     这是小天使的“望远镜”！通过它，你可以看到服务器那边的网页，还能远程操控哦~ 🔭
    //
    //  ⚠️ 警告：
    //     HTML 结构中的 ID（如 browser-url, btn-browser-go）被 JS 逻辑强依赖，修改时请同步更新 JS 代码。
    // =================================
    id: 'win-angel', // 💖 窗口的唯一标识符，用于 WindowManager 识别
    name: '探索之窗', // 💖 窗口标题栏显示的名称
    version: '1.2.0', // 🆕 版本号
    description: '连接无限可能的数字世界', // 💖 功能描述
    icon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z', // 💖 SVG 图标路径（眼睛形状）
    color: '#6c5ce7', // 💖 窗口的主题颜色（紫色）
    pos: { x: 20, y: 110 }, // 💖 桌面图标的默认位置
    winPos: { x: 400, y: 100 }, // 💖 窗口打开时的默认屏幕坐标
    width: 800, // 💖 窗口默认宽度
    height: 600, // 💖 窗口默认高度
    resizable: true, // 💖 允许用户调整窗口大小
    // openMsg: "探索之窗已开启，准备好发现新世界了吗？🌍", // 💖 已移除，统一由 angel.js 管理
    content: `
        <!-- 💖 浏览器地址栏容器 -->
        <div style="padding:8px; background:#f1f2f6; display:flex; flex-direction:column; gap:8px; border-bottom:1px solid #ddd;">
            <div style="display:flex; gap:8px;">
                <!-- 💖 导航按钮 -->
                <button id="btn-browser-back" style="padding:4px 8px; cursor:pointer;" title="后退">⬅️</button>
                <button id="btn-browser-forward" style="padding:4px 8px; cursor:pointer;" title="前进">➡️</button>
                <button id="btn-browser-refresh" style="padding:4px 8px; cursor:pointer;" title="刷新">🔄</button>
                
                <!-- 💖 网址输入框 -->
                <input type="text" id="browser-url" placeholder="https://www.douyin.com/"
                    style="flex:1; padding:4px 8px; border:1px solid #ccc; border-radius:4px;">
                <!-- 💖 前往按钮 -->
                <button id="btn-browser-go" style="padding:4px 12px; cursor:pointer;">前往</button>
                <!-- 💖 重连按钮 (新增) -->
                <button id="btn-browser-reconnect" style="padding:4px 8px; cursor:pointer; color:red;" title="强制重连直播流">🔌</button>
                <!-- 💖 验证码按钮 (新增) -->
                <button id="btn-browser-captcha" style="padding:4px 8px; cursor:pointer; color:orange;" title="AI 解决验证码">🧩</button>
            </div>
            
            <!-- 💖 智能任务栏 (AI Task Bar) -->
            <div style="display:flex; gap:8px; align-items:center;">
                <span style="font-size:14px;">🤖</span>
                <input type="text" id="browser-task-input" placeholder="告诉 Angel 你想做什么... (例如: 去淘宝买个手机)"
                    style="flex:1; padding:4px 8px; border:1px solid #a29bfe; border-radius:4px; background:#f8f9fa;">
                <button id="btn-browser-task"
                    style="padding:4px 12px; cursor:pointer; background:var(--primary-color); color:white; border:none; border-radius:4px;">执行任务</button>
            </div>

            <!-- 💖 性能控制栏 -->
            <div style="display:flex; gap:8px; align-items:center; font-size:12px; color:#666;">
                <span>画质:</span>
                <select id="sel-quality" style="padding:2px;">
                    <option value="high" selected>高清 (High)</option>
                    <option value="medium">均衡 (Medium)</option>
                    <option value="low">省流 (Low)</option>
                </select>
                <span style="margin-left:8px;">帧率:</span>
                <select id="sel-fps" style="padding:2px;">
                    <option value="30">30 FPS</option>
                    <option value="15" selected>15 FPS</option>
                    <option value="5">5 FPS</option>
                    <option value="1">1 FPS</option>
                </select>
            </div>
        </div>

        <!-- 💖 浏览器内容显示区域 -->
        <div style="flex:1; position:relative; background:black;">
            <!-- 💖 实时画面显示组件 (默认隐藏，有数据时显示) -->
            <img id="live-image" style="width:100%; height:100%; object-fit:contain; display:none;" />
            
            <!-- 💖 状态提示遮罩 (Status Overlay) -->
            <div id="browser-status-overlay" 
                style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); 
                       background:rgba(0,0,0,0.6); color:white; padding:4px 12px; border-radius:12px; 
                       font-size:12px; pointer-events:none; transition: opacity 0.3s;">
                💤 Agent Waiting...
            </div>

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

import { bus } from '../system/event_bus.js'; // 💖 导入事件总线，用于模块间通信
import { network } from '../system/network.js'; // 💖 导入网络模块，用于与服务器通信
import { wm } from '../system/window_manager.js'; // 💖 导入窗口管理器，用于控制窗口行为

class BrowserApp {
    // =================================
    //  🎉 浏览器应用类 (Browser App) (无参数)
    //
    //  🎨 代码用途：
    //     管理“观察眼”APP的业务逻辑，包括地址栏导航、视频分析、进度条控制和远程点击。
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
        bus.on('cmd:remote_click', (pos) => { // 👂 监听远程点击指令
            if (this.isDestroyed) return; // 💖 如果已销毁，不处理
            network.send('click', pos); // 💖 将点击坐标通过网络发送给服务器
        });

        // 💖 监听重连按钮点击
        const btnReconnect = document.getElementById('btn-browser-reconnect');
        if (btnReconnect) {
            btnReconnect.onclick = () => {
                console.log("🔌 用户手动触发重连...");
                bus.emit('system:speak', "正在尝试重连直播流... 🔄");
                network.send({ type: 'stream_control', action: 'stop' }); // 先停止
                setTimeout(() => {
                    network.send({ type: 'stream_control', action: 'start' }); // 再启动
                }, 500);
            };
        }

        // 💖 监听验证码按钮点击
        const btnCaptcha = document.getElementById('btn-browser-captcha');
        if (btnCaptcha) {
            btnCaptcha.onclick = () => {
                console.log("🧩 用户请求解决验证码...");
                
                // 🆕 视觉反馈：让用户知道点击生效了
                const originalText = btnCaptcha.innerText;
                btnCaptcha.innerText = "⏳";
                btnCaptcha.style.opacity = "0.5";
                setTimeout(() => {
                    btnCaptcha.innerText = originalText;
                    btnCaptcha.style.opacity = "1";
                }, 3000);

                bus.emit('system:speak', "正在尝试解决验证码... 🧩");
                network.send({ type: 'solve_captcha' });
            };
        }
        
        // 监听状态更新
        bus.on('net:status', (msg) => { // 👂 监听网络状态
            const el = document.getElementById('browser-status-overlay'); // 🔍 获取状态遮罩层
            if (el) { // ✅ 如果元素存在
                el.innerText = msg; // 📝 更新文本
                el.style.opacity = '1'; // 👁️ 显示
                // 如果是活跃状态，显示绿色点缀 (可选)
                if (msg.includes('Active')) el.style.background = 'rgba(46, 204, 113, 0.8)'; // 🟢 活跃状态绿色
                else el.style.background = 'rgba(0,0,0,0.6)'; // ⚫ 其他状态黑色半透明
            }
        });

        // 💖 注册清理函数
        bus.on(`app:closed:${config.id}`, () => this.onDestroy());
    }

    // =================================
    //  🎉 销毁函数 (On Destroy) (无参数)
    //
    //  🎨 代码用途：
    //     清理浏览器应用占用的资源，停止视频流更新。
    //
    //  💡 易懂解释：
    //     关电视啦！拔掉电源，把遥控器收起来。🔌
    //
    //  ⚠️ 警告：
    //     如果不清理，视频流可能会继续占用带宽。
    // =================================
    onDestroy() {
        this.isDestroyed = true; // 🚩 标记为已销毁
        
        // 🆕 新增：发送会话销毁指令，确保服务器端清理僵尸进程
        // 这样下次打开时会创建一个全新的干净会话
        console.log("👋 [Browser] Sending kill session command...");
        network.send({ type: 'browser_kill_session' });

        // 💖 停止视频流更新 (如果 img 标签还在，将其 src 置空以断开连接)
        const img = document.getElementById('live-image'); // 🔍 获取图片元素
        if (img) { // ✅ 如果存在
            img.src = ''; // 🚫 清空源，断开连接
            img.style.display = 'none'; // 🙈 隐藏
        }
        
        // 💖 移除全局事件监听 (如果有的话)
        // 注意：bus.on 目前没有返回 unsubscribe 函数，所以这里主要依靠 isDestroyed 标志位来阻断逻辑
        
        console.log("探索之窗已关闭，资源已释放。"); // 📢 控制台输出
    }

    // =================================
    //  🎉 初始化函数 (Initialize) (无参数)
    //
    //  🎨 代码用途：
    //     启动浏览器的所有功能模块，包括事件绑定和远程控制设置。
    //     同时启动窗口大小监听，以同步后端分辨率。
    //
    //  💡 易懂解释：
    //     给遥控器装上电池，确认每个按钮都能用！🔋
    //
    //  ⚠️ 警告：
    //     必须在 DOM 加载完成后调用，否则找不到按钮。
    // =================================
    init() {
        this.isDestroyed = false; // 💖 重置销毁标志
        
        // 🆕 初始状态：等待用户点击连接 (符合用户要求的“点击才推流”逻辑)
        console.log("🚀 [Browser] Init: Waiting for user interaction to start stream...");
        const overlay = document.getElementById('browser-status-overlay');
        if (overlay) {
            overlay.innerText = "🖱️ 点击屏幕开始连接";
            overlay.style.display = 'block';
            overlay.style.background = 'rgba(0,0,0,0.6)';
        }
        
        // 🔑 检查并同步 API Key
        const savedKey = localStorage.getItem('angel_api_key');
        if (!savedKey) {
            setTimeout(() => {
                bus.emit('system:speak', "探索功能需要 API Key，请在左下角设置 🔑");
                bus.emit('system:open_key_mgr'); // 🔑 自动打开密钥管理器
            }, 800);
        } else {
            // 🆕 自动同步 Key 到服务器，防止服务器重启后丢失 Key
            console.log("🔑 [Browser] Syncing API Key to server...");
            network.send({ type: 'auth', key: savedKey });
        }

        // 📺 监听视频帧更新
        bus.on('net:frame', (base64Data) => {
            const img = document.getElementById('live-image'); // 🔍 获取图片元素
            if (img) {
                img.src = 'data:image/jpeg;base64,' + base64Data; // 🖼️ 更新图片源
                img.style.display = 'block'; // 👁️ 显示画面
                // 隐藏等待提示
                const overlay = document.getElementById('browser-status-overlay');
                if (overlay) overlay.style.display = 'none'; // 🙈 隐藏遮罩
                
                // 🐶 看门狗：重置超时计时器
                if (this.frameWatchdog) clearTimeout(this.frameWatchdog);
                this.frameWatchdog = setTimeout(() => {
                    if (this.isDestroyed) return;
                    const overlay = document.getElementById('browser-status-overlay');
                    if (overlay) {
                        overlay.innerText = "⚠️ 网络中断 (无视频流)";
                        overlay.style.background = 'rgba(231, 76, 60, 0.8)'; // 🔴 红色警告
                        overlay.style.display = 'block';
                    }
                }, 5000); // 5秒无帧则报警
            }
        });

        // 🖱️ 全局点击监听：点击外部停止传输
        // 注意：这里可能会有内存泄漏，最好在 onDestroy 中移除，但 document 监听比较麻烦
        // 简单起见，我们在回调里判断 isDestroyed
        const stopStreamHandler = (e) => {
            if (this.isDestroyed) { // 🛑 如果已销毁
                document.removeEventListener('click', stopStreamHandler); // 🧹 移除监听
                return;
            }
            // 如果点击的不是浏览器窗口内部，且窗口是打开的
            const win = document.getElementById(config.id);
            if (win && !win.contains(e.target)) { // 🎯 点击了窗口外部
                 network.send({ type: 'stream_control', action: 'stop' }); // 🛑 发送停止指令
                 // 恢复等待提示 (可选)
                 const overlay = document.getElementById('browser-status-overlay');
                 if (overlay) {
                     overlay.innerText = "⏸️ 已暂停 (点击屏幕恢复)";
                     overlay.style.display = 'block'; // 👁️ 显示遮罩
                 }
                 // const img = document.getElementById('live-image');
                 // if (img) img.style.display = 'none'; // 🙈 隐藏画面 (可选：保留最后一帧体验更好)
            }
        };
        document.addEventListener('click', stopStreamHandler); // 👂 绑定全局点击

        this.bindEvents(); // 💖 绑定基础按钮事件（如前往、分析）
        this.setupRemoteControl(); // 💖 设置远程控制逻辑（如点击画面、拖动进度条）
        
        // 📏 监听窗口大小变化，同步调整后端分辨率
        // 使用 ResizeObserver 监听窗口 DOM 元素
        const win = document.getElementById(config.id); // 🔍 获取窗口 DOM
        if (win) { // ✅ 如果窗口存在
            let resizeTimeout; // ⏱️ 防抖定时器
            const observer = new ResizeObserver(entries => { // 👀 创建观察者
                for (let entry of entries) { // 🔄 遍历变化条目
                    // 🛡️ 防抖：避免频繁发送请求 (300ms)
                    clearTimeout(resizeTimeout); // 🛑 清除旧定时器
                    resizeTimeout = setTimeout(() => { // ⏱️ 设置新定时器
                        if (this.isDestroyed) return; // 🛑 如果已销毁，不执行
                        
                        const rect = entry.contentRect; // 📏 获取新尺寸
                        // 计算内容区域大小 (减去地址栏高度约80px)
                        // 注意：contentRect 是内容区域，不包含边框
                        // 但我们的 browser.js 里的 content 包含了地址栏，所以要减去地址栏高度
                        // 地址栏高度固定约 80px (padding 8*2 + input 30 + gap 8 + controls 20)
                        // 简单估算为 80px，或者动态获取
                        const addressBar = win.querySelector('.content > div:first-child'); // 🔍 获取地址栏
                        const addressBarHeight = addressBar ? addressBar.offsetHeight : 80; // 📏 获取高度
                        
                        const newWidth = Math.round(rect.width); // 🔢 取整宽度
                        const newHeight = Math.round(rect.height - addressBarHeight); // 🔢 计算高度
                        
                        if (newWidth > 0 && newHeight > 0) { // ✅ 如果尺寸有效
                            network.send({ // 📡 发送调整指令
                                type: 'browser_resize',
                                width: newWidth,
                                height: newHeight
                            });
                            // console.log(`📏 窗口调整: ${newWidth}x${newHeight}`);
                        }
                    }, 300);
                }
            });
            observer.observe(win.querySelector('.content')); // 👀 监听 content 区域变化
            
            // 注册清理逻辑
            bus.on(`app:closed:${config.id}`, () => { // 👂 监听关闭事件
                observer.disconnect(); // 🛑 停止观察
                clearTimeout(resizeTimeout); // 🛑 清除定时器
            });
        }
    }

    // =================================
    //  🎉 绑定事件 (Bind Events) (无参数)
    //
    //  🎨 代码用途：
    //     绑定界面按钮事件（如前往、执行任务）和网络命令监听（如扫描）。
    //
    //  💡 易懂解释：
    //     告诉遥控器，按这个键是换台，按那个键是分析！🔘
    //
    //  ⚠️ 警告：
    //     如果找不到对应的 DOM 元素，事件绑定将不会生效（代码中已做空值检查）。
    // =================================
    bindEvents() {
        // === 监听“开始扫描”命令 ===
        bus.on('cmd:scan', () => { // 👂 监听扫描指令
            network.send('start_scan'); // 💖 发送网络请求，通知服务器开始扫描
            wm.openApp('win-angel'); // 💖 自动打开“观察眼”窗口，显示扫描界面
        });

        // === 性能控制逻辑 (画质/帧率) ===
        const selQuality = document.getElementById('sel-quality'); // 🔍 获取画质选择框
        const selFps = document.getElementById('sel-fps'); // 🔍 获取帧率选择框
        
        const updateConfig = () => { // ⚙️ 更新配置函数
            if (selQuality && selFps) { // ✅ 如果元素存在
                network.send({ // 📡 发送配置更新
                    type: 'config_update',
                    quality: selQuality.value,
                    fps: parseInt(selFps.value)
                });
            }
        };

        if (selQuality) selQuality.onchange = updateConfig; // 👂 绑定变更事件
        if (selFps) selFps.onchange = updateConfig; // 👂 绑定变更事件

        // === 浏览器控制逻辑 ===
        const btnGo = document.getElementById('btn-browser-go'); // 💖 获取“前往”按钮 DOM 元素
        const inputUrl = document.getElementById('browser-url'); // 💖 获取地址输入框 DOM 元素
        const btnBack = document.getElementById('btn-browser-back'); // 🔙 后退
        const btnForward = document.getElementById('btn-browser-forward'); // 🔜 前进
        const btnRefresh = document.getElementById('btn-browser-refresh'); // 🔄 刷新

        // 绑定导航按钮事件
        if (btnBack) btnBack.onclick = () => network.send({ type: 'browser_back' });
        if (btnForward) btnForward.onclick = () => network.send({ type: 'browser_forward' });
        if (btnRefresh) btnRefresh.onclick = () => network.send({ type: 'browser_refresh' });
        
        // 监听来自服务器的 URL 更新消息
        bus.on('net:url_update', (newUrl) => { // 👂 监听 URL 更新
            if (inputUrl && newUrl) { // ✅ 如果有效
                inputUrl.value = newUrl; // 📝 更新输入框
                window.current_browser_url = newUrl; // 🌍 更新全局变量
            }
        });

        if (btnGo && inputUrl) { // 💖 确保元素存在，防止报错
            // 点击“前往”按钮时触发
            btnGo.onclick = () => { // 🖱️ 绑定点击事件
                const url = inputUrl.value || "https://www.douyin.com/"; // 💖 获取用户输入的网址，如果为空则使用默认值
                if (url) { // 💖 如果网址不为空
                    window.current_browser_url = url; // 💖 记录当前 URL 到全局变量，供其他模块使用
                    network.send({ type: 'browser_navigate', url: url }); // 💖 发送导航指令给服务器
                    bus.emit('system:speak', "正在前往目标网页..."); // 💖 让小天使语音播报操作状态
                }
            };
        }

        // === 智能任务逻辑 (AI Task) ===
        const btnTask = document.getElementById('btn-browser-task'); // 🔍 获取任务按钮
        const inputTask = document.getElementById('browser-task-input'); // 🔍 获取任务输入框
        
        if (btnTask && inputTask) { // ✅ 如果元素存在
            btnTask.onclick = () => { // 🖱️ 绑定点击事件
                // 🛡️ 再次检查 Key
                if (!localStorage.getItem('angel_api_key')) {
                    bus.emit('system:speak', "请先配置 API Key 才能执行任务哦 🛑");
                    bus.emit('system:open_key_mgr');
                    return;
                }

                const goal = inputTask.value; // 📝 获取任务目标
                if (goal) { // ✅ 如果目标不为空
                    network.send({ type: 'task', goal: goal }); // 💖 发送任务指令
                    bus.emit('system:speak', `收到任务：${goal}，正在思考中...`); // 🗣️ 语音反馈
                    inputTask.value = ''; // 清空输入框
                }
            };
            
            // 支持回车键提交
            inputTask.onkeypress = (e) => { // ⌨️ 绑定键盘事件
                if (e.key === 'Enter') btnTask.click(); // ↵ 回车触发点击
            };
        }

        // === 分析按钮 (已移除，功能合并入任务栏) ===
        /*
        const btnAnalyze = document.getElementById('btn-browser-analyze'); // 💖 获取“分析画面”按钮 DOM 元素
        if (btnAnalyze) { // 💖 确保元素存在
            // 点击“分析”按钮时触发
            btnAnalyze.onclick = () => {
                network.send({ type: 'agent_analyze' }); // 💖 发送分析指令给服务器，请求 AI 分析当前画面
                bus.emit('system:speak', "正在分析当前视频..."); // 💖 让小天使语音播报操作状态
            };
        }
        */
    }

    // =================================
    //  🎉 设置远程控制 (Setup Remote Control) (无参数)
    //
    //  🎨 代码用途：
    //     处理视频进度条拖动和画面远程点击逻辑。
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
            remoteScreen.addEventListener('mouseleave', () => progressBar.style.display = 'none');
        }

        // === 远程点击逻辑 ===
        if (remoteScreen) { // 💖 确保遮罩层存在
            // 🖱️ 鼠标按下 (Drag Start)
            remoteScreen.addEventListener('mousedown', (e) => {
                if (wm.activeWindowId !== config.id) return;
                
                // 🆕 点击画面时，确保流是开启的 (防止之前点击外部停止了)
                network.send({ type: 'stream_control', action: 'start' });
                
                // 🆕 隐藏暂停遮罩
                const overlay = document.getElementById('browser-status-overlay');
                if (overlay) overlay.style.display = 'none';
                
                if (e.target.closest('#video-progress-bar')) return;

                const img = document.getElementById('live-image');
                if (!img) return;
                
                const r = img.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width;
                const y = (e.clientY - r.top) / r.height;
                
                this.isDragging = true;
                network.send({ type: 'mouse_down', x, y });
            });

            // 🖱️ 鼠标移动 (Drag Move)
            remoteScreen.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                
                // 节流：避免发送过多请求
                const now = Date.now();
                if (now - (this.lastMoveTime || 0) < 50) return; // 50ms 间隔
                this.lastMoveTime = now;

                const img = document.getElementById('live-image');
                if (!img) return;

                const r = img.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width;
                const y = (e.clientY - r.top) / r.height;

                network.send({ type: 'mouse_move', x, y });
            });

            // 🖱️ 鼠标抬起 (Drag End)
            const endDrag = (e) => {
                if (!this.isDragging) return;
                this.isDragging = false;
                
                const img = document.getElementById('live-image');
                if (!img) {
                    network.send({ type: 'mouse_up', x: 0, y: 0 }); // 兜底
                    return;
                }

                const r = img.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width;
                const y = (e.clientY - r.top) / r.height;

                network.send({ type: 'mouse_up', x, y });
            };
            
            remoteScreen.addEventListener('mouseup', endDrag);
            remoteScreen.addEventListener('mouseleave', endDrag); // 移出也算结束

            // 保留原有 Click 逻辑作为备用? 
            // 其实 mousedown + mouseup 已经涵盖了 click，但为了兼容旧逻辑或特定点击行为，
            // 我们可以保留 click 事件，或者完全用 down/up 替代。
            // 为了避免重复点击，如果实现了 down/up，通常不需要单独的 click，除非后端 click 有特殊处理（如拟人化）。
            // 鉴于后端 click 有拟人化逻辑，我们保留 click 事件，但要注意冲突。
            // 简单的做法：如果发生了 drag (move distance > threshold)，则不触发 click。
            // 但这里我们简单地让 down/up 处理拖动，click 处理点击。
            // 后端 mouse_down/up 是直接操作，click 是拟人化操作。
            // 为了支持拖动，我们必须使用 down/move/up。
            // 如果用户只是点击，会触发 down -> up。
            // 我们可以修改前端逻辑：
            // 如果是短时间的 down->up 且位移小 -> 发送 click (拟人化)
            // 如果是长时间或位移大 -> 发送 down, move, up (直接控制)
            
            // 让我们采用混合模式：
            // 始终发送 down/move/up。
            // 后端 mouse_controller 需要支持这些原子操作。
            // 原有的 click 事件监听器可以移除，或者改为只处理“非拖动”的点击。
            
            /* 移除旧的 click 监听，改用上面的 down/up 逻辑覆盖 */
            /*
            remoteScreen.addEventListener('click', (e) => { ... });
            */
        }
    }
}

export const app = new BrowserApp(); // 💖 导出应用实例
