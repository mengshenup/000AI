/**
 * @fileoverview 渲染器原子
 * @description 处理 WebGL 渲染器的创建和配置
 * @module apps_system/angel/renderer
 */

/**
 * 检测是否为软件渲染环境
 * @returns {boolean}
 */
export function isSoftwareRenderer() {
    const forceCpu = localStorage.getItem('angel_force_cpu') === 'true';
    if (forceCpu) return true;

    const checkCanvas = document.createElement('canvas');
    const gl = checkCanvas.getContext('webgl');
    if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            if (renderer && (renderer.toLowerCase().includes('software') || renderer.toLowerCase().includes('swiftshader'))) {
                return true;
            }
        }
    }
    return false;
}

/**
 * 创建 WebGL 渲染器
 * @param {HTMLElement} container - 容器元素
 * @param {string} perfMode - 性能模式 ('high' | 'low')
 * @returns {Object} {renderer, perfMode, showBubbleMsg}
 */
export function createRenderer(container, perfMode) {
    let renderer = null;
    let actualPerfMode = perfMode;
    let showBubbleMsg = null;

    const isSoftware = isSoftwareRenderer();

    try {
        if (!isSoftware) {
            renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: perfMode === 'high',
                powerPreference: "default",
                failIfMajorPerformanceCaveat: true
            });
        } else {
            throw "Force CPU Mode";
        }
    } catch (e1) {
        console.warn("WebGL 标准模式启动失败，尝试兼容模式...");
        try {
            actualPerfMode = 'low';
            renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: false,
                powerPreference: "low-power",
                failIfMajorPerformanceCaveat: false,
                precision: "lowp"
            });
            showBubbleMsg = "正在使用 CPU 兼容模式运行，可能会有些卡顿哦~ 🐢";
        } catch (e2) {
            console.error("WebGL 启动彻底失败", e2);
            alert("启动失败：您的浏览器无法创建 WebGL 上下文。");
            return { renderer: null, perfMode: actualPerfMode, showBubbleMsg };
        }
    }

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 400;
    renderer.setSize(width, height);
    renderer.setPixelRatio(actualPerfMode === 'low' ? 1 : window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    return { renderer, perfMode: actualPerfMode, showBubbleMsg };
}
