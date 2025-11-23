export const config = {
    id: 'win-billing',
    name: '消费账单',
    description: '费用统计',
    icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
    color: '#fdcb6e',
    system: true, // 💖 标记为系统应用
    showDesktopIcon: false, // 💖 不显示桌面图标
    showTaskbarIcon: false, // 💖 不显示任务栏图标
    pos: { x: 180, y: 20 },
    winPos: { x: 250, y: 250 },
    isOpen: false,
    openMsg: "账单助手已就位 💰",
    content: `
        <div style="padding: 15px; background: #2d3436; color: #dfe6e9; height: 100%;">
            <div class="bill-row bill-total" style="border-bottom: 1px solid #636e72; padding-bottom: 15px; margin-bottom: 15px;">
                <span style="color: #dfe6e9;">本月总消费</span>
                <span id="pop-total" style="color: #fdcb6e; text-shadow: 0 0 10px rgba(253, 203, 110, 0.4); font-size: 24px;">¥0.00</span>
            </div>
            <div class="bill-row" style="border-bottom: 1px solid #636e72;">
                <span style="color: #b2bec3;">网络流量费</span>
                <span id="pop-net" style="color: #fff;">¥0.00</span>
            </div>
            <div class="bill-row" style="border-bottom: 1px solid #636e72;">
                <span style="color: #b2bec3;">AI调用费</span>
                <span id="ai-cost" style="color: #fff;">¥0.00</span>
            </div>
            <div style="margin-top:20px; font-weight:bold; color:#fdcb6e; border-bottom: 1px solid #636e72; padding-bottom: 5px; font-size: 12px; letter-spacing: 1px;">DETAILS // LOGS</div>
            <div id="pop-models" style="margin-top:10px; max-height:180px; overflow-y:auto; font-family: monospace; font-size: 11px;">
                <!-- 详情内容将由 JS 动态填充 -->
                <div style="text-align: center; color: #636e72; padding: 10px;">NO DATA RECORDED</div>
            </div>
        </div>
    `,
    contentStyle: 'background: #2d3436; padding: 0;'
};
