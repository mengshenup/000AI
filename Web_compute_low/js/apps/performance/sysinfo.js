/**
 * @fileoverview 系统信息原子
 * @description 获取并显示硬件信息
 * @module apps/performance/sysinfo
 */

import { WEB_API_URL } from '../../system/config.js';

/**
 * 更新系统信息显示
 */
export function updateSystemInfo() {
    const infoBox = document.getElementById('perf-sys-info');
    if (!infoBox) return;

    const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '未知';
    const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} 核` : '未知';
    const platform = navigator.platform || '未知';
    const userAgent = navigator.userAgent;
    
    let browser = "未知浏览器";
    if (userAgent.includes("Chrome")) browser = "Chrome / Chromium";
    if (userAgent.includes("Firefox")) browser = "Firefox";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
    if (userAgent.includes("Edge")) browser = "Microsoft Edge";

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

    const gpuColor = isSoftware ? '#d63031' : '#00b894';

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

    fetch(`${WEB_API_URL}/system_info`)
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
                infoBox.innerHTML = htmlContent;
            }
        })
        .catch(() => {});

    infoBox.innerHTML = htmlContent;
}
