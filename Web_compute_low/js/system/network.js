import { WS_URL } from './config.js'; // 🌐 导入 WebSocket 服务器地址配置
import { bus } from './event_bus.js'; // 🚌 导入事件总线，用于通知其他模块

export class Network {
    // =================================
    //  🎉 网络管理类 (无参数)
    //
    //  🎨 代码用途：
    //     管理 WebSocket 连接，负责与服务器进行双向通信。
    //
    //  💡 易懂解释：
    //     这是小天使的“电话线”。它负责拨通服务器的电话，把你的指令传过去，再把服务器的消息传回来。
    //
    //  ⚠️ 警告：
    //     如果网络断开，它会自动尝试重连。
    // =================================
    constructor() {
        this.ws = null; // 🔌 WebSocket 实例容器
        this.reconnectTimer = null; // ⏱️ 重连定时器
    }

    connect() {
        // =================================
        //  🎉 连接 (无参数)
        //
        //  🎨 代码用途：
        //     建立 WebSocket 连接，并绑定 open, message, close 等事件处理函数。
        //     自动生成或读取 user_id，实现多用户隔离。
        //
        //  💡 易懂解释：
        //     拨打电话。如果通了就喊一声“信号满格”，如果断了就过一会再拨。
        //
        //  ⚠️ 警告：
        //     如果连接已经存在，不会自动关闭旧连接，可能导致重复连接。
        // =================================

        try {
            // 1. 获取或生成 User ID
            let userId = localStorage.getItem('angel_user_id');
            if (!userId) {
                userId = 'user_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('angel_user_id', userId);
            }
            console.log(`🆔 Current User ID: ${userId}`);

            // 2. 创建 WebSocket 连接对象 (带上 User ID 和 Token)
            // 注意：WS_URL 默认为 ws://localhost:8000/ws，我们需要拼接 ID
            // 如果 WS_URL 结尾没有 /，补一个
            const baseUrl = WS_URL.endsWith('/') ? WS_URL : WS_URL + '/';
            
            // 获取 Token
            const token = localStorage.getItem('angel_auth_token') || '';
            
            // 拼接 URL: ws://host:port/ws/{user_id}?token=...
            const finalUrl = `${baseUrl}${userId}?token=${encodeURIComponent(token)}`;
            
            this.ws = new WebSocket(finalUrl); // 📞 拨号

            // 💓 启动心跳
            this.startHeartbeat();

            // 当连接成功建立时触发
            this.ws.onopen = () => {
                console.log("WS Connected"); // 📝 控制台打印日志
                // 通知小天使说话
                bus.emit('system:speak', "网络接通！信号满格📶"); // 🗣️ 语音播报
            };

            // 当收到服务器消息时触发
            this.ws.onmessage = (e) => {
                // 解析收到的 JSON 字符串数据
                const d = JSON.parse(e.data); // 📦 拆包

                // 分发事件，不再直接操作 DOM，而是通过事件总线通知其他模块
                if (d._stats) bus.emit('net:stats', d._stats); // 📊 更新网络统计
                if (d.type === 'log') bus.emit('system:speak', d.msg); // 🗣️ 系统日志消息 -> 小天使说话
                if (d.type === 'vision') bus.emit('net:frame', d.frame); // 🖼️ 视频帧更新 (后端改为 vision + frame)
                if (d.type === 'frame_update') bus.emit('net:frame', d.image); // 🖼️ 兼容旧协议
                if (d.type === 'new_intel') bus.emit('net:intel', d.data); // 🧠 发现新情报
                if (d.type === 'url_update') bus.emit('net:url_update', d.url); // 🔗 URL 更新
                if (d.type === 'status') bus.emit('net:status', d.msg); // ⚡ 状态更新
            };

            // 当连接关闭时触发
            this.ws.onclose = () => {
                console.log("WS Closed, retrying..."); // 📝 打印日志
                if (this.heartbeatTimer) clearInterval(this.heartbeatTimer); // 🛑 停止心跳
                bus.emit('system:speak', "网络中断，正在重连...📡"); // 🗣️ 通知用户

                // 清除旧的定时器，防止重复
                clearTimeout(this.reconnectTimer); // 🛑 停止旧计时器
                // 设置 3 秒后尝试重新连接
                this.reconnectTimer = setTimeout(() => this.connect(), 3000); // 🔄 3秒后重连
            };
        } catch (e) {
            // 捕获连接过程中的同步错误
            console.error(e); // ❌ 打印错误
        }
    }

    // 💓 心跳机制
    startHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000); // 每 30 秒发送一次心跳
    }

    send(arg1, arg2 = {}) {
        // =================================
        //  🎉 发送 (类型/对象, [负载数据])
        //
        //  🎨 代码用途：
        //     向服务器发送 JSON 格式的指令。支持两种调用方式：
        //     1. send('cmd', {data: 1})
        //     2. send({type: 'cmd', data: 1})
        //
        //  💡 易懂解释：
        //     对着电话筒说话。把你的命令打包成一个包裹寄给服务器。
        //
        //  ⚠️ 警告：
        //     如果连接未就绪 (readyState !== 1)，消息会被丢弃并提示错误。
        // =================================

        let type, payload;
        // 判断第一个参数是否为对象，以支持不同的调用习惯
        if (typeof arg1 === 'object') {
            type = arg1.type; // 🏷️ 从对象中提取 type
            payload = arg1;   // 📦 整个对象作为 payload
        } else {
            type = arg1;      // 🏷️ 第一个参数是 type 字符串
            payload = arg2;   // 📦 第二个参数是数据对象
        }

        // 检查 WebSocket 是否存在且处于连接打开状态 (readyState 1)
        if (this.ws && this.ws.readyState === 1) {
            // 构造最终要发送的数据对象，确保包含 type 字段
            const data = { ...payload, type }; // 🎁 打包数据
            // 将对象转换为 JSON 字符串并发送
            this.ws.send(JSON.stringify(data)); // 📨 发送包裹
        } else {
            // 如果没连接，通知用户
            bus.emit('system:speak', "网络未连接，无法发送指令❌"); // 🗣️ 报错
        }
    }
}

// 导出 Network 类的单例实例，确保整个应用只使用一个网络连接
export const network = new Network(); // 🌐 全局唯一的网络实例

export const VERSION = '1.0.0'; // 💖 系统核心模块版本号
