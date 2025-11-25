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
        // =================================
        //  🎉 获取应用性能统计 (Get App Stats) (appId: 应用ID)
        //
        //  🎨 代码用途：
        //     返回指定应用的 CPU 时间、最后活跃时间、长任务次数等统计信息。
        //
        //  💡 易懂解释：
        //     查查这个应用干了多少活，有没有偷懒，或者是不是累坏了（卡顿）。📊
        //
        //  ⚠️ 警告：
        //     如果应用从未运行过，会返回一个初始化的空统计对象。
        // =================================
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
        // =================================
        //  🎉 获取资源计数 (Get Resource Count) (appId: 应用ID)
        //
        //  🎨 代码用途：
        //     统计应用当前占用的系统资源数量（定时器、事件监听器、动画帧）。
        //
        //  💡 易懂解释：
        //     数数这个应用借走了多少东西，是不是借了一堆不还？🤔
        //
        //  ⚠️ 警告：
        //     仅统计通过 ProcessManager 申请的资源。如果应用绕过 PM 直接使用原生 API，则无法统计。
        // =================================
        const queue = this.queues.get(appId); // 🔍 获取资源队列
        if (!queue) { // ✅ 如果没有队列
            return { timers: 0, events: 0, animations: 0, total: 0 }; // 0️⃣ 返回零
        }
        const timers = queue.intervals.size + queue.timeouts.size; // ⏱️ 统计定时器
        const events = queue.events.length + queue.busListeners.length; // 👂 统计事件
        const animations = queue.animations.size; // 🎬 统计动画
        return {
            timers,
            events,
            animations,
            total: timers + events + animations // 🔢 总数
        };
    }

    /**
     * 📝 记录日志
     */
    _log(appId, type, message) {
        // =================================
        //  🎉 内部日志记录 (Log) (appId: 应用ID, type: 类型, message: 消息)
        //
        //  🎨 代码用途：
        //     将系统事件记录到应用的日志列表中，用于调试和性能分析。
        //
        //  💡 易懂解释：
        //     给应用写日记，记下它什么时候借了东西，什么时候还了东西。📓
        //
        //  ⚠️ 警告：
        //     日志列表长度限制为 50 条，旧日志会被自动丢弃。
        // =================================
        if (!this.stats.has(appId)) { // ✅ 如果没有统计信息
            this.stats.set(appId, { 
                cpuTime: 0, lastActive: Date.now(), startTime: Date.now(),
                longTasks: 0, longTaskTime: 0, logs: []
            });
        }
        const stat = this.stats.get(appId); // 📊 获取统计对象
        const time = new Date().toLocaleTimeString(); // 🕒 获取当前时间
        stat.logs.unshift(`[${time}] [${type}] ${message}`); // 📝 插入日志
        if (stat.logs.length > 50) stat.logs.pop(); // ✂️ 限制日志长度
    }

    /**
     * ⏱️ 记录执行时间 (内部辅助)
     */
    _measure(appId, fn) {
        // =================================
        //  🎉 性能测量 (Measure Performance) (appId: 应用ID, fn: 要执行的函数)
        //
        //  🎨 代码用途：
        //     包装函数执行，测量其耗时，并更新应用的 CPU 时间统计。
        //
        //  💡 易懂解释：
        //     拿着秒表掐时间，看看这个函数跑完花了多久，是不是在磨洋工。⏱️
        //
        //  ⚠️ 警告：
        //     如果函数执行超过 50ms，会被标记为“长任务”(Long Task)，可能导致界面卡顿。
        // =================================
        const start = performance.now(); // ⏱️ 开始计时
        try {
            fn(); // 🚀 执行函数
        } finally {
            const end = performance.now(); // 🏁 结束计时
            const duration = end - start; // ⏳ 计算耗时
            
            if (!this.stats.has(appId)) { // ✅ 如果没有统计信息
                this.stats.set(appId, { 
                    cpuTime: 0, lastActive: end, startTime: start,
                    longTasks: 0, longTaskTime: 0, logs: []
                });
            }
            const stat = this.stats.get(appId); // 📊 获取统计对象
            stat.cpuTime += duration; // ➕ 累加 CPU 时间
            stat.lastActive = end; // 🕒 更新最后活跃时间

            // 🐢 检测长任务 (卡顿)
            if (duration > 50) { // 🐢 如果超过 50ms
                stat.longTasks++; // ➕ 增加长任务计数
                stat.longTaskTime += duration; // ➕ 累加长任务时间
                // this._log(appId, 'WARN', `检测到长任务: ${duration.toFixed(1)}ms`);
            }
        }
    }

    /**
     * 📝 获取应用的资源上下文 (Context)
     * 应用通过这个 Context 申请资源，无需手动管理清理
     */
    getContext(appId) {
        // =================================
        //  🎉 获取应用上下文 (Get Context) (appId: 应用ID)
        //
        //  🎨 代码用途：
        //     为应用创建一个“沙箱环境”。
        //     返回一组被代理的 API (setInterval, addEventListener 等)，
        //     所有通过这些 API 申请的资源都会被自动记录到 ProcessManager 中。
        //
        //  💡 易懂解释：
        //     给应用发一张“信用卡”。
        //     应用想花钱（申请资源）必须刷这张卡，这样账房先生就能自动记账，
        //     等应用关门的时候，账单自动结清，不用应用自己操心！💳
        //
        //  ⚠️ 警告：
        //     应用必须使用 context 提供的 API，如果直接使用 window.setInterval，
        //     ProcessManager 将无法追踪，导致内存泄漏。
        // =================================

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
        this._log(appId, 'SYS', '进程启动，性能统计已重置'); // 📝 记录日志

        // 如果是第一次来，先建个户头
        if (!this.queues.has(appId)) { // ✅ 如果没有队列
            this.queues.set(appId, {
                intervals: new Set(), // ⏱️ 定时器集合
                timeouts: new Set(), // ⏳ 延时器集合
                animations: new Set(), // 🎬 动画帧集合
                events: [], // 👂 DOM 事件列表
                busListeners: [], // 🚌 事件总线监听列表
                cleanups: []      // 🧹 自定义清理函数列表
            });
            this._log(appId, 'INFO', '进程上下文已创建'); // 📝 记录日志
        }

        // 返回一组封装好的 API
        return {
            id: appId, // 🆔 应用 ID
            
            // 🕒 申请定时器
            setInterval: (callback, delay) => {
                const wrappedCallback = () => this._measure(appId, callback); // ⏱️ 包装回调以测量性能
                const id = window.setInterval(wrappedCallback, delay); // 🕒 调用原生 API
                this._getQueue(appId).intervals.add(id); // 📝 记录 ID
                this._log(appId, 'RES', `申请定时器 (ID: ${id}, Delay: ${delay}ms)`); // 📝 记录日志
                return id; // 🔢 返回 ID
            },
            
            // ⏱️ 申请延时器 (自动防泄漏)
            setTimeout: (callback, delay) => {
                const wrappedCallback = () => {
                    this._getQueue(appId).timeouts.delete(id); // 🗑️ 执行后自动移除记录
                    this._measure(appId, callback); // ⏱️ 测量性能
                };
                const id = window.setTimeout(wrappedCallback, delay); // ⏱️ 调用原生 API
                this._getQueue(appId).timeouts.add(id); // 📝 记录 ID
                this._log(appId, 'RES', `申请延时器 (ID: ${id}, Delay: ${delay}ms)`); // 📝 记录日志
                return id; // 🔢 返回 ID
            },

            // 🎬 申请动画帧 (自动防泄漏)
            requestAnimationFrame: (callback) => {
                const wrappedCallback = (t) => {
                    this._getQueue(appId).animations.delete(id); // 🗑️ 执行后自动移除记录
                    this._measure(appId, () => callback(t)); // ⏱️ 测量性能
                };
                const id = window.requestAnimationFrame(wrappedCallback); // 🎬 调用原生 API
                this._getQueue(appId).animations.add(id); // 📝 记录 ID
                // 动画帧太频繁，不记录日志以免刷屏
                return id; // 🔢 返回 ID
            },

            // 👂 申请 DOM 事件监听
            addEventListener: (target, type, listener, options) => {
                const wrappedListener = (e) => this._measure(appId, () => listener(e)); // ⏱️ 包装回调
                target.addEventListener(type, wrappedListener, options); // 👂 添加监听
                this._getQueue(appId).events.push({ target, type, listener: wrappedListener, options }); // 📝 记录详情
                this._log(appId, 'RES', `监听 DOM 事件 (${type})`); // 📝 记录日志
            },

            // 🚌 申请 EventBus 监听
            on: (event, callback) => {
                const wrappedCallback = (data) => this._measure(appId, () => callback(data)); // ⏱️ 包装回调
                bus.on(event, wrappedCallback); // 🚌 订阅事件
                this._getQueue(appId).busListeners.push({ event, callback: wrappedCallback }); // 📝 记录详情
                this._log(appId, 'RES', `订阅总线事件 (${event})`); // 📝 记录日志
            },

            // 🧹 注册自定义清理函数
            onCleanup: (callback) => {
                this._getQueue(appId).cleanups.push(callback); // 📝 添加到清理列表
                this._log(appId, 'INFO', `注册清理钩子`); // 📝 记录日志
            },

            // 🗑️ 手动清理（如果需要）
            clearInterval: (id) => {
                window.clearInterval(id); // 🛑 停止定时器
                this._getQueue(appId).intervals.delete(id); // 🗑️ 移除记录
                this._log(appId, 'FREE', `释放定时器 (ID: ${id})`); // 📝 记录日志
            },
            clearTimeout: (id) => {
                window.clearTimeout(id); // 🛑 停止延时器
                this._getQueue(appId).timeouts.delete(id); // 🗑️ 移除记录
                this._log(appId, 'FREE', `释放延时器 (ID: ${id})`); // 📝 记录日志
            },
            cancelAnimationFrame: (id) => {
                window.cancelAnimationFrame(id); // 🛑 取消动画帧
                this._getQueue(appId).animations.delete(id); // 🗑️ 移除记录
            },
            off: (event, callback) => {
                bus.off(event, callback); // 🚌 取消订阅
                // 从列表中移除 (简单过滤)
                const q = this._getQueue(appId); // 🔍 获取队列
                q.busListeners = q.busListeners.filter(l => l.event !== event || l.callback !== callback); // 🗑️ 过滤列表
                this._log(appId, 'FREE', `取消订阅事件 (${event})`); // 📝 记录日志
            }
        };
    }

    /**
     * 💥 销毁应用进程
     * 清理该 AppID 下的所有资源队列
     */
    kill(appId) {
        // =================================
        //  🎉 终止进程 (Kill Process) (appId: 应用ID)
        //
        //  🎨 代码用途：
        //     强制关闭应用，并清理其占用的所有资源（定时器、事件监听等）。
        //
        //  💡 易懂解释：
        //     店铺倒闭了，清算小组进场！
        //     把租的房子退了（DOM事件），借的钱还了（定时器），最后把账本（Queue）撕了。💥
        //
        //  ⚠️ 警告：
        //     这是一个破坏性操作，一旦执行，应用的所有后台逻辑都会立即停止。
        // =================================
        const queue = this.queues.get(appId); // 🔍 获取资源队列
        if (!queue) return; // 户头不存在，直接返回

        this._log(appId, 'WARN', `正在强制终止进程...`); // 📝 记录日志
        console.log(`[ProcessManager] 正在清理进程 ${appId} 的资源队列...`); // 📢 控制台输出

        // 1. 执行自定义清理函数 (最先执行，以便应用有机会做最后的操作)
        if (queue.cleanups) { // ✅ 如果有清理钩子
            queue.cleanups.forEach(cb => { // 🔄 遍历执行
                try { cb(); } catch(e) { console.error(`[ProcessManager] Cleanup error for ${appId}:`, e); } // 🛡️ 捕获错误
            });
        }

        // 2. 清理定时器
        queue.intervals.forEach(id => window.clearInterval(id)); // 🛑 停止所有定时器
        const timerCount = queue.intervals.size + queue.timeouts.size; // 🔢 统计数量
        queue.intervals.clear(); // 🧹 清空集合

        // 3. 清理延时器
        queue.timeouts.forEach(id => window.clearTimeout(id)); // 🛑 停止所有延时器
        queue.timeouts.clear(); // 🧹 清空集合

        // 4. 清理动画帧
        queue.animations.forEach(id => window.cancelAnimationFrame(id)); // 🛑 停止所有动画帧
        queue.animations.clear(); // 🧹 清空集合

        // 5. 清理 DOM 事件监听
        queue.events.forEach(({ target, type, listener, options }) => { // 🔄 遍历事件列表
            if (target && typeof target.removeEventListener === 'function') { // ✅ 如果目标有效
                target.removeEventListener(type, listener, options); // ➖ 移除监听
            }
        });
        const eventCount = queue.events.length + queue.busListeners.length; // 🔢 统计数量
        queue.events = []; // 🧹 清空数组

        // 6. 清理 EventBus 监听
        if (queue.busListeners) { // ✅ 如果有总线监听
            queue.busListeners.forEach(({ event, callback }) => bus.off(event, callback)); // 🚌 取消订阅
            queue.busListeners = []; // 🧹 清空数组
        }

        // 7. 删除户头
        this.queues.delete(appId); // 🗑️ 删除队列
        
        // 记录最后一条日志 (虽然户头删了，但 stats 还在)
        this._log(appId, 'SUCCESS', `进程已终止，回收资源: 定时器 ${timerCount}, 监听器 ${eventCount}`); // 📝 记录日志
        console.log(`[ProcessManager] 进程 ${appId} 清理完毕 ✨`); // 📢 控制台输出
    }

    // 🔒 内部辅助：安全获取队列
    _getQueue(appId) {
        // =================================
        //  🎉 获取/重建队列 (Get Queue) (appId: 应用ID)
        //
        //  🎨 代码用途：
        //     获取应用的资源队列。如果队列不存在（例如应用被意外 kill 后又尝试运行），则自动重建。
        //
        //  💡 易懂解释：
        //     去账房查账。如果发现账本丢了（被销毁了），赶紧补办一个新的，防止烂账！📖
        //
        //  ⚠️ 警告：
        //     这是为了防止“僵尸进程”导致空指针异常。
        // =================================
        let queue = this.queues.get(appId); // 🔍 尝试获取
        if (!queue) { // ❌ 如果不存在
            // ♻️ 自动复活机制：
            // 如果队列不存在（已被 kill），但应用又尝试申请资源（说明是单例应用再次打开）
            // 我们需要重建队列，否则资源将无法被追踪和清理（导致内存泄漏）
            queue = {
                intervals: new Set(), // ⏱️ 重置定时器
                timeouts: new Set(), // ⏳ 重置延时器
                animations: new Set(), // 🎬 重置动画
                events: [], // 👂 重置事件
                busListeners: [], // 🚌 重置监听
                cleanups: [] // 🧹 重置清理
            };
            this.queues.set(appId, queue); // 💾 保存新队列
            this._log(appId, 'INFO', '进程上下文已重建 (复活)'); // 📝 记录日志
        }
        return queue; // 📦 返回队列
    }
}

export const pm = new ProcessManager();
