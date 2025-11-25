import { bus } from '../system/event_bus.js';
import { network } from '../system/network.js';
import { WEB_API_URL } from '../system/config.js'; // 🌐 导入 Web API 地址

export const VERSION = '1.0.0'; // 💖 版本号

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
// =================================

export const loginApp = {
    id: 'app-login',
    isOpen: false,
    currentUser: null,
    
    // 模拟用户数据库 (实际应从服务器加载)
    users: [
        { id: 'user_default', name: 'Angel User', avatar: 'assets/wp-0.avif', account: 'admin', password: '', keys: [] }
    ],

    init() {
        // 监听打开登录界面的事件
        bus.on('system:open_login', () => this.open());
        
        // 尝试自动登录
        this.autoLogin();
    },

    async autoLogin() {
        // 1. 尝试从浏览器缓存读取 Key
        const cachedKey = localStorage.getItem('angel_api_key');
        const cachedUser = localStorage.getItem('current_user_id');
        
        if (cachedKey && cachedUser) {
            this.currentUser = { 
                id: cachedUser, 
                name: cachedUser, 
                account: cachedUser, 
                keys: [{ name: 'Cached Key', value: cachedKey }] 
            };
            this.updateSystemUser();
            return;
        }

        // 2. 如果没有缓存，显示登录界面
        // this.open(); 
    },

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.render();
    },

    close() {
        const el = document.getElementById('login-overlay');
        if (el) el.remove();
        this.isOpen = false;
    },

    updateSystemUser() {
        // 通知系统用户已变更
        bus.emit('system:user_changed', this.currentUser);
        
        // 保存到本地缓存
        localStorage.setItem('current_user_id', this.currentUser.account);
        
        // 发送 Key 给服务器 (如果有选中的 Key)
        if (this.currentUser.keys.length > 0) {
            // 默认使用第一个 Key
            const activeKey = this.currentUser.keys[0].value;
            localStorage.setItem('angel_api_key', activeKey); // 缓存 Key
            network.send({ type: 'auth', key: activeKey });
        }
        
        // 重新加载该用户的窗口布局
        // store.syncFromClientDB(); // 需要 store 支持重载
    },

    render() {
        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px);
            z-index: 9999; display: flex; justify-content: center; align-items: center;
        `;

        // 默认显示 admin
        const defaultUser = { name: 'Admin', account: 'admin', avatar: 'assets/wp-0.avif', keys: [] };
        const user = this.currentUser || defaultUser;

        overlay.innerHTML = `
            <div class="login-card" style="
                background: rgba(255, 255, 255, 0.9); padding: 30px; border-radius: 20px;
                width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                display: flex; flex-direction: column; gap: 15px;
            ">
                <div style="text-align: center;">
                    <img src="${user.avatar}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    <h2 style="margin: 10px 0; color: #333;">Login</h2>
                </div>

                <div class="form-group">
                    <label>账号</label>
                    <input type="text" id="login-account" value="${user.account}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px;">
                </div>

                <div class="form-group">
                    <label>密码</label>
                    <input type="password" id="login-password" placeholder="默认为空" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px;">
                </div>

                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button id="btn-login" style="flex: 1; padding: 10px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">登录</button>
                </div>
                <div id="login-msg" style="color: red; text-align: center; font-size: 12px;"></div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 绑定事件
        document.getElementById('btn-login').onclick = async () => {
            const account = document.getElementById('login-account').value;
            const password = document.getElementById('login-password').value;
            const msg = document.getElementById('login-msg');

            try {
                msg.innerText = "正在验证...";
                const res = await fetch(`${WEB_API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ account, password })
                });

                if (res.ok) {
                    const data = await res.json();
                    
                    // 💾 保存 Token
                    if (data.token) {
                        localStorage.setItem('angel_auth_token', data.token);
                    }

                    this.currentUser = {
                        id: account,
                        name: account,
                        account: account,
                        avatar: 'assets/wp-0.avif',
                        keys: data.keys
                    };
                    this.close();
                    this.updateSystemUser();
                    bus.emit('system:speak', `欢迎回来，${account}`);
                } else {
                    const err = await res.json();
                    msg.innerText = err.detail || "登录失败";
                }
            } catch (e) {
                msg.innerText = "连接服务器失败";
            }
        };
        
        // 点击背景关闭
        overlay.onclick = (e) => {
            if (e.target === overlay) this.close();
        };
    }
};

// 自动初始化
loginApp.init();
