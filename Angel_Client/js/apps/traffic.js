export const config = {
    id: 'win-traffic',
    name: '网络监控',
    description: '实时流量',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    color: '#00cec9',
    pos: { x: 100, y: 20 },
    winPos: { x: 200, y: 200 },
    isOpen: false,
    openMsg: "网络监控已启动 📡",
    content: `
        <div style="padding: 20px; text-align: center; background: #1e272e; color: #fff; height: 100%;">
            <h3 style="color: #00cec9; text-shadow: 0 0 10px rgba(0, 206, 201, 0.5);">⚡ 网络监控</h3>
            <div style="margin: 30px 0; display: flex; justify-content: space-around;">
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; width: 45%;">
                    <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">UPLOAD</div>
                    <div id="tx-stat" style="font-size: 20px; color: #74b9ff; font-weight: bold; font-family: monospace;">0 KB/s</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; width: 45%;">
                    <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">DOWNLOAD</div>
                    <div id="rx-stat" style="font-size: 20px; color: #55efc4; font-weight: bold; font-family: monospace;">0 KB/s</div>
                </div>
            </div>
            <div style="font-size: 10px; color: #555; margin-top: 20px;">SYSTEM LINKED // ONLINE</div>
        </div>
    `,
    contentStyle: 'background: #1e272e; padding: 0;'
};
