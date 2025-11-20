import { DEFAULT_APPS } from './config.js';

class Store {
    constructor() {
        const saved = localStorage.getItem('seraphim_apps_v4'); // 升级版本号以重置旧缓存
        this.apps = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_APPS));
    }

    save() {
        localStorage.setItem('seraphim_apps_v4', JSON.stringify(this.apps));
    }

    getApp(id) {
        return this.apps[id];
    }

    updateApp(id, data) {
        if(this.apps[id]) {
            this.apps[id] = { ...this.apps[id], ...data };
            this.save();
        }
    }
}

export const store = new Store();