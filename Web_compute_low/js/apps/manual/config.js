/**
 * @fileoverview 说明书配置原子
 * @description 定义说明书应用的配置
 * @module apps/manual/config
 */

export const config = {
    id: 'win-manual',
    name: '光明指引',
    version: '1.0.0',
    description: '照亮前行之路的操作指南',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    color: '#0984e3',
    pos: { x: 20, y: 20 },
    winPos: { x: 100, y: 50 },
    width: 450,
    height: 380,
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
        <p><b>💡 提示：</b></p>
        <p style="font-size:0.9em; color:#666;">
            想要查看本机硬件配置或调整性能模式？<br>
            请前往 <b>"性能调优"</b> 应用 (仪表盘图标)。
        </p>
    `,
    contentStyle: 'color:#444; line-height:1.6;'
};
