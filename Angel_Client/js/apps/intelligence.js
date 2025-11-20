import { bus } from '../event_bus.js'; // 导入事件总线
import { network } from '../network.js'; // 导入网络模块

class IntelligenceApp {
    // ---------------------------------------------------------------- //
    //  情报应用类()
    //
    //  函数用处：
    //     管理“情报站”APP的业务逻辑。包括点位列表的展示、添加、保存以及跳转功能。
    //
    //  易懂解释：
    //     这是游戏里的“任务日志”或者“攻略本”。
    //     它记录了所有发现的“老六点位”，你可以点击它们直接跳转到视频对应的进度。
    //
    //  警告：
    //     依赖 localStorage 存储数据，清空浏览器缓存会导致数据丢失。
    // ---------------------------------------------------------------- //
    constructor() {
        // 从 localStorage 读取保存的点位列表，如果没有则初始化为空数组
        this.spots = JSON.parse(localStorage.getItem('angel_intel_spots') || '[]');
        // 初始化应用
        this.init();
    }

    init() {
        // ---------------------------------------------------------------- //
        //  初始化()
        //
        //  函数用处：
        //     渲染列表，绑定按钮事件，并监听网络发来的新情报。
        //
        //  易懂解释：
        //     应用启动时的准备工作。把以前记的小本本拿出来翻开，然后竖起耳朵听有没有新消息。
        //
        //  警告：
        //     如果 DOM 元素还没加载完成（例如脚本在 head 中运行），这里可能会找不到元素导致报错。
        // ---------------------------------------------------------------- //

        this.renderList(); // 首次渲染列表
        this.bindEvents(); // 绑定按钮点击事件

        // 监听来自服务器的新情报 (扫描发现的)
        bus.on('net:new_intel', (data) => {
            this.addSpot(data.data); // 添加到列表
            bus.emit('system:speak', `发现新点位：${data.data.name}`); // 语音提示
        });

        // 监听来自 Gemini 的分析结果
        bus.on('net:analysis_result', (data) => {
            if (data.result && data.result.spots) {
                // 遍历分析出的所有点位
                data.result.spots.forEach(spot => {
                    this.addSpot({
                        name: spot.description.substring(0, 15) + "...", // 截取简短名称
                        full_text: spot.description, // 保存完整描述
                        // 将秒数格式化为 MM:SS 字符串
                        time_str: `${Math.floor(spot.timestamp / 60)}:${(spot.timestamp % 60).toString().padStart(2, '0')}`,
                        raw_time: spot.timestamp, // 原始秒数
                        url: window.current_browser_url || "https://www.douyin.com/" // 记录来源URL
                    });
                });
                bus.emit('system:speak', `分析完成，已收录 ${data.result.spots.length} 个点位`);
            }
        });
    }

    bindEvents() {
        // ---------------------------------------------------------------- //
        //  绑定事件()
        //
        //  函数用处：
        //     给界面上的“扫描”和“手动添加”按钮绑定点击处理函数。
        //
        //  易懂解释：
        //     告诉按钮：“如果有人按你，你就这么做...”。
        //
        //  警告：
        //     必须确保 HTML 中存在 id 为 'btn-scan' 和 'btn-add-custom' 的元素，否则无法绑定。
        // ---------------------------------------------------------------- //

        // 获取扫描按钮
        const btnScan = document.getElementById('btn-scan');
        if (btnScan) {
            btnScan.onclick = () => {
                network.send({ type: 'start_scan' }); // 发送扫描指令
                bus.emit('system:speak', "正在扫描老六点位..."); // 语音提示
            };
        }

        // 获取手动添加按钮
        const btnAdd = document.getElementById('btn-add-custom');
        if (btnAdd) {
            btnAdd.onclick = () => {
                // 弹出输入框询问名称
                const name = prompt("请输入点位名称/描述:");
                if (name) {
                    // 弹出输入框询问时间
                    const timeStr = prompt("请输入时间戳 (例如 1:30):", "0:00");
                    let seconds = 0;
                    try {
                        // 解析 MM:SS 格式为秒数
                        const parts = timeStr.split(':');
                        seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                    } catch (e) { seconds = 0; }

                    // 添加点位
                    this.addSpot({
                        name: name,
                        full_text: name,
                        time_str: timeStr,
                        raw_time: seconds,
                        url: "Manual Entry"
                    });
                }
            };
        }
    }

    addSpot(spotData) {
        // ---------------------------------------------------------------- //
        //  添加点位(点位数据对象)
        //
        //  函数用处：
        //     将新点位加入列表（去重），保存并刷新界面。
        //
        //  易懂解释：
        //     在小本本上记下一条新线索。如果这条线索已经记过了，就不重复记了。
        //
        //  警告：
        //     去重逻辑仅基于 'name' 和 'raw_time'，如果这两个字段相同则视为重复。
        // ---------------------------------------------------------------- //

        // 查重：如果名称和时间都一样，就不重复添加
        if (this.spots.some(s => s.name === spotData.name && s.raw_time === spotData.raw_time)) {
            return;
        }

        // 补充元数据
        spotData.id = Date.now() + Math.random(); // 生成唯一ID
        spotData.added_at = new Date().toLocaleString(); // 记录添加时间

        this.spots.unshift(spotData); // 添加到数组开头（最新的在最前）
        this.save(); // 保存到 localStorage
        this.renderList(); // 刷新界面
    }

    save() {
        // ---------------------------------------------------------------- //
        //  保存()
        //
        //  函数用处：
        //     持久化存储点位数据到浏览器的 localStorage 中。
        //
        //  易懂解释：
        //     把记在脑子里的东西写到硬盘上，这样关机也不会忘。
        //
        //  警告：
        //     localStorage 容量有限（通常 5MB），如果存储大量数据可能会失败。
        // ---------------------------------------------------------------- //

        localStorage.setItem('angel_intel_spots', JSON.stringify(this.spots));
    }

    renderList() {
        // ---------------------------------------------------------------- //
        //  渲染列表()
        //
        //  函数用处：
        //     将点位数组转换为 HTML 元素显示在界面上。
        //
        //  易懂解释：
        //     把小本本上的字写到黑板上，让大家都能看见。
        //
        //  警告：
        //     每次调用都会清空并重新生成整个列表，数据量大时可能会有性能影响。
        // ---------------------------------------------------------------- //

        const container = document.getElementById('file-list'); // 获取列表容器
        if (!container) return;

        // 如果没有数据，显示空状态提示
        if (this.spots.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#aaa; margin-top:60px;">(｡•́︿•̀｡) 暂无数据</div>';
            return;
        }

        container.innerHTML = ''; // 清空容器

        // 遍历数据生成列表项
        this.spots.forEach(spot => {
            const el = document.createElement('div');
            el.className = 'file-item'; // 样式类
            // 设置内联样式 (也可以写在 CSS 里)
            el.style.padding = '10px';
            el.style.borderBottom = '1px solid #eee';
            el.style.cursor = 'pointer';
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'center';

            // 填充内容
            el.innerHTML = `
                <div>
                    <div style="font-weight:bold; color:#333;">${spot.name}</div>
                    <div style="font-size:12px; color:#888;">${spot.time_str} | ${spot.added_at}</div>
                </div>
                <button style="padding:4px 8px; background:#00b894; color:white; border:none; border-radius:4px;">跳转</button>
            `;

            // 点击整个条目触发跳转
            el.onclick = () => {
                this.jumpTo(spot);
            };

            container.appendChild(el);
        });
    }

    jumpTo(spot) {
        // ---------------------------------------------------------------- //
        //  跳转(点位对象)
        //
        //  函数用处：
        //     发送跳转指令给服务器，控制浏览器播放视频到指定时间。
        //
        //  易懂解释：
        //     像遥控器一样，直接把电影进度条拖到精彩的地方。
        //
        //  警告：
        //     如果视频页面未打开或不支持跳转，此操作可能无效。
        // ---------------------------------------------------------------- //

        console.log("Jumping to:", spot);
        // 发送 video_jump 指令
        network.send({
            type: 'video_jump',
            timestamp: spot.raw_time
        });
        bus.emit('system:speak', `正在跳转到 ${spot.time_str}`); // 语音提示
    }
}

// 导出单例
export const intelligenceApp = new IntelligenceApp();
