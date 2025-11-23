export const config = {
    id: 'win-billing',
    name: '消费账单',
    description: '费用统计',
    icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
    color: '#fdcb6e',
    system: true, // 💖 标记为系统应用
    showDesktopIcon: false, // 💖 不显示桌面图标
    showTaskbarIcon: false, // 💖 不显示任务栏图标
    frameless: true, // 💖 无边框窗口
    fixed: false, // 💖 取消固定，允许动态定位
    width: 200, // 📏 详情窗宽度
    height: 200, // 📏 详情窗高度
    pos: { x: 0, y: 0 },
    // winPos: { right: 10, bottom: 50 }, // 📍 移除固定位置，由点击事件动态计算
    isOpen: false, // 默认关闭
    openMsg: "",
    content: `
        <div style="padding: 15px; background: rgba(45, 52, 54, 0.95); color: #dfe6e9; border-radius: 8px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); height: 100%; display: flex; flex-direction: column;">
            <div style="font-size: 12px; color: #fdcb6e; margin-bottom: 10px; font-weight: bold;">BILLING DETAILS</div>
            
            <div style="flex: 1; overflow-y: auto; margin-bottom: 10px;">
                <div class="bill-row" style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px;">
                    <span style="color: #b2bec3;">Network</span>
                    <span id="pop-net" style="color: #fff;">¥0.00</span>
                </div>
                <div class="bill-row" style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px;">
                    <span style="color: #b2bec3;">AI Compute</span>
                    <span id="ai-cost" style="color: #fff;">¥0.00</span>
                </div>
                <div style="border-top: 1px solid #636e72; margin: 5px 0;"></div>
                <div id="pop-models" style="font-size: 10px; color: #aaa;">
                    <!-- 动态内容 -->
                </div>
            </div>

            <div style="border-top: 1px solid #636e72; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px;">TOTAL</span>
                <span id="pop-total" style="color: #fdcb6e; font-weight: bold; font-size: 16px;">¥0.00</span>
            </div>
        </div>
    `,
    contentStyle: 'background: transparent; padding: 0; box-shadow: none; border: none;'
};
