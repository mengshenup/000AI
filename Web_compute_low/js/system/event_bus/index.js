/**
 * @fileoverview EventBus 分子入口
 * @description 发布-订阅模式事件总线
 * @module system/event_bus/index
 */

import { on as onFn } from './on.js';
import { off as offFn } from './off.js';
import { emit as emitFn } from './emit.js';

export const VERSION = '1.0.0';

/**
 * 事件总线类
 */
class EventBus {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        onFn(this.listeners, event, callback);
    }

    emit(event, data) {
        emitFn(this.listeners, event, data);
    }

    off(event, callback) {
        offFn(this.listeners, event, callback);
    }

    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
}

export const bus = new EventBus();
export { EventBus };
