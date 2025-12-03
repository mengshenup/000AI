/* ==========================================================================
   📃 文件功能 : 登录服务与界面 (Login Service & UI)
   ⚡ 逻辑摘要 : 管理用户认证、本地缓存自动登录及离线模式回退。
   💡 易懂解释 : 这是系统的门卫，负责检查你的通行证 (Token)！👮‍♂️
   🔋 未来扩展 : 支持多用户切换和生物识别登录。
   📊 当前状态 : 活跃 (2025-12-03)
   🧱 login.js 踩坑记录 (累积，勿覆盖) :
      1. [2025-12-03] [已修复] [引用错误]: 缺少 store 导入导致 updateSystemUser 报错 -> 添加 import { store } (Line 12)
      2. [2025-12-03] [已修复] [连接失败]: 本地模式下缺少 Token 导致 WebSocket 拒绝连接 -> 注入伪 Token (Line 160, 350)
   ========================================================================== */

import { bus } from '../system/event_bus.js'; // 💖 引入事件总线
import { network } from '../system/network.js'; // 💖 引入网络模块
import { WEB_API_URL } from '../system/config.js'; // 🌐 导入 Web API 地址
import { store } from '../system/store.js'; // 💾 导入状态存储

export const VERSION = '1.0.0'; // 💖 版本号

// =================================
//  🎉 登录服务配置
// =================================
export const config = {
    id: 'app-login',
    type: 'service', // 💖 标记为服务，由 WM 管理生命周期但不创建标准窗口
    name: 'Login Service',
    version: '1.0.0'
};

// =================================
//  🎉 登录界面 (Login Interface)
//
//  🎨 代码用途：
//     管理用户登录、账号切换和 API Key 配置。
//     UI 包含头像、昵称、账号、密码、Key 列表。
//
//  💡 易懂解释：
//     这是 Angel 的大门！🚪 只有拿着钥匙（API Key）的人才能进来哦。
//     你可以给自己起个好听的名字，换个漂亮的头像，还能管理你的多把钥匙。
//
//  ⚠️ 警告：
//     登录成功后会保存 Token 到 localStorage，请注意安全性。
// =================================

export const loginApp = {
    id: 'app-login', // 💖 应用 ID
    isOpen: false, // 💖 登录界面是否打开
    currentUser: null, // 💖 当前登录的用户对象
    
    // 模拟用户数据库 (实际应从服务器加载)
    users: [
        { id: 'user_default', name: 'Angel User', avatar: 'assets/wp-0.avif', account: 'admin', password: '', keys: [] } // 💖 默认用户数据
    ],

    // =================================
    //  🎉 初始化函数 (无参数)
    //
    //  🎨 代码用途：
    //     监听系统登录事件，并尝试自动登录。
    //
    //  💡 易懂解释：
    //     门卫大叔上班啦！他会盯着门口，看有没有人要进来，或者是不是老熟人可以直接放行。👮‍♂️
    //
    //  ⚠️ 警告：
    //     无。
    // =================================
    init() {
        // 监听来自 WM 的打开指令
        bus.on('app:opened', ({id}) => {
            if (id === this.id) this.open();
        });

        // 监听打开登录界面的事件
        bus.on('system:open_login', () => this.open());
        
        // 🆕 监听用户数据更新 (用于持久化本地 DB)
        bus.on('system:user_updated', (user) => this.saveLocalUser(user));
        
        // 🆕 监听网络连接事件，重新发送认证信息
        bus.on('network:connected', () => {
            console.log("Login: Network connected, resyncing user state...");
            if (this.currentUser) this.updateSystemUser();
        });
        
        // 尝试自动登录
        this.autoLogin();
    },

    // =================================
    //  🎉 本地用户数据库 (Local User DB)
    //  🎨 功能：实现 "Local First" 策略，确保离线可用
    // =================================
    saveLocalUser(user) {
        if (!user || !user.account) return;
        let db = {};
        try { db = JSON.parse(localStorage.getItem('angel_users_v2') || '{}'); } catch(e) {}
        
        // 更新用户数据 (保留原有字段，覆盖新字段)
        db[user.account] = {
            ...db[user.account],
            ...user,
            lastLogin: Date.now()
        };
        
        localStorage.setItem('angel_users_v2', JSON.stringify(db));
        
        // 同步更新历史列表 (用于 UI 显示)
        this.saveKnownUser(user);
    },
    
    loadLocalUser(account) {
        try {
            const db = JSON.parse(localStorage.getItem('angel_users_v2') || '{}');
            return db[account] || null;
        } catch(e) { return null; }
    },

    // =================================
    //  🎉 自动登录 (无参数)
    // =================================
    async autoLogin() {
        // 1. 尝试从浏览器缓存读取 Key
        const cachedKey = localStorage.getItem('angel_api_key');
        const cachedUser = localStorage.getItem('current_user_id');
        const cachedToken = localStorage.getItem('angel_auth_token');
        
        if (cachedUser) {
            // 🆕 优先从本地 DB 加载完整数据
            const localData = this.loadLocalUser(cachedUser);
            
            if (localData) {
                this.currentUser = localData;
                console.log("Login: Loaded user from local DB", this.currentUser.account);
            } else {
                // 降级方案：尝试从 current_user_info 加载
                try {
                    const fullInfo = JSON.parse(localStorage.getItem('current_user_info'));
                    if (fullInfo && fullInfo.account === cachedUser) {
                        this.currentUser = fullInfo;
                    } else {
                        // 只有 ID 没有数据的情况
                        this.currentUser = { 
                            id: cachedUser, 
                            name: cachedUser, 
                            account: cachedUser, 
                            keys: cachedKey ? [{ name: 'Cached Key', value: cachedKey }] : [] 
                        };
                    }
                } catch(e) {}
            }

            this.updateSystemUser();
            network.connect();
            bus.emit('system:speak', `欢迎回来，${cachedUser}`);
        } else {
            // 2. 如果没有缓存，创建默认本地账户
            console.log("未检测到登录状态，初始化默认本地账户");

            this.currentUser = { 
                id: 'local_admin', 
                name: 'Local Admin', 
                account: 'admin', 
                avatar: 'assets/wp-0.avif',
                isLocal: true,
                keys: [{ name: 'Default Key', value: 'sk-local-default-key' }] 
            };
            
            // 自动保存并登录
            this.saveLocalUser(this.currentUser); // 🆕 保存到 DB
            
            // 🆕 修复：本地模式下生成伪 Token，确保 network.js 允许连接
            if (!localStorage.getItem('angel_auth_token')) {
                localStorage.setItem('angel_auth_token', `local-token-${Date.now()}`);
            }

            this.updateSystemUser();
            network.connect();
            bus.emit('system:speak', "默认本地账户已登录");
        }
    },

    // =================================
    //  🎉 打开登录界面 (无参数)
    //
    //  🎨 代码用途：
    //     显示登录模态框。
    //
    //  💡 易懂解释：
    //     把大门打开，请进！🚪
    //
    //  ⚠️ 警告：
    //     如果已经打开，则不会重复执行。
    // =================================
    open() {
        if (this.isOpen) return; // 💖 如果已经打开，直接返回
        this.isOpen = true; // 💖 标记为打开状态
        this.render(); // 💖 渲染界面
    },

    // =================================
    //  🎉 关闭登录界面 (无参数)
    //
    //  🎨 代码用途：
    //     移除登录模态框 DOM 并更新状态。
    //
    //  💡 易懂解释：
    //     关上大门，或者你已经进来了，就不需要再看门啦。👋
    //
    //  ⚠️ 警告：
    //     无。
    // =================================
    close() {
        const el = document.getElementById('login-overlay'); // 💖 获取登录遮罩层元素
        if (el) el.remove(); // 💖 如果存在，移除它
        this.isOpen = false; // 💖 标记为关闭状态
    },

    // =================================
    //  🎉 更新系统用户 (无参数)
    //
    //  🎨 代码用途：
    //     广播用户变更事件，保存用户状态到本地存储，并发送认证信息给服务器。
    //
    //  💡 易懂解释：
    //     告诉所有人：“嘿，现在是 [名字] 在用这台电脑哦！” 📢
    //     顺便把你的钥匙交给管家保管。
    //
    //  ⚠️ 警告：
    //     会触发 'system:user_changed' 事件。
    // =================================
    updateSystemUser() {
        // 通知系统用户已变更
        bus.emit('system:user_changed', this.currentUser); // 💖 广播用户变更事件
        
        // 保存到本地缓存
        localStorage.setItem('current_user_id', this.currentUser.account); // 💖 缓存当前账号
        localStorage.setItem('current_user_info', JSON.stringify(this.currentUser)); // 💖 🆕 缓存完整用户信息
        
        // 发送 Key 给服务器 (如果有选中的 Key)
        if (this.currentUser.keys.length > 0) { // 💖 如果用户有 API Key
            // 1. 尝试获取用户之前选择的 Key
            let activeKey = localStorage.getItem('angel_api_key');
            
            // 2. 验证该 Key 是否属于当前用户 (防止切换用户后使用了上一个用户的 Key)
            const isValidKey = activeKey && this.currentUser.keys.some(k => k.value === activeKey);
            
            // 3. 如果无效或未设置，不自动回退，而是清除状态
            if (!isValidKey) {
                console.log("Login: Cached key invalid for current user, clearing...");
                localStorage.removeItem('angel_api_key');
                network.send({ type: 'auth', key: '' }); // 🧹 清除后端 Key
            } else {
                network.send({ type: 'auth', key: activeKey }); // 💖 发送认证请求
            }
        }
        
        // 重新加载该用户的窗口布局
        store.syncFromClientDB(); // 💖 切换用户后重新加载布局
    },

    // =================================
    //  🎉 渲染登录界面 (无参数)
    // =================================
    render() {
        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px);
            z-index: 9999; display: flex; justify-content: center; align-items: center;
            font-family: 'Segoe UI', sans-serif;
        `;

        // 🆕 自动迁移：如果历史列表为空，尝试从上次登录信息恢复
        if (!localStorage.getItem('angel_known_users')) {
            try {
                const lastUser = JSON.parse(localStorage.getItem('current_user_info'));
                if (lastUser && lastUser.account) {
                    const list = [{
                        account: lastUser.account,
                        name: lastUser.name || lastUser.account,
                        avatar: lastUser.avatar || 'assets/wp-0.avif'
                    }];
                    localStorage.setItem('angel_known_users', JSON.stringify(list));
                }
            } catch (e) {}
        }

        // 读取历史用户
        let knownUsers = [];
        try {
            knownUsers = JSON.parse(localStorage.getItem('angel_known_users') || '[]');
        } catch (e) {}

        // 🛡️ 保底策略：如果还是空的，显示默认本地管理员
        if (knownUsers.length === 0) {
            knownUsers.push({
                account: 'admin',
                name: 'Local Admin',
                avatar: 'assets/wp-0.avif'
            });
        }

        // 历史用户列表 HTML
        let usersHtml = '';
        if (knownUsers.length > 0) {
            usersHtml = `
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap;">
                    ${knownUsers.map(u => `
                        <div class="user-card" data-account="${u.account}" style="
                            display: flex; flex-direction: column; align-items: center; gap: 5px;
                            cursor: pointer; transition: transform 0.2s; width: 70px;
                        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                            <img src="${u.avatar || 'assets/wp-0.avif'}" style="
                                width: 50px; height: 50px; border-radius: 50%; object-fit: cover;
                                border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                            ">
                            <div style="font-size: 12px; color: #555; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; text-align: center;">${u.name}</div>
                        </div>
                    `).join('')}
                    <div class="user-card" id="btn-new-user" style="
                        display: flex; flex-direction: column; align-items: center; gap: 5px;
                        cursor: pointer; transition: transform 0.2s; width: 70px;
                    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <div style="
                            width: 50px; height: 50px; border-radius: 50%; background: #f0f0f0;
                            display: flex; justify-content: center; align-items: center;
                            border: 2px dashed #ccc; color: #999; font-size: 20px;
                        ">+</div>
                        <div style="font-size: 12px; color: #999;">新账户</div>
                    </div>
                </div>
            `;
        }

        const defaultUser = this.currentUser || { name: 'Admin', account: 'admin', avatar: 'assets/wp-0.avif' };
        
        // 默认是否显示表单：如果有用户列表，则隐藏表单；否则显示
        // 但由于我们加了保底策略，knownUsers 几乎总是有值，所以默认隐藏表单，显示列表
        const showForm = false; 

        overlay.innerHTML = `
            <div class="login-card" style="
                background: rgba(255, 255, 255, 0.95); padding: 40px; border-radius: 24px;
                width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                display: flex; flex-direction: column; gap: 20px;
            ">
                <div style="text-align: center;">
                    <h2 style="margin: 0 0 5px 0; color: #333; font-size: 24px;">欢迎回来</h2>
                    <p style="margin: 0; color: #999; font-size: 13px;">请点击头像登录，或使用新账户</p>
                </div>

                ${usersHtml}

                <div id="login-form" style="${showForm ? '' : 'display:none;'}">
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div class="form-group">
                            <label style="font-size: 12px; color: #666; font-weight: 600; margin-bottom: 5px; display: block;">账号</label>
                            <input type="text" id="login-account" value="${knownUsers.length === 0 ? defaultUser.account : ''}" placeholder="请输入账号" style="
                                width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 10px;
                                font-size: 14px; outline: none; transition: border-color 0.2s;
                            " onfocus="this.style.borderColor='var(--primary-color)'" onblur="this.style.borderColor='#eee'">
                        </div>

                        <div class="form-group">
                            <label style="font-size: 12px; color: #666; font-weight: 600; margin-bottom: 5px; display: block;">密码</label>
                            <input type="password" id="login-password" placeholder="默认为空" style="
                                width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 10px;
                                font-size: 14px; outline: none; transition: border-color 0.2s;
                            " onfocus="this.style.borderColor='var(--primary-color)'" onblur="this.style.borderColor='#eee'">
                        </div>
                    </div>

                    <div style="margin-top: 20px;">
                        <button id="btn-login" style="
                            width: 100%; padding: 12px; background: var(--primary-color); color: white; 
                            border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 15px;
                            box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: transform 0.1s;
                        " onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">
                            立即登录
                        </button>
                        <div id="btn-back-list" style="
                            text-align: center; margin-top: 15px; color: #999; font-size: 12px; cursor: pointer;
                            display: ${knownUsers.length > 0 ? 'block' : 'none'};
                        ">返回账户列表</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const formDiv = document.getElementById('login-form');
        const accountInput = document.getElementById('login-account');
        const btnLogin = document.getElementById('btn-login');
        const btnBack = document.getElementById('btn-back-list');

        // 绑定用户列表点击
        overlay.querySelectorAll('.user-card').forEach(card => {
            if (card.id === 'btn-new-user') {
                card.onclick = () => {
                    formDiv.style.display = 'block';
                    accountInput.value = '';
                    accountInput.focus();
                };
            } else {
                card.onclick = () => {
                    const acc = card.dataset.account;
                    accountInput.value = acc;
                    // 自动触发登录
                    btnLogin.click();
                };
            }
        });

        if (btnBack) {
            btnBack.onclick = () => {
                formDiv.style.display = 'none';
            };
        }

        // 登录逻辑 (乐观更新)
        btnLogin.onclick = () => {
            const account = accountInput.value.trim();
            const password = document.getElementById('login-password').value;

            if (!account) return;

            // 1. ⚡ 立即进入系统 (乐观 UI)
            
            // 🆕 尝试从本地 DB 加载完整用户数据 (包含 Keys)
            const localData = this.loadLocalUser(account);
            
            // 构造临时用户状态 (优先使用本地 DB 数据)
            this.currentUser = {
                id: account,
                name: localData ? localData.name : (account === 'admin' ? 'Administrator' : account), // 优化默认名
                account: account,
                avatar: localData ? localData.avatar : 'assets/wp-0.avif',
                keys: localData ? (localData.keys || []) : [], 
                isLocal: true,
                isSyncing: true 
            };

            // 如果是新初始化的 admin 且没有 Key，尝试注入默认 Key 或迁移旧缓存
            if (account === 'admin' && this.currentUser.keys.length === 0) {
                const oldCachedKey = localStorage.getItem('angel_api_key');
                if (oldCachedKey) {
                    this.currentUser.keys.push({ name: 'Legacy Key', value: oldCachedKey });
                } else {
                    this.currentUser.keys.push({ name: 'Default', value: 'sk-local-admin-key' });
                }
            }

            // 尝试从历史记录恢复头像 (如果本地 DB 没有)
            if (!localData) {
                const known = knownUsers.find(u => u.account === account);
                if (known) this.currentUser.avatar = known.avatar;
            }

            this.close();
            this.saveLocalUser(this.currentUser); // 🆕 立即保存初始状态到 DB
            
            // 🆕 修复：本地模式下生成伪 Token，确保 network.js 允许连接
            // 只有当没有 Token 时才设置，避免覆盖可能存在的有效 Token
            if (!localStorage.getItem('angel_auth_token')) {
                localStorage.setItem('angel_auth_token', `local-token-${Date.now()}`);
            }

            this.updateSystemUser();
            bus.emit('system:speak', `欢迎回来，${this.currentUser.name}`);
            
            // 延迟弹出 Key 管理器 (让用户看到连接状态)
            setTimeout(() => bus.emit('system:open_key_mgr'), 600);

            // 2. ☁️ 后台尝试连接服务器
            fetch(`${WEB_API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account, password })
            })
            .then(async res => {
                if (res.ok) {
                    const data = await res.json();
                    if (data.token) localStorage.setItem('angel_auth_token', data.token);
                    
                    // 🔄 智能合并 Keys (优先保留本地，合并服务器新增)
                    const serverKeys = data.keys || [];
                    const localKeys = this.currentUser.keys || [];
                    
                    // 创建一个 Map 来去重，以 Key Value 为准
                    const mergedMap = new Map();
                    
                    // 1. 先放入本地 Keys (优先级高)
                    localKeys.forEach(k => mergedMap.set(k.value, k));
                    
                    // 2. 再放入服务器 Keys (如果不存在则添加)
                    serverKeys.forEach(k => {
                        if (!mergedMap.has(k.value)) {
                            mergedMap.set(k.value, k);
                        }
                    });
                    
                    // 3. 转换回数组
                    this.currentUser.keys = Array.from(mergedMap.values());
                    
                    // 更新为云端状态
                    this.currentUser.isLocal = false;
                    this.currentUser.isSyncing = false; // ✅ 同步完成
                    
                    // 保存到本地 DB 和历史列表
                    this.saveLocalUser(this.currentUser);
                    
                    this.updateSystemUser();
                    bus.emit('system:speak', "云端账户连接成功");
                    
                    // 📤 同步合并后的 Keys 回服务器
                    fetch(`${WEB_API_URL}/update_user_keys`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            account: this.currentUser.account,
                            keys: this.currentUser.keys
                        })
                    }).catch(e => console.warn("同步 Keys 失败", e));
                    
                } else {
                    throw new Error("Login failed");
                }
            })
            .catch(e => {
                console.warn("后台登录失败，保持本地模式", e);
                this.currentUser.isSyncing = false; // ❌ 同步结束 (失败)
                this.currentUser.isLocal = true;
                
                // 即使失败也保存到本地 DB
                this.saveLocalUser(this.currentUser);
                
                this.updateSystemUser();
                // 不打扰用户，Key Manager 会显示状态
            });
        };
        
        // ⚡ 交互优化：双击背景关闭 (防止误触)
        overlay.ondblclick = (e) => {
            if (e.target === overlay) this.close();
        };
    },

    // 保存用户到历史列表
    saveKnownUser(user) {
        let list = [];
        try { list = JSON.parse(localStorage.getItem('angel_known_users') || '[]'); } catch(e) {}
        
        // 移除旧的同名记录
        list = list.filter(u => u.account !== user.account);
        
        // 添加新的
        list.unshift({
            account: user.account,
            name: user.name,
            avatar: user.avatar
        });
        
        // 最多存 5 个
        if (list.length > 5) list.pop();
        
        localStorage.setItem('angel_known_users', JSON.stringify(list));
    }
};

// =================================
//  🎉 模块初始化 (Module Init)
// =================================
export function init() {
    loginApp.init();
} 
