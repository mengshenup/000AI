import { bus } from '../event_bus.js'; // 💖 导入事件总线

export const config = {
    // =================================
    //  🎉 说明书配置 (ID, 名称, 图标...)
    //
    //  🎨 代码用途：
    //     定义“启示录”说明书的基础元数据和静态 HTML 内容
    //
    //  💡 易懂解释：
    //     这是新手村的“引导员”！告诉你怎么操作这个系统，怎么跟小天使玩耍~ 📖
    //
    //  ⚠️ 警告：
    //     内容是硬编码的 HTML，修改文案直接改 content 属性即可。
    // =================================
    id: 'win-manual', // 💖 窗口的唯一标识符
    name: '光明指引', // 💖 窗口标题栏显示的名称
    description: '照亮前行之路的操作指南', // 💖 功能描述
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z', // 💖 SVG 图标路径（信息符号）
    color: '#0984e3', // 💖 窗口的主题颜色（蓝色）
    pos: { x: 20, y: 20 }, // 💖 桌面图标的默认位置
    winPos: { x: 100, y: 50 }, // 💖 窗口打开时的默认屏幕坐标
    // openMsg: "光明指引已开启，让我来为你照亮前行的路！🕯️", // 💖 已移除，统一由 angel.js 管理
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
            请前往 <b>“性能调优”</b> 应用 (仪表盘图标)。
        </p>
    `, // 💖 窗口显示的 HTML 内容
    contentStyle: 'color:#444; line-height:1.6;' // 💖 窗口内容的 CSS 样式
};

class ManualApp {
    // =================================
    //  🎉 说明书应用类 (无参数)
    //
    //  🎨 代码用途：
    //     管理“系统说明书”APP的业务逻辑
    //
    //  💡 易懂解释：
    //     这是一本电子书！目前只能看，以后可能会加上搜索功能，让你能快速找到想看的内容~ 📚
    //
    //  ⚠️ 警告：
    //     目前此类几乎为空，因为说明书的内容主要是静态 HTML。
    // =================================
    constructor() {
        // 💖 监听窗口就绪事件
        // bus.on(`app:ready:${config.id}`, () => this.updateSystemInfo()); // 🚫 已移除，功能迁移至 performance.js
    }
}

export const app = new ManualApp(); // 💖 导出应用实例
