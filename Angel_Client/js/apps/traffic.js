export const config = {
    id: 'win-traffic',
    name: '网络监控',
    description: '实时流量',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    color: '#00cec9',
    system: true, // 💖 标记为系统应用
    showDesktopIcon: false, // 💖 不显示桌面图标
    showTaskbarIcon: false, // 💖 不显示任务栏图标
    frameless: true, // 💖 无边框窗口
    fixed: false, // 💖 取消固定，允许动态定位
    width: 200, // 📏 详情窗宽度
    height: 120, // 📏 详情窗高度
    pos: { x: 0, y: 0 }, // 占位
    // winPos: { right: 10, bottom: 50 }, // 📍 移除固定位置，由点击事件动态计算
    isOpen: false, // 默认关闭，点击胶囊才显示
    openMsg: "", // 不播放语音
    content: `
        <div style="padding: 15px; background: rgba(30, 39, 46, 0.95); color: #fff; border-radius: 8px; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); height: 100%;">
            <div style="font-size: 12px; color: #00cec9; margin-bottom: 10px; font-weight: bold;">NETWORK MONITOR</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #aaa; font-size: 11px;">UPLOAD</span>
                <span id="tx-stat" style="color: #74b9ff; font-family: monospace;">0 KB/s</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #aaa; font-size: 11px;">DOWNLOAD</span>
                <span id="rx-stat" style="color: #55efc4; font-family: monospace;">0 KB/s</span>
            </div>
            <div style="margin-top: 10px; height: 2px; background: #333; border-radius: 1px; overflow: hidden;">
                <div style="width: 50%; height: 100%; background: #00cec9; animation: pulse 2s infinite;"></div>
            </div>
        </div>
    `,
    contentStyle: 'background: transparent; padding: 0; box-shadow: none; border: none;'
};
