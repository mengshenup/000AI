import { bus } from '../system/event_bus.js';
import { pm } from '../system/process_manager.js';

export const config = {
    // =================================
    //  🎉 性能调优配置
    //
    //  🎨 代码用途：
    //     定义性能调优应用的元数据
    //
    //  💡 易懂解释：
    //     这是小天使的“健身房”！在这里可以调节她的体能消耗，
    //     或者在她生病（显卡不兼容）的时候开启特殊照顾模式~ 🏋️‍♀️
    // =================================
    id: 'win-performance',
    name: '性能调优',
    description: '调整系统性能与兼容性设置',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', // 仪表盘/地球图标
    version: '1.0.0', // 💖 版本号
    color: '#6c5ce7',
    pos: { x: 150, y: 150 },
    winPos: { x: 400, y: 200 },
    content: `
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
            <!-- 🚀 性能模式 -->
            <div class="perf-section">
                <h3 style="margin: 0 0 10px 0; color: #2d3436;">🚀 性能模式</h3>
                <div style="display: flex; gap: 10px;">
                    <button id="btn-perf-high" class="perf-btn active">高性能 (60FPS)</button>
                    <button id="btn-perf-low" class="perf-btn">节能模式 (30FPS)</button>
                </div>
                <p style="font-size: 0.8em; color: #636e72; margin-top: 5px;">
                    高性能模式画面更流畅，但会消耗更多电量。节能模式适合笔记本使用。
                </p>
            </div>

            <hr style="border: 0; border-top: 1px solid #eee;">

            <!-- 🐢 兼容性模式 -->
            <div class="perf-section">
                <h3 style="margin: 0 0 10px 0; color: #2d3436;">🐢 兼容性模式</h3>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <label class="switch">
                        <input type="checkbox" id="chk-force-cpu">
                        <span class="slider round"></span>
                    </label>
                    <span style="font-weight: bold;">强制无 GPU 兼容模式</span>
                </div>
                <p style="font-size: 0.8em; color: #e17055; margin-top: 5px;">
                    如果小天使无法显示或导致浏览器崩溃，请开启此选项。开启后将使用 CPU 渲染，可能会有卡顿。
                    <br><b>注意：切换此选项需要重启小天使。</b>
                </p>
            </div>

            <hr style="border: 0; border-top: 1px solid #eee;">

            <!-- 🚑 紧急修复 -->
            <div class="perf-section">
                <h3 style="margin: 0 0 10px 0; color: #2d3436;">🚑 紧急修复</h3>
                <button id="btn-reset-angel" style="
                    background: #ff7675; color: white; border: none; 
                    padding: 8px 16px; border-radius: 5px; cursor: pointer;
                    font-weight: bold; width: 100%;
                ">重置小天使状态</button>
                <p style="font-size: 0.8em; color: #636e72; margin-top: 5px;">
                    如果小天使卡住、消失或行为异常，点击此按钮可将其恢复出厂设置。
                </p>
            </div>

            <hr style="border: 0; border-top: 1px solid #eee;">

            <!-- 💻 本机配置信息 (迁移自 Manual App) -->
            <div class="perf-section">
                <h3 style="margin: 0 0 10px 0; color: #2d3436;">💻 硬件信息</h3>
                <div id="perf-sys-info" style="background:#f8f9fa; padding:10px; border-radius:5px; font-size:0.9em; color:#666;">
                    正在读取系统信息...
                </div>
            </div>
        </div>

        <style>
            .perf-btn {
                flex: 1;
                padding: 8px;
                border: 1px solid #dfe6e9;
                background: white;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .perf-btn.active {
                background: #6c5ce7;
                color: white;
                border-color: #6c5ce7;
            }
            /* 开关样式 */
            .switch {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 20px;
            }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 20px;
            }
            .slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 2px;
                bottom: 2px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            input:checked + .slider { background-color: #00b894; }
            input:checked + .slider:before { transform: translateX(20px); }
        </style>
    `
};

export class PerformanceApp {
    // =================================
    //  🎉 性能调优应用类
    //
    //  🎨 代码用途：
    //     处理性能设置的读取、保存和事件分发
    // =================================
    constructor() {
        this.id = config.id;
        this.ctx = pm.getContext(this.id);
        
        // 监听窗口就绪
        bus.on(`app:ready:${this.id}`, () => {
            this.init();
            this.updateSystemInfo(); // 💖 加载硬件信息
        });
    }

    // =================================
    //  🎉 更新系统信息 (迁移自 Manual App)
    // =================================
    updateSystemInfo() {
        const infoBox = document.getElementById('perf-sys-info');
        if (!infoBox) return;

        const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '未知';
        const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} 核` : '未知';
        const platform = navigator.platform || '未知';
        const userAgent = navigator.userAgent;
        
        // 简单的浏览器判断
        let browser = "未知浏览器";
        if (userAgent.includes("Chrome")) browser = "Chrome / Chromium";
        if (userAgent.includes("Firefox")) browser = "Firefox";
        if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
        if (userAgent.includes("Edge")) browser = "Microsoft Edge";

        // 🎮 GPU 检测
        let gpuRenderer = "未知 GPU";
        let gpuVendor = "未知厂商";
        let isSoftware = false;
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                }
                // 检查是否为软件渲染
                if (gpuRenderer.toLowerCase().includes('software') || gpuRenderer.toLowerCase().includes('swiftshader')) {
                    isSoftware = true;
                    gpuRenderer += " (CPU渲染)";
                }
            } else {
                gpuRenderer = "不支持 WebGL";
            }
        } catch (e) {
            gpuRenderer = "检测失败";
        }

        const gpuColor = isSoftware ? '#d63031' : '#00b894'; // 红色警告，绿色正常

        // 🎨 构建基础信息 HTML
        let htmlContent = `
            <ul style="list-style:none; padding:0; margin:0;">
                <li>🧠 <b>CPU 核心数：</b> ${cores}</li>
                <li>💾 <b>内存估算：</b> ${mem}</li>
                <li>🖥️ <b>操作系统平台：</b> ${platform}</li>
                <li>🌐 <b>浏览器：</b> ${browser}</li>
                <li style="margin-top:5px; border-top:1px dashed #ddd; padding-top:5px;">
                    🎮 <b>GPU 渲染器：</b> <span style="color:${gpuColor}; font-weight:bold;">${gpuRenderer}</span>
                </li>
                <li>🏭 <b>GPU 厂商：</b> ${gpuVendor}</li>
                <li style="margin-top:5px; font-size:0.8em; opacity:0.7;">UA: ${userAgent.substring(0, 50)}...</li>
            </ul>
        `;

        // 🚀 异步获取后端详细硬件信息
        fetch('http://localhost:8000/system_info')
            .then(res => res.json())
            .then(data => {
                if (data.cpu_model) {
                    htmlContent += `
                        <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #ddd; color:#0984e3;">
                            <b>🚀 物理 CPU 型号：</b><br>${data.cpu_model}
                            <div style="font-size:0.8em; color:#999; margin-top:2px;">
                                架构: ${data.architecture} | 系统: ${data.system}
                            </div>
                        </div>
                    `;
                    infoBox.innerHTML = htmlContent; // 更新 DOM
                }
            })
            .catch(err => {
                console.warn("无法连接后端获取硬件信息", err);
                // 失败时不更新，保持基础信息
            });

        // 先显示基础信息
        infoBox.innerHTML = htmlContent;
    }

    init() {
        this.loadSettings();
        this.bindEvents();
    }

    loadSettings() {
        // 1. 性能模式
        const perfMode = localStorage.getItem('angel_performance_mode') || 'high';
        this.updatePerfBtns(perfMode);

        // 2. 强制 CPU 模式
        const forceCpu = localStorage.getItem('angel_force_cpu') === 'true';
        const chkCpu = document.getElementById('chk-force-cpu');
        if (chkCpu) chkCpu.checked = forceCpu;
    }

    bindEvents() {
        // 1. 性能模式切换
        const btnHigh = document.getElementById('btn-perf-high');
        const btnLow = document.getElementById('btn-perf-low');

        const setMode = (mode) => {
            localStorage.setItem('angel_performance_mode', mode);
            this.updatePerfBtns(mode);
            // 通知 Angel App 变更
            bus.emit('config:changed', { key: 'perfMode', value: mode });
        };

        if (btnHigh) btnHigh.onclick = () => setMode('high');
        if (btnLow) btnLow.onclick = () => setMode('low');

        // 2. 强制 CPU 模式切换
        const chkCpu = document.getElementById('chk-force-cpu');
        if (chkCpu) {
            chkCpu.onchange = (e) => {
                const isChecked = e.target.checked;
                localStorage.setItem('angel_force_cpu', isChecked);
                // 这个设置需要重启 Angel 才能生效，我们可以尝试重置 Angel
                if (confirm("切换兼容模式需要重启小天使才能生效。是否立即重启小天使？")) {
                    // 先关闭
                    bus.emit('angel:reset'); // 重置状态
                    // 触发重新加载 (简单粗暴的方法是刷新页面，或者让 Angel 重新 init)
                    // 由于 Angel 的 init 逻辑里有检测，我们这里提示用户刷新页面可能更稳妥
                    // 但为了体验，我们可以尝试重新触发 app:ready:win-companion
                    // 不过最稳妥的是刷新页面
                    location.reload();
                }
            };
        }

        // 3. 重置小天使
        const btnReset = document.getElementById('btn-reset-angel');
        if (btnReset) {
            btnReset.onclick = () => {
                bus.emit('angel:reset');
            };
        }
    }

    updatePerfBtns(mode) {
        const btnHigh = document.getElementById('btn-perf-high');
        const btnLow = document.getElementById('btn-perf-low');
        if (!btnHigh || !btnLow) return;

        if (mode === 'high') {
            btnHigh.classList.add('active');
            btnLow.classList.remove('active');
        } else {
            btnHigh.classList.remove('active');
            btnLow.classList.add('active');
        }
    }
}

export const app = new PerformanceApp();
