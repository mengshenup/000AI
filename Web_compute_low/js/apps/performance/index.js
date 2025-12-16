/**
 * @fileoverview Performance 分子入口
 * @description 组合所有性能调优原子，提供统一接口
 * @module apps/performance/index
 */

import { bus } from '../../system/event_bus.js';
import { pm } from '../../system/process_manager.js';
import { config } from './config.js';
import { content } from './template.js';
import { updateSystemInfo } from './sysinfo.js';

export const VERSION = '1.0.0';
export { config };

// 合并 content 到 config
config.content = content;

export class PerformanceApp {
    constructor() {
        this.id = config.id;
        this.ctx = pm.getContext(this.id);
        
        // 🧱 [2025-12-17] 修复: 监听 app:ready 和 app:opened 两个事件
        const initApp = () => {
            this.init();
            updateSystemInfo();
        };
        bus.on(`app:ready:${this.id}`, initApp);
        bus.on('app:opened', (data) => {
            if (data.id === this.id) initApp();
        });
    }

    init() {
        this.loadSettings();
        this.bindEvents();
    }

    loadSettings() {
        const perfMode = localStorage.getItem('angel_performance_mode') || 'high';
        this.updatePerfBtns(perfMode);

        const forceCpu = localStorage.getItem('angel_force_cpu') === 'true';
        const chkCpu = document.getElementById('chk-force-cpu');
        if (chkCpu) chkCpu.checked = forceCpu;
    }


    bindEvents() {
        const btnHigh = document.getElementById('btn-perf-high');
        const btnLow = document.getElementById('btn-perf-low');

        const setMode = (mode) => {
            localStorage.setItem('angel_performance_mode', mode);
            this.updatePerfBtns(mode);
            bus.emit('config:changed', { key: 'perfMode', value: mode });
        };

        if (btnHigh) btnHigh.onclick = () => setMode('high');
        if (btnLow) btnLow.onclick = () => setMode('low');

        const chkCpu = document.getElementById('chk-force-cpu');
        if (chkCpu) {
            chkCpu.onchange = (e) => {
                const isChecked = e.target.checked;
                localStorage.setItem('angel_force_cpu', isChecked);
                if (confirm("切换兼容模式需要重启小天使才能生效。是否立即重启小天使？")) {
                    bus.emit('angel:reset');
                    location.reload();
                }
            };
        }

        const btnReset = document.getElementById('btn-reset-angel');
        if (btnReset) {
            btnReset.onclick = () => bus.emit('angel:reset');
        }
    }

    updatePerfBtns(mode) {
        const btnHigh = document.getElementById('btn-perf-high');
        const btnLow = document.getElementById('btn-perf-low');
        if (!btnHigh || !btnLow) return;

        if (mode === 'high') {
            btnHigh.classList.add('active');
            btnLow.classList.remove('active');
        } else {
            btnHigh.classList.remove('active');
            btnLow.classList.add('active');
        }
    }
}

export const app = new PerformanceApp();

// 导出原子
export { updateSystemInfo } from './sysinfo.js';
