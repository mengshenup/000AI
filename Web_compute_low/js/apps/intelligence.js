export const config = {
    // =================================
    //  🎉 情报站配置 (Intelligence Config)
    //
    //  🎨 代码用途：
    //     定义“神谕节点”情报站的基础元数据和界面结构。
    //
    //  💡 易懂解释：
    //     这是游戏里的“任务日志”或者“攻略本”！它记录了所有发现的“老六点位”，你可以点击它们直接跳转到视频对应的进度~ 📓
    //
    //  ⚠️ 警告：
    //     数据现在存储在服务器端 (user_data/spots.json)，不再依赖 localStorage。
    // =================================
    id: 'win-intelligence', // 💖 窗口的唯一标识符
    name: '智慧锦囊', // 💖 窗口标题栏显示的名称
    version: '1.0.0', // 🆕 版本号
    description: '记录灵感与秘密的宝库', // 💖 功能描述
    icon: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z', // 💖 SVG 图标路径（消息气泡形状）
    color: '#00b894', // 💖 窗口的主题颜色（青绿色）
    pos: { x: 20, y: 200 }, // 💖 桌面图标的默认位置
    winPos: { x: 150, y: 150 }, // 💖 窗口打开时的默认屏幕坐标
    // openMsg: "智慧锦囊已打开，这里藏着通往成功的秘密哦！💡", // 💖 已移除，统一由 angel.js 管理
    content: `
        <!-- 💖 顶部操作栏 -->
        <div style="margin-bottom:10px; display:flex; gap:10px;">
            <!-- 💖 扫描按钮 -->
            <button id="btn-scan"
                style="flex:1; padding:8px; background:var(--primary-color); color:white; border:none; border-radius:4px; cursor:pointer;">
                📡 扫描老六点位
            </button>
            <!-- 💖 手动添加按钮 -->
            <button id="btn-add-custom"
                style="padding:8px; background:#00b894; color:white; border:none; border-radius:4px; cursor:pointer;">
                +
            </button>
        </div>
        <!-- 💖 情报列表容器 -->
        <div id="file-list" style="height:380px; overflow-y:auto;">
            <!-- 列表项由 JS 动态生成 -->
        </div>
    `
};

import { bus } from '../system/event_bus.js'; // 💖 导入事件总线
import { network } from '../system/network.js'; // 💖 导入网络模块

export const APP_NAME = 'Wisdom Pouch'; // 💖 导出应用名称常量
// export const APP_OPEN_MSG = "智慧锦囊已打开，这里藏着通往成功的秘密哦！💡"; // 💖 已移除

class IntelligenceApp {
    // =================================
    //  🎉 情报站应用类 (Intelligence App) (无参数)
    //
    //  🎨 代码用途：
    //     管理“情报站”APP的业务逻辑，包括点位列表的展示、添加、保存以及跳转功能。
    //
    //  💡 易懂解释：
    //     这是你的“情报中心”！收集、整理、展示所有重要的视频节点，让你不错过任何精彩瞬间~ 🕵️‍♀️
    //
    //  ⚠️ 警告：
    //     无
    // =================================
    constructor() {
        this.spots = []; // 💖 初始化为空数组，用于存储点位数据
        // 监听窗口就绪事件，替代 setTimeout
        bus.on(`app:ready:${config.id}`, () => this.init()); // 💖 注册初始化回调
    }

    // =================================
    //  🎉 初始化函数 (Initialize) (无参数)
    //
    //  🎨 代码用途：
    //     渲染列表，绑定按钮事件，并监听网络发来的新情报。
    //
    //  💡 易懂解释：
    //     情报站开张啦！把按钮接好，然后向总部（服务器）请求最新的情报数据~ 📥
    //
    //  ⚠️ 警告：
    //     网络请求有延迟，数据加载完成前列表可能是空的。
    // =================================
    init() {
        this.bindEvents(); // 💖 绑定按钮点击事件

        // 连接建立后，请求加载数据
        // 如果网络还没准备好，可以在 network 模块里加一个 onReady 回调，或者简单地延迟一下
        setTimeout(() => {
            network.send({ type: 'load_spots' }); // 💖 延迟 1 秒请求加载点位数据，确保网络连接已建立
        }, 1000);

        // 监听来自服务器的点位数据更新
        bus.on('net:update_spots', (data) => { // 👂 监听点位更新
            if (data.data) { // 💖 检查数据有效性
                this.spots = data.data; // 💖 更新本地点位数据
                this.renderList(); // 💖 重新渲染列表
                console.log("已同步服务端点位数据:", this.spots.length); // 💖 打印日志
            }
        });

        // 监听来自服务器的新情报 (扫描发现的)
        bus.on('net:new_intel', (data) => { // 👂 监听新情报
            this.addSpot(data.data); // 💖 将新发现的点位添加到列表
            bus.emit('system:speak', `发现新点位：${data.data.name}`); // 💖 语音播报新发现
        });

        // 监听来自 Gemini 的分析结果
        bus.on('net:analysis_result', (data) => { // 👂 监听分析结果
            if (data.result && data.result.spots) { // 💖 检查分析结果是否包含点位
                // 遍历分析出的所有点位
                data.result.spots.forEach(spot => { // 🔄 遍历点位
                    this.addSpot({ // 💖 添加每一个分析出的点位
                        name: spot.description.substring(0, 15) + "...", // 💖 截取简短名称作为标题
                        full_text: spot.description, // 💖 保存完整描述
                        // 将秒数格式化为 MM:SS 字符串
                        time_str: `${Math.floor(spot.timestamp / 60)}:${(spot.timestamp % 60).toString().padStart(2, '0')}`, // 💖 格式化时间
                        raw_time: spot.timestamp, // 💖 保存原始秒数用于跳转
                        url: window.current_browser_url || "https://www.douyin.com/" // 💖 记录来源URL，默认为抖音
                    });
                });
                bus.emit('system:speak', `分析完成，已收录 ${data.result.spots.length} 个点位`); // 💖 语音播报分析结果
            }
        });
    }

    // =================================
    //  🎉 绑定事件 (Bind Events) (无参数)
    //
    //  🎨 代码用途：
    //     给界面上的“扫描”和“手动添加”按钮绑定点击处理函数。
    //
    //  💡 易懂解释：
    //     让按钮活起来！点“扫描”就开始干活，点“+”就能自己写情报~ 🖱️
    //
    //  ⚠️ 警告：
    //     依赖 DOM 元素 ID btn-scan 和 btn-add-custom。
    // =================================
    bindEvents() {
        // 获取扫描按钮
        const btnScan = document.getElementById('btn-scan'); // 💖 获取扫描按钮 DOM
        if (btnScan) { // ✅ 如果按钮存在
            btnScan.onclick = () => { // 🖱️ 绑定点击事件
                network.send({ type: 'start_scan' }); // 💖 发送扫描指令给服务器
                bus.emit('system:speak', "正在扫描老六点位..."); // 💖 语音提示正在扫描
            };
        }

        // 获取手动添加按钮
        const btnAdd = document.getElementById('btn-add-custom'); // 💖 获取添加按钮 DOM
        if (btnAdd) { // ✅ 如果按钮存在
            btnAdd.onclick = () => { // 🖱️ 绑定点击事件
                // 弹出输入框询问名称
                const name = prompt("请输入点位名称/描述:"); // 💖 提示用户输入名称
                if (name) { // ✅ 如果输入了名称
                    // 弹出输入框询问时间
                    const timeStr = prompt("请输入时间戳 (例如 1:30):", "0:00"); // 💖 提示用户输入时间
                    let seconds = 0; // ⏱️ 初始化秒数
                    try {
                        // 解析 MM:SS 格式为秒数
                        const parts = timeStr.split(':'); // 💖 分割分和秒
                        seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]); // 💖 计算总秒数
                    } catch (e) { seconds = 0; } // 💖 解析失败默认为 0

                    // 添加点位
                    this.addSpot({
                        name: name, // 💖 点位名称
                        full_text: name, // 💖 完整描述
                        time_str: timeStr, // 💖 时间字符串
                        raw_time: seconds, // 💖 时间秒数
                        url: "Manual Entry" // 💖 来源标记为手动录入
                    });
                }
            };
        }
    }

    // =================================
    //  🎉 添加点位 (Add Spot) (spotData: 点位数据对象)
    //
    //  🎨 代码用途：
    //     将新点位加入列表（去重），保存并刷新界面。
    //
    //  💡 易懂解释：
    //     在小本本上记下一条新线索！如果这条线索已经记过了，就不重复记了哦~ 📝
    //
    //  ⚠️ 警告：
    //     会修改 this.spots 数组并触发网络保存。
    // =================================
    addSpot(spotData) {
        // 查重：如果名称和时间都一样，就不重复添加
        if (this.spots.some(s => s.name === spotData.name && s.raw_time === spotData.raw_time)) { // 🔍 检查重复
            return; // 💖 发现重复，直接返回
        }

        // 补充元数据
        spotData.id = Date.now() + Math.random(); // 💖 生成唯一ID，防止冲突
        spotData.added_at = new Date().toLocaleString(); // 💖 记录添加时间，格式化为本地字符串

        this.spots.unshift(spotData); // 💖 添加到数组开头（最新的在最前）
        this.save(); // 💖 保存到服务器
        this.renderList(); // 💖 刷新界面
    }

    // =================================
    //  🎉 保存数据 (Save Data) (无参数)
    //
    //  🎨 代码用途：
    //     将当前的点位列表数据发送给服务器进行持久化存储。
    //
    //  💡 易懂解释：
    //     把小本本交给管家（服务器）保管，防止丢失！💾
    //
    //  ⚠️ 警告：
    //     全量覆盖保存，如果多端同时操作可能会有冲突风险。
    // =================================
    save() {
        network.send({
            type: 'save_spots', // 💖 消息类型：保存点位
            data: this.spots // 💖 消息内容：完整的点位数组
        });
    }

    // =================================
    //  🎉 渲染列表 (Render List) (无参数)
    //
    //  🎨 代码用途：
    //     将点位数组转换为 HTML 元素显示在界面上。
    //
    //  💡 易懂解释：
    //     把小本本上的字写到屏幕上，让你可以看到每一条情报~ 📜
    //
    //  ⚠️ 警告：
    //     每次调用都会清空并重新生成整个列表 DOM，数据量大时可能会有性能影响。
    // =================================
    renderList() {
        const container = document.getElementById('file-list'); // 💖 获取列表容器 DOM
        if (!container) return; // 💖 容器不存在则返回

        // 如果没有数据，显示空状态提示
        if (this.spots.length === 0) { // ✅ 如果列表为空
            container.innerHTML = '<div style="text-align:center; color:#aaa; margin-top:60px;">(｡•́︿•̀｡) 暂无数据</div>'; // 💖 显示颜文字卖萌
            return; // 🛑 结束
        }

        container.innerHTML = ''; // 💖 清空容器现有内容

        // 遍历数据生成列表项
        this.spots.forEach(spot => { // 🔄 遍历点位
            const el = document.createElement('div'); // 💖 创建列表项容器
            el.className = 'file-item'; // 💖 添加样式类
            // 设置内联样式 (也可以写在 CSS 里)
            el.style.padding = '10px'; // 💖 内边距
            el.style.borderBottom = '1px solid #eee'; // 💖 底部边框
            el.style.cursor = 'pointer'; // 💖 鼠标手型
            el.style.display = 'flex'; // 💖 Flex 布局
            el.style.justifyContent = 'space-between'; // 💖 两端对齐
            el.style.alignItems = 'center'; // 💖 垂直居中

            // 填充内容
            el.innerHTML = `
                    <div>
                        <div style="font-weight:bold; color:#333;">${spot.name}</div> <!-- 💖 显示名称 -->
                        <div style="font-size:12px; color:#888;">${spot.time_str} | ${spot.added_at}</div> <!-- 💖 显示时间和添加日期 -->
                    </div>
                    <button style="padding:4px 8px; background:#00b894; color:white; border:none; border-radius:4px;">跳转</button> <!-- 💖 跳转按钮 -->
                `;

            // 点击整个条目触发跳转
            el.onclick = () => { // 🖱️ 绑定点击事件
                this.jumpTo(spot); // 💖 执行跳转逻辑
            };

            container.appendChild(el); // 💖 将列表项添加到容器
        });
    }

    // =================================
    //  🎉 跳转到点位 (Jump To) (spot: 点位对象)
    //
    //  🎨 代码用途：
    //     发送跳转指令给服务器，控制浏览器播放视频到指定时间。
    //
    //  💡 易懂解释：
    //     时光穿梭！瞬间回到那个精彩的时刻~ 🚀
    //
    //  ⚠️ 警告：
    //     需要浏览器端配合支持 video_jump 指令。
    // =================================
    jumpTo(spot) {
        console.log("Jumping to:", spot); // 💖 打印跳转日志
        // 发送 video_jump 指令
        network.send({
            type: 'video_jump', // 💖 消息类型：视频跳转
            timestamp: spot.raw_time // 💖 跳转目标时间戳
        });
        bus.emit('system:speak', `正在跳转到 ${spot.time_str}`); // 💖 语音提示正在跳转
    }
}

export const app = new IntelligenceApp(); // 💖 导出应用实例
