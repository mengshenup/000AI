/**
 * @fileoverview Traffic 渲染原子
 * @description 流量监控 UI 配置和模板
 * @module apps_system/traffic/render
 */

/**
 * 详情窗口配置
 */
export const detailConfig = {
    id: 'win-traffic',
    name: '脉动监测',
    version: '1.0.0',
    description: '感受数据的每一次跳动',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    color: '#00cec9',
    system: true,
    showDesktopIcon: false,
    showTaskbarIcon: false,
    skipTaskbar: true,
    showTrayIcon: false,
    frameless: true,
    fixed: false,
    width: 200,
    height: 120,
    pos: { x: 0, y: 0 },
    isOpen: false,
    content: getDetailContent(),
    contentStyle: 'background: transparent; padding: 0; box-shadow: none; border: none;'
};

/**
 * 获取详情窗口内容
 */
function getDetailContent() {
    return `
        <div style="padding: 15px; background: rgba(30, 39, 46, 0.95); color: #fff; border-radius: 8px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-size: 12px; color: #00cec9; margin-bottom: 5px; font-weight: bold;">网络脉动监测</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="color: #aaa; font-size: 11px;">实时上传</span>
                <span id="tx-stat" style="color: #74b9ff; font-family: monospace;">0 KB/s</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="color: #aaa; font-size: 11px;">实时下载</span>
                <span id="rx-stat" style="color: #55efc4; font-family: monospace;">0 KB/s</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="color: #aaa; font-size: 11px;">总发送量</span>
                <span id="total-tx" style="color: #fff; font-family: monospace;">0 MB</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="color: #aaa; font-size: 11px;">总接收量</span>
                <span id="total-rx" style="color: #fff; font-family: monospace;">0 MB</span>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; display: flex; justify-content: space-between;">
                <div style="text-align: center;">
                    <div style="color: #aaa; font-size: 10px;">会话时长</div>
                    <div id="session-duration" style="color: #fab1a0; font-family: monospace;">00:00:00</div>
                </div>
                <div style="text-align: center;">
                    <div style="color: #aaa; font-size: 10px;">预估成本</div>
                    <div id="session-cost" style="color: #ffeaa7; font-family: monospace;">$0.0000</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 胶囊栏 HTML
 */
export const capsuleHtml = `
    <span style="color: #aaa;">▲</span>
    <span id="bar-tx">0B</span>
    <span style="width: 1px; height: 10px; background: rgba(0,0,0,0.2); margin: 0 5px;"></span>
    <span style="color: #aaa;">▼</span>
    <span id="bar-rx">0B</span>
`;

/**
 * 更新统计显示
 * @param {Object} stats - 网络统计数据
 */
export function updateStats(stats) {
    if (!stats || !stats.net) return;

    const update = (id, val) => {
        document.querySelectorAll(`#${id}`).forEach(el => el.innerText = val);
    };

    update('bar-tx', stats.net.up);
    update('bar-rx', stats.net.down);
    update('tx-stat', stats.net.up);
    update('rx-stat', stats.net.down);
    if (stats.net.total_tx) update('total-tx', stats.net.total_tx);
    if (stats.net.total_rx) update('total-rx', stats.net.total_rx);
    if (stats.session && stats.session.duration) update('session-duration', stats.session.duration);
    if (stats.session && stats.session.cost) update('session-cost', stats.session.cost);
}
