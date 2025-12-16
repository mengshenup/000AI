/**
 * @fileoverview Intelligence 分子入口
 * @description 组合所有情报站原子，提供统一接口
 * @module apps/intelligence/index
 */

import { bus } from '../../system/event_bus.js';
import { network } from '../../system/network.js';
import { config } from './config.js';

export const VERSION = '1.0.0';
export { config };
export const APP_NAME = 'Wisdom Pouch';

class IntelligenceApp {
    constructor() {
        this.spots = [];
        // 🧱 [2025-12-17] 修复: 监听 app:ready 和 app:opened 两个事件
        bus.on(`app:ready:${config.id}`, () => this.init());
        bus.on('app:opened', (data) => {
            if (data.id === config.id) this.init();
        });
    }

    init() {
        this.bindEvents();
        setTimeout(() => network.send({ type: 'load_spots' }), 1000);

        bus.on('net:update_spots', (data) => {
            if (data.data) {
                this.spots = data.data;
                this.renderList();
            }
        });

        bus.on('net:new_intel', (data) => {
            this.addSpot(data.data);
            bus.emit('system:speak', `发现新点位：${data.data.name}`);
        });

        bus.on('net:analysis_result', (data) => {
            if (data.result && data.result.spots) {
                data.result.spots.forEach(spot => {
                    this.addSpot({
                        name: spot.description.substring(0, 15) + "...",
                        full_text: spot.description,
                        time_str: `${Math.floor(spot.timestamp / 60)}:${(spot.timestamp % 60).toString().padStart(2, '0')}`,
                        raw_time: spot.timestamp,
                        url: window.current_browser_url || "https://www.douyin.com/"
                    });
                });
                bus.emit('system:speak', `分析完成，已收录 ${data.result.spots.length} 个点位`);
            }
        });
    }

    bindEvents() {
        document.getElementById('btn-scan')?.addEventListener('click', () => {
            network.send({ type: 'start_scan' });
            bus.emit('system:speak', "正在扫描老六点位...");
        });

        document.getElementById('btn-add-custom')?.addEventListener('click', () => {
            const name = prompt("请输入点位名称/描述:");
            if (name) {
                const timeStr = prompt("请输入时间戳 (例如 1:30):", "0:00");
                let seconds = 0;
                try {
                    const parts = timeStr.split(':');
                    seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                } catch (e) { seconds = 0; }

                this.addSpot({
                    name, full_text: name, time_str: timeStr, raw_time: seconds, url: "Manual Entry"
                });
            }
        });
    }

    addSpot(spotData) {
        if (this.spots.some(s => s.name === spotData.name && s.raw_time === spotData.raw_time)) return;

        spotData.id = Date.now() + Math.random();
        spotData.added_at = new Date().toLocaleString();

        this.spots.unshift(spotData);
        this.save();
        this.renderList();
    }

    save() {
        network.send({ type: 'save_spots', data: this.spots });
    }

    renderList() {
        const container = document.getElementById('file-list');
        if (!container) return;

        if (this.spots.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#aaa; margin-top:60px;">(｡•́︿•̀｡) 暂无数据</div>';
            return;
        }

        container.innerHTML = '';
        this.spots.forEach(spot => {
            const el = document.createElement('div');
            el.className = 'file-item';
            el.style.cssText = 'padding:10px; border-bottom:1px solid #eee; cursor:pointer; display:flex; justify-content:space-between; align-items:center;';
            el.innerHTML = `
                <div>
                    <div style="font-weight:bold; color:#333;">${spot.name}</div>
                    <div style="font-size:12px; color:#888;">${spot.time_str} | ${spot.added_at}</div>
                </div>
                <button style="padding:4px 8px; background:#00b894; color:white; border:none; border-radius:4px;">跳转</button>
            `;
            el.onclick = () => this.jumpTo(spot);
            container.appendChild(el);
        });
    }

    jumpTo(spot) {
        network.send({ type: 'video_jump', timestamp: spot.raw_time });
        bus.emit('system:speak', `正在跳转到 ${spot.time_str}`);
    }
}

export const app = new IntelligenceApp();
