import { bus } from '../event_bus.js'; // 💖 导入事件总线

export const config = {
    // =================================
    //  🎉 说明书配置 (ID, 名称, 图标...)
    //
    //  🎨 代码用途：
    //     定义“启示录”说明书的基础元数据和静态 HTML 内容
    //
    //  💡 易懂解释：
    //     这是新手村的“引导员”！告诉你怎么操作这个系统，怎么跟小天使玩耍~ 📖
    //
    //  ⚠️ 警告：
    //     内容是硬编码的 HTML，修改文案直接改 content 属性即可。
    // =================================
    id: 'win-manual', // 💖 窗口的唯一标识符
    name: '光明指引', // 💖 窗口标题栏显示的名称
    description: '照亮前行之路的操作指南', // 💖 功能描述
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z', // 💖 SVG 图标路径（信息符号）
    color: '#0984e3', // 💖 窗口的主题颜色（蓝色）
    pos: { x: 20, y: 20 }, // 💖 桌面图标的默认位置
    winPos: { x: 100, y: 50 }, // 💖 窗口打开时的默认屏幕坐标
    // openMsg: "光明指引已开启，让我来为你照亮前行的路！🕯️", // 💖 已移除，统一由 angel.js 管理
    content: `
        <h3>欢迎使用 Seraphim OS! ✨</h3>
        <p>这是一个基于 Web 的桌面操作系统模拟器。</p>
        <hr style="margin:10px 0; border:0; border-top:1px solid #eee;">
        <p><b>操作指南：</b></p>
        <ul>
            <li>🖱️ <b>拖拽窗口</b>：按住标题栏移动。</li>
            <li>📂 <b>打开应用</b>：双击桌面图标。</li>
            <li>👀 <b>小天使交互</b>：
                <ul>
                    <li>左键点击：随机对话</li>
                    <li>右键拖拽：旋转视角</li>
                </ul>
            </li>
            <li>⚙️ <b>个性化</b>：在设置中更换壁纸。</li>
        </ul>
        <hr style="margin:10px 0; border:0; border-top:1px solid #eee;">
        <p><b>💻 本机配置信息：</b></p>
        <div id="manual-sys-info" style="background:#f8f9fa; padding:10px; border-radius:5px; font-size:0.9em; color:#666;">
            正在读取系统信息...
        </div>
    `, // 💖 窗口显示的 HTML 内容
    contentStyle: 'color:#444; line-height:1.6;' // 💖 窗口内容的 CSS 样式
};

class ManualApp {
    // =================================
    //  🎉 说明书应用类 (无参数)
    //
    //  🎨 代码用途：
    //     管理“系统说明书”APP的业务逻辑
    //
    //  💡 易懂解释：
    //     这是一本电子书！目前只能看，以后可能会加上搜索功能，让你能快速找到想看的内容~ 📚
    //
    //  ⚠️ 警告：
    //     目前此类几乎为空，因为说明书的内容主要是静态 HTML。
    // =================================
    constructor() {
        // 💖 监听窗口就绪事件，填充系统信息
        bus.on(`app:ready:${config.id}`, () => this.updateSystemInfo());
    }

    // =================================
    //  🎉 更新系统信息
    // =================================
    updateSystemInfo() {
        const infoBox = document.getElementById('manual-sys-info');
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
}

export const app = new ManualApp(); // 💖 导出应用实例
