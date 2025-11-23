import { bus } from './event_bus.js';

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
        // 📊 性能统计：Map<AppID, { cpuTime: number, lastActive: number, startTime: number }>
        this.stats = new Map();
    }

    /**
     * 📊 获取应用性能统计数据
     */
    getAppStats(appId) {
        if (!this.stats.has(appId)) {
            return { cpuTime: 0, lastActive: 0, startTime: Date.now() };
        }
        return this.stats.get(appId);
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
                this.stats.set(appId, { cpuTime: 0, lastActive: end, startTime: start });
            }
            const stat = this.stats.get(appId);
            stat.cpuTime += duration;
            stat.lastActive = end;
        }
    }

    /**
     * 📝 获取应用的资源上下文 (Context)
     * 应用通过这个 Context 申请资源，无需手动管理清理
     */
    getContext(appId) {
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
        }

        // 返回一组封装好的 API
        return {
            id: appId,
            
            // 🕒 申请定时器
            setInterval: (callback, delay) => {
                const wrappedCallback = () => this._measure(appId, callback);
                const id = window.setInterval(wrappedCallback, delay);
                this._getQueue(appId).intervals.add(id);
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
                return id;
            },

            // 👂 申请 DOM 事件监听
            addEventListener: (target, type, listener, options) => {
                const wrappedListener = (e) => this._measure(appId, () => listener(e));
                target.addEventListener(type, wrappedListener, options);
                // 注意：这里存的是 wrappedListener，以便 removeEventListener 能正确工作
                // 但为了简单起见，我们这里存原始引用可能无法移除 wrappedListener
                // 这是一个简化的实现，通常需要 Map 来映射 original -> wrapped
                // 鉴于 PM 主要用于 kill 时的暴力清理，这里暂不处理 removeEventListener 的精确匹配
                this._getQueue(appId).events.push({ target, type, listener: wrappedListener, options });
            },

            // 🚌 申请 EventBus 监听
            on: (event, callback) => {
                const wrappedCallback = (data) => this._measure(appId, () => callback(data));
                bus.on(event, wrappedCallback);
                this._getQueue(appId).busListeners.push({ event, callback: wrappedCallback });
            },

            // 🧹 注册自定义清理函数
            onCleanup: (callback) => {
                this._getQueue(appId).cleanups.push(callback);
            },

            // 🗑️ 手动清理（如果需要）
            clearInterval: (id) => {
                window.clearInterval(id);
                this._getQueue(appId).intervals.delete(id);
            },
            clearTimeout: (id) => {
                window.clearTimeout(id);
                this._getQueue(appId).timeouts.delete(id);
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

        console.log(`[ProcessManager] 正在清理进程 ${appId} 的资源队列...`);

        // 1. 执行自定义清理函数 (最先执行，以便应用有机会做最后的操作)
        if (queue.cleanups) {
            queue.cleanups.forEach(cb => {
                try { cb(); } catch(e) { console.error(`[ProcessManager] Cleanup error for ${appId}:`, e); }
            });
        }

        // 2. 清理定时器
        queue.intervals.forEach(id => window.clearInterval(id));
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
        queue.events = [];

        // 6. 清理 EventBus 监听
        if (queue.busListeners) {
            queue.busListeners.forEach(({ event, callback }) => bus.off(event, callback));
            queue.busListeners = [];
        }

        // 7. 删除户头
        this.queues.delete(appId);
        
        console.log(`[ProcessManager] 进程 ${appId} 清理完毕 ✨`);
    }

    // 🔒 内部辅助：安全获取队列
    _getQueue(appId) {
        let queue = this.queues.get(appId);
        if (!queue) {
            // 如果队列不存在（可能已被 kill），返回一个临时对象防止报错
            // 但不保存到 map 中，因为进程已经死了
            return {
                intervals: new Set(),
                timeouts: new Set(),
                animations: new Set(),
                events: [],
                busListeners: [],
                cleanups: []
            };
        }
        return queue;
    }
}

export const pm = new ProcessManager();
