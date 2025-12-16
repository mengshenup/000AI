/**
 * @fileoverview 浏览器配置原子
 * @description 定义浏览器应用的配置和 HTML 模板
 * @module apps/browser/config
 */

export const config = {
    id: 'win-angel',
    name: '探索之窗',
    version: '1.2.0',
    description: '连接无限可能的数字世界',
    icon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
    color: '#6c5ce7',
    pos: { x: 20, y: 110 },
    winPos: { x: 400, y: 100 },
    width: 800,
    height: 600,
    resizable: true,
    content: `
        <div style="padding:8px; background:#f1f2f6; display:flex; flex-direction:column; gap:8px; border-bottom:1px solid #ddd;">
            <div style="display:flex; gap:8px;">
                <button id="btn-browser-back" style="padding:4px 8px; cursor:pointer;" title="后退">⬅️</button>
                <button id="btn-browser-forward" style="padding:4px 8px; cursor:pointer;" title="前进">➡️</button>
                <button id="btn-browser-refresh" style="padding:4px 8px; cursor:pointer;" title="刷新">🔄</button>
                <input type="text" id="browser-url" placeholder="https://www.douyin.com/" style="flex:1; padding:4px 8px; border:1px solid #ccc; border-radius:4px;">
                <button id="btn-browser-go" style="padding:4px 12px; cursor:pointer;">前往</button>
                <button id="btn-browser-reconnect" style="padding:4px 8px; cursor:pointer; color:red;" title="强制重连直播流">🔌</button>
                <button id="btn-browser-captcha" style="padding:4px 8px; cursor:pointer; color:orange;" title="AI 解决验证码">🧩</button>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                <span style="font-size:14px;">🤖</span>
                <input type="text" id="browser-task-input" placeholder="告诉 Angel 你想做什么..." style="flex:1; padding:4px 8px; border:1px solid #a29bfe; border-radius:4px; background:#f8f9fa;">
                <button id="btn-browser-task" style="padding:4px 12px; cursor:pointer; background:var(--primary-color); color:white; border:none; border-radius:4px;">执行任务</button>
            </div>
            <div style="display:flex; gap:8px; align-items:center; font-size:12px; color:#666;">
                <span>画质:</span>
                <select id="sel-quality" style="padding:2px;">
                    <option value="high" selected>高清</option>
                    <option value="medium">均衡</option>
                    <option value="low">省流</option>
                </select>
                <span style="margin-left:8px;">帧率:</span>
                <select id="sel-fps" style="padding:2px;">
                    <option value="30">30 FPS</option>
                    <option value="15" selected>15 FPS</option>
                    <option value="5">5 FPS</option>
                </select>
            </div>
        </div>
        <div style="flex:1; position:relative; background:black;">
            <img id="live-image" style="width:100%; height:100%; object-fit:contain; display:none;" />
            <div id="browser-status-overlay" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.6); color:white; padding:4px 12px; border-radius:12px; font-size:12px;">💤 Agent Waiting...</div>
            <div id="remote-screen" style="position:absolute; top:0; left:0; width:100%; height:100%; cursor:crosshair;"></div>
            <div id="video-progress-bar" style="position:absolute; bottom:0; left:0; width:100%; height:5px; background:rgba(255,255,255,0.3); cursor:pointer; display:none;">
                <div style="width:0%; height:100%; background:red;"></div>
            </div>
        </div>
    `,
    contentStyle: 'display:flex; flex-direction:column; padding:0;'
};
