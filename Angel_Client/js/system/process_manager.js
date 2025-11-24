import { bus } from './event_bus.js';

export const VERSION = '1.0.0'; // 💖 系统核心模块版本号

class ProcessManager {
    // =================================
    //  🎉 进程管理器 (Process Manager)
    //
    //  🎨 代码用途：
    //     实现“进程清理队列”模式。
    //     它维护着所有应用申请的资源列表（队列）。
    //     当应用关闭时，它负责清空该应用名下的所有资源队列。
    //
    //  💡 易懂解释：
    //     这是系统的“资源账房先生”。
    //     每个应用来借东西（定时器、监听器），都要先在账房登记。
    //     应用倒闭（关闭）时，账房先生会按账本把东西全收回来！🧾
    // =================================
    constructor() {
        // 📖 账本：Map<AppID, ResourceQueue>
        this.queues = new Map();
        // 📊 性能统计：Map<AppID, { cpuTime: number, lastActive: number, startTime: number, longTasks: number, longTaskTime: number, logs: Array }>
        this.stats = new Map();
    }

    /**
     * 📊 获取应用性能统计数据
     */
    getAppStats(appId) {
        if (!this.stats.has(appId)) {
            return { 
                cpuTime: 0, 
                lastActive: 0, 
                startTime: Date.now(),
                longTasks: 0,
                longTaskTime: 0,
                logs: []
            };
        }
        return this.stats.get(appId);
    }

    /**
     * 📊 获取应用资源统计数据
     * 返回该应用当前持有的资源句柄数量
     */
    getAppResourceCount(appId) {
        const queue = this.queues.get(appId);
        if (!queue) {
            return { timers: 0, events: 0, animations: 0, total: 0 };
        }
        const timers = queue.intervals.size + queue.timeouts.size;
        const events = queue.events.length + queue.busListeners.length;
        const animations = queue.animations.size;
        return {
            timers,
            events,
            animations,
            total: timers + events + animations
        };
    }

    /**
     * 📝 记录日志
     */
    _log(appId, type, message) {
        if (!this.stats.has(appId)) {
            this.stats.set(appId, { 
                cpuTime: 0, lastActive: Date.now(), startTime: Date.now(),
                longTasks: 0, longTaskTime: 0, logs: []
            });
        }
        const stat = this.stats.get(appId);
        const time = new Date().toLocaleTimeString();
        stat.logs.unshift(`[${time}] [${type}] ${message}`);
        if (stat.logs.length > 50) stat.logs.pop(); // 限制日志长度
    }

    /**
     * ⏱️ 记录执行时间 (内部辅助)
     */
    _measure(appId, fn) {
        const start = performance.now();
        try {
            fn();
        } finally {
            const end = performance.now();
            const duration = end - start;
            
            if (!this.stats.has(appId)) {
                this.stats.set(appId, { 
                    cpuTime: 0, lastActive: end, startTime: start,
                    longTasks: 0, longTaskTime: 0, logs: []
                });
            }
            const stat = this.stats.get(appId);
            stat.cpuTime += duration;
            stat.lastActive = end;

            // 🐢 检测长任务 (卡顿)
            if (duration > 50) {
                stat.longTasks++;
                stat.longTaskTime += duration;
                // this._log(appId, 'WARN', `检测到长任务: ${duration.toFixed(1)}ms`);
            }
        }
    }

    /**
     * 📝 获取应用的资源上下文 (Context)
     * 应用通过这个 Context 申请资源，无需手动管理清理
     */
    getContext(appId) {
        // ♻️ 生命周期管理：每次获取 Context 视为应用(重)启动
        // 强制重置性能统计，确保新进程从零开始记录
        this.stats.set(appId, { 
            cpuTime: 0, 
            lastActive: Date.now(), 
            startTime: Date.now(),
            longTasks: 0, 
            longTaskTime: 0, 
            logs: [] 
        });
        this._log(appId, 'SYS', '进程启动，性能统计已重置');

        // 如果是第一次来，先建个户头
        if (!this.queues.has(appId)) {
            this.queues.set(appId, {
                intervals: new Set(),
                timeouts: new Set(),
                animations: new Set(),
                events: [],
                busListeners: [], // 🚌 事件总线监听
                cleanups: []      // 🧹 自定义清理函数
            });
            this._log(appId, 'INFO', '进程上下文已创建');
        }

        // 返回一组封装好的 API
        return {
            id: appId,
            
            // 🕒 申请定时器
            setInterval: (callback, delay) => {
                const wrappedCallback = () => this._measure(appId, callback);
                const id = window.setInterval(wrappedCallback, delay);
                this._getQueue(appId).intervals.add(id);
                this._log(appId, 'RES', `申请定时器 (ID: ${id}, Delay: ${delay}ms)`);
                return id;
            },
            
            // ⏱️ 申请延时器 (自动防泄漏)
            setTimeout: (callback, delay) => {
                const wrappedCallback = () => {
                    this._getQueue(appId).timeouts.delete(id); // 执行后自动移除
                    this._measure(appId, callback);
                };
                const id = window.setTimeout(wrappedCallback, delay);
                this._getQueue(appId).timeouts.add(id);
                this._log(appId, 'RES', `申请延时器 (ID: ${id}, Delay: ${delay}ms)`);
                return id;
            },

            // 🎬 申请动画帧 (自动防泄漏)
            requestAnimationFrame: (callback) => {
                const wrappedCallback = (t) => {
                    this._getQueue(appId).animations.delete(id); // 执行后自动移除
                    this._measure(appId, () => callback(t));
                };
                const id = window.requestAnimationFrame(wrappedCallback);
                this._getQueue(appId).animations.add(id);
                // 动画帧太频繁，不记录日志以免刷屏
                return id;
            },

            // 👂 申请 DOM 事件监听
            addEventListener: (target, type, listener, options) => {
                const wrappedListener = (e) => this._measure(appId, () => listener(e));
                target.addEventListener(type, wrappedListener, options);
                this._getQueue(appId).events.push({ target, type, listener: wrappedListener, options });
                this._log(appId, 'RES', `监听 DOM 事件 (${type})`);
            },

            // 🚌 申请 EventBus 监听
            on: (event, callback) => {
                const wrappedCallback = (data) => this._measure(appId, () => callback(data));
                bus.on(event, wrappedCallback);
                this._getQueue(appId).busListeners.push({ event, callback: wrappedCallback });
                this._log(appId, 'RES', `订阅总线事件 (${event})`);
            },

            // 🧹 注册自定义清理函数
            onCleanup: (callback) => {
                this._getQueue(appId).cleanups.push(callback);
                this._log(appId, 'INFO', `注册清理钩子`);
            },

            // 🗑️ 手动清理（如果需要）
            clearInterval: (id) => {
                window.clearInterval(id);
                this._getQueue(appId).intervals.delete(id);
                this._log(appId, 'FREE', `释放定时器 (ID: ${id})`);
            },
            clearTimeout: (id) => {
                window.clearTimeout(id);
                this._getQueue(appId).timeouts.delete(id);
                this._log(appId, 'FREE', `释放延时器 (ID: ${id})`);
            },
            cancelAnimationFrame: (id) => {
                window.cancelAnimationFrame(id);
                this._getQueue(appId).animations.delete(id);
            },
            off: (event, callback) => {
                bus.off(event, callback);
                // 从列表中移除 (简单过滤)
                const q = this._getQueue(appId);
                q.busListeners = q.busListeners.filter(l => l.event !== event || l.callback !== callback);
                this._log(appId, 'FREE', `取消订阅事件 (${event})`);
            }
        };
    }

    /**
     * 💥 销毁应用进程
     * 清理该 AppID 下的所有资源队列
     */
    kill(appId) {
        const queue = this.queues.get(appId);
        if (!queue) return; // 户头不存在，直接返回

        this._log(appId, 'WARN', `正在强制终止进程...`);
        console.log(`[ProcessManager] 正在清理进程 ${appId} 的资源队列...`);

        // 1. 执行自定义清理函数 (最先执行，以便应用有机会做最后的操作)
        if (queue.cleanups) {
            queue.cleanups.forEach(cb => {
                try { cb(); } catch(e) { console.error(`[ProcessManager] Cleanup error for ${appId}:`, e); }
            });
        }

        // 2. 清理定时器
        queue.intervals.forEach(id => window.clearInterval(id));
        const timerCount = queue.intervals.size + queue.timeouts.size;
        queue.intervals.clear();

        // 3. 清理延时器
        queue.timeouts.forEach(id => window.clearTimeout(id));
        queue.timeouts.clear();

        // 4. 清理动画帧
        queue.animations.forEach(id => window.cancelAnimationFrame(id));
        queue.animations.clear();

        // 5. 清理 DOM 事件监听
        queue.events.forEach(({ target, type, listener, options }) => {
            if (target && typeof target.removeEventListener === 'function') {
                target.removeEventListener(type, listener, options);
            }
        });
        const eventCount = queue.events.length + queue.busListeners.length;
        queue.events = [];

        // 6. 清理 EventBus 监听
        if (queue.busListeners) {
            queue.busListeners.forEach(({ event, callback }) => bus.off(event, callback));
            queue.busListeners = [];
        }

        // 7. 删除户头
        this.queues.delete(appId);
        
        // 记录最后一条日志 (虽然户头删了，但 stats 还在)
        this._log(appId, 'SUCCESS', `进程已终止，回收资源: 定时器 ${timerCount}, 监听器 ${eventCount}`);
        console.log(`[ProcessManager] 进程 ${appId} 清理完毕 ✨`);
    }

    // 🔒 内部辅助：安全获取队列
    _getQueue(appId) {
        let queue = this.queues.get(appId);
        if (!queue) {
            // ♻️ 自动复活机制：
            // 如果队列不存在（已被 kill），但应用又尝试申请资源（说明是单例应用再次打开）
            // 我们需要重建队列，否则资源将无法被追踪和清理（导致内存泄漏）
            queue = {
                intervals: new Set(),
                timeouts: new Set(),
                animations: new Set(),
                events: [],
                busListeners: [],
                cleanups: []
            };
            this.queues.set(appId, queue);
            this._log(appId, 'INFO', '进程上下文已重建 (复活)');
        }
        return queue;
    }
}

export const pm = new ProcessManager();
