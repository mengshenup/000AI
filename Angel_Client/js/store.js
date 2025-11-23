import { DEFAULT_APPS } from './config.js'; // ⚙️ 导入默认配置

class Store {
    // =================================
    //  🎉 状态存储类 (无参数)
    //
    //  🎨 代码用途：
    //     管理应用的状态（如窗口位置、是否打开），并持久化到 localStorage。
    //
    //  💡 易懂解释：
    //     这是小天使的“记事本”。
    //     它会记下你把窗口拖到了哪里，上次关机前开了哪些软件。
    //     这样下次你打开网页，一切还是你熟悉的样子。
    //
    //  ⚠️ 警告：
    //     如果用户清除了浏览器缓存，所有保存的设置（如窗口位置）都会丢失，重置为默认值。
    // =================================
    constructor() {
        // =================================
        //  🎉 本地数据库 (无参数)
        //
        //  🎨 代码用途：
        //     初始化存储对象，尝试从 localStorage 读取数据。
        //
        //  💡 易懂解释：
        //     翻开记事本，看看上次写了什么。
        //
        //  ⚠️ 警告：
        //     如果数据损坏，会自动重置为空。
        // =================================

        // 尝试从浏览器缓存中读取上次保存的状态
        // 使用通用 Key 'seraphim_apps_state'
        const saved = localStorage.getItem('seraphim_apps_state'); // 📖 读取存档

        if (saved) {
            try {
                // 如果有缓存，解析缓存
                const savedApps = JSON.parse(saved); // 🧩 解析JSON
                // 初始化为空对象，等待 setAppMetadata 注入
                this.apps = savedApps; // 📥 加载数据
            } catch (e) {
                console.error("本地数据库损坏，重置中...", e); // ❌ 报错
                this.apps = {}; // 🧹 重置
            }
        } else {
            // 如果没有缓存，初始化为空对象
            this.apps = {}; // 🆕 全新开始
        }
    }

    // 🆕 动态版本检查：计算当前配置的指纹
    checkVersion(metadataMap) {
        // 生成指纹：所有 App ID 排序后的字符串
        const currentFingerprint = Object.keys(metadataMap).sort().join('|');
        const savedFingerprint = localStorage.getItem('seraphim_fingerprint');

        if (savedFingerprint !== currentFingerprint) {
            console.log(`[Store] 检测到应用结构变更 (${savedFingerprint} -> ${currentFingerprint})，执行智能清理...`);
            
            // 策略：保留位置信息，重置打开状态 (防止新旧逻辑冲突导致卡死)
            Object.keys(this.apps).forEach(id => {
                if (this.apps[id]) {
                    this.apps[id].isOpen = false; // 🔒 强制关闭所有窗口
                    this.apps[id].isMinimized = false;
                    // 如果 ID 已经不存在于新配置中，prune 方法稍后会处理
                }
            });
            
            // 更新指纹
            localStorage.setItem('seraphim_fingerprint', currentFingerprint);
            this.save();
        }
    }

    save() {
        // =================================
        //  🎉 保存 (无参数)
        //
        //  🎨 代码用途：
        //     将当前内存中的状态写入 localStorage。
        //     只保存关键的动态状态字段，避免数据膨胀。
        //
        //  💡 易懂解释：
        //     把记在脑子里的东西写到硬盘上，防止断电忘记。
        //
        //  ⚠️ 警告：
        //     localStorage 是同步操作，如果数据量非常大（虽然这里不会），可能会轻微阻塞主线程。
        // =================================

        // 定义只保存这些动态字段，过滤掉静态 HTML 内容
        const DYNAMIC_KEYS = ['pos', 'winPos', 'isOpen', 'zIndex', 'isMinimized', 'isMaximized', 'size', 'customName', 'description']; // 🔑 关键字段列表
        
        const stateToSave = {}; // 📦 待保存对象
        Object.entries(this.apps).forEach(([id, app]) => {
            stateToSave[id] = {};
            DYNAMIC_KEYS.forEach(key => {
                if (app[key] !== undefined) {
                    stateToSave[id][key] = app[key]; // 📥 复制字段
                }
            });
        });

        // 保存到本地
        localStorage.setItem('seraphim_apps_state', JSON.stringify(stateToSave)); 
    }

    prune(validIds) {
        // =================================
        //  🎉 清理僵尸数据 (有效ID列表)
        //
        //  🎨 代码用途：
        //     删除那些存在于缓存中但当前代码中已不存在的应用数据。
        //
        //  💡 易懂解释：
        //     大扫除。把那些已经搬走的人（删掉的应用）的户口注销掉。
        //
        //  ⚠️ 警告：
        //     一旦删除无法恢复。
        // =================================
        const validSet = new Set(validIds); // 📋 有效ID集合
        let changed = false; // 🚩 变更标记
        
        Object.keys(this.apps).forEach(id => {
            if (!validSet.has(id)) {
                console.log(`[Store] 清理僵尸应用数据: ${id}`); // 📝 日志
                delete this.apps[id]; // 🗑️ 删除数据
                changed = true; // 🚩 标记变更
            }
        });

        if (changed) this.save(); // 💾 如果有变动则保存
    }

    getApp(id) {
        // =================================
        //  🎉 获取应用信息 (应用ID)
        //
        //  🎨 代码用途：
        //     根据 ID 获取某个应用的完整配置信息。
        //
        //  💡 易懂解释：
        //     查户口。根据身份证号（ID）查出这个软件叫什么、图标是什么、上次停在哪里。
        //
        //  ⚠️ 警告：
        //     如果传入不存在的 ID，会返回 undefined。
        // =================================

        return this.apps[id]; // 📤 返回应用数据
    }

    updateApp(id, data) {
        // =================================
        //  🎉 更新应用信息 (应用ID, 新数据)
        //
        //  🎨 代码用途：
        //     更新某个应用的状态（例如位置改变了、被关闭了），并立即保存。
        //
        //  💡 易懂解释：
        //     修改户口信息。比如“小明搬家了”，就把他的新地址记下来。
        //
        //  ⚠️ 警告：
        //     data 参数应该是一个对象。如果传入 null 或非对象，可能会导致数据损坏。
        // =================================

        if (this.apps[id]) {
            // 使用展开运算符 ... 合并新旧数据
            // 比如旧数据是 {x:1, y:1}, 新数据是 {x:2}, 合并后就是 {x:2, y:1}
            this.apps[id] = { ...this.apps[id], ...data }; // 🔄 合并数据
            // 保存更改
            this.save(); // 💾 保存
        }
    }

    setAppMetadata(id, metadata) {
        // =================================
        //  🎉 设置应用元数据 (应用ID, 元数据对象)
        //
        //  🎨 代码用途：
        //     运行时注入应用的静态信息（如名称、欢迎语）。
        //     这些信息不应该被保存到 localStorage 中（因为它们是代码的一部分，不是用户状态）。
        //
        //  💡 易懂解释：
        //     给户口本上补全名字和照片。
        //
        //  ⚠️ 警告：
        //     如果应用ID已存在，会保留原有的用户状态（如位置），只更新静态信息。
        // =================================
        if (this.apps[id]) {
            // 修复：优先保留 this.apps[id] 中的用户状态 (如 pos, winPos, isOpen)
            // metadata 中的默认值只在 this.apps[id] 中不存在时生效
            this.apps[id] = { ...metadata, ...this.apps[id] }; // 🔄 合并，保留用户状态
            
            // 确保静态配置 (name, content, icon, color) 总是使用最新的代码版本
            // 这样即使用户缓存了旧的配置，代码更新后也能看到新界面
            // 修复：优先使用用户自定义的名称 (customName)，如果不存在才使用元数据中的默认名称
            this.apps[id].name = this.apps[id].customName || metadata.name; 
            this.apps[id].description = metadata.description; // 📝 更新描述
            this.apps[id].content = metadata.content; // 📄 更新内容
            this.apps[id].icon = metadata.icon; // 🖼️ 更新图标
            this.apps[id].color = metadata.color; // 🎨 更新颜色
            this.apps[id].contentStyle = metadata.contentStyle; // 💅 更新样式
            this.apps[id].openMsg = metadata.openMsg; // 💬 更新欢迎语
        } else {
            // 如果是新应用，直接使用元数据
            this.apps[id] = metadata; // 🆕 创建新应用数据
        }
    }
}

// 导出单例
export const store = new Store(); // 💾 全局唯一的存储实例