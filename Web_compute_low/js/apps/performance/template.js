/**
 * @fileoverview 性能调优模板原子
 * @description 定义性能调优应用的 HTML 模板
 * @module apps/performance/template
 */

export const content = `
<div style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
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
    <div class="perf-section">
        <h3 style="margin: 0 0 10px 0; color: #2d3436;">🐢 兼容性模式</h3>
        <div style="display: flex; align-items: center; gap: 10px;">
            <label class="switch"><input type="checkbox" id="chk-force-cpu"><span class="slider round"></span></label>
            <span style="font-weight: bold;">强制无 GPU 兼容模式</span>
        </div>
        <p style="font-size: 0.8em; color: #e17055; margin-top: 5px;">
            如果小天使无法显示或导致浏览器崩溃，请开启此选项。<br><b>注意：切换此选项需要重启小天使。</b>
        </p>
    </div>
    <hr style="border: 0; border-top: 1px solid #eee;">
    <div class="perf-section">
        <h3 style="margin: 0 0 10px 0; color: #2d3436;">🚑 紧急修复</h3>
        <button id="btn-reset-angel" style="background: #ff7675; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">重置小天使状态</button>
        <p style="font-size: 0.8em; color: #636e72; margin-top: 5px;">如果小天使卡住、消失或行为异常，点击此按钮可将其恢复出厂设置。</p>
    </div>
    <hr style="border: 0; border-top: 1px solid #eee;">
    <div class="perf-section">
        <h3 style="margin: 0 0 10px 0; color: #2d3436;">💻 硬件信息</h3>
        <div id="perf-sys-info" style="background:#f8f9fa; padding:10px; border-radius:5px; font-size:0.9em; color:#666;">正在读取系统信息...</div>
    </div>
</div>
<style>
    .perf-btn { flex: 1; padding: 8px; border: 1px solid #dfe6e9; background: white; border-radius: 5px; cursor: pointer; transition: all 0.2s; }
    .perf-btn.active { background: #6c5ce7; color: white; border-color: #6c5ce7; }
    .switch { position: relative; display: inline-block; width: 40px; height: 20px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
    .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
    input:checked + .slider { background-color: #00b894; }
    input:checked + .slider:before { transform: translateX(20px); }
</style>
`;
