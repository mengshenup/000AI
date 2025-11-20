import { WS_URL } from './config.js';
import { bus } from './event_bus.js';

export class Network {
    constructor() {
        this.ws = null;
        this.reconnectTimer = null;
    }

    connect() {
        try {
            this.ws = new WebSocket(WS_URL);
            
            this.ws.onopen = () => {
                console.log("WS Connected");
                bus.emit('system:speak', "网络接通！信号满格📶");
            };
            
            this.ws.onmessage = (e) => {
                const d = JSON.parse(e.data);
                
                // 分发事件，不再直接操作 DOM
                if(d._stats) bus.emit('net:stats', d._stats);
                if(d.type === 'log') bus.emit('system:speak', d.msg);
                if(d.type === 'frame_update') bus.emit('net:frame', d.image);
                if(d.type === 'new_intel') bus.emit('net:intel', d.data);
            };

            this.ws.onclose = () => {
                console.log("WS Closed, retrying...");
                bus.emit('system:speak', "网络中断，正在重连...📡");
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = setTimeout(() => this.connect(), 3000);
            };
        } catch(e) {
            console.error(e);
        }
    }

    send(type, payload = {}) {
        if(this.ws && this.ws.readyState === 1) {
            this.ws.send(JSON.stringify({type, ...payload}));
        } else {
            bus.emit('system:speak', "网络未连接，无法发送指令❌");
        }
    }
}