import { bus } from '../system/event_bus.js';
import { network } from '../system/network.js';

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

    autoLogin() {
        // 简单模拟：默认登录第一个用户
        this.currentUser = this.users[0];
        this.updateSystemUser();
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
        // 发送 Key 给服务器 (如果有选中的 Key)
        if (this.currentUser.keys.length > 0) {
            // 默认使用第一个 Key
            const activeKey = this.currentUser.keys[0].value;
            network.send({ type: 'auth', key: activeKey });
        }
    },

    render() {
        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px);
            z-index: 9999; display: flex; justify-content: center; align-items: center;
        `;

        const user = this.currentUser || this.users[0];

        overlay.innerHTML = `
            <div class="login-card" style="
                background: rgba(255, 255, 255, 0.9); padding: 30px; border-radius: 20px;
                width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                display: flex; flex-direction: column; gap: 15px;
            ">
                <div style="text-align: center;">
                    <img src="${user.avatar}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                    <h2 style="margin: 10px 0; color: #333;">${user.name}</h2>
                    <p style="color: #666; font-size: 14px;">@${user.account}</p>
                </div>

                <div class="form-group">
                    <label>账号</label>
                    <input type="text" value="${user.account}" disabled style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px;">
                </div>

                <div class="form-group">
                    <label>密码</label>
                    <input type="password" placeholder="默认为空" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px;">
                </div>

                <div class="form-group">
                    <label>API Keys</label>
                    <div id="key-list" style="max-height: 100px; overflow-y: auto; border: 1px solid #eee; padding: 5px; border-radius: 8px; margin-bottom: 5px;">
                        ${user.keys.map(k => `<div style="font-size: 12px; padding: 2px;">🔑 ${k.name}</div>`).join('') || '<div style="color:#999; font-size:12px;">暂无 Key</div>'}
                    </div>
                    <button id="btn-add-key" style="width: 100%; padding: 5px; background: #f0f0f0; border: none; border-radius: 5px; cursor: pointer;">+ 添加 Key</button>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button id="btn-login" style="flex: 1; padding: 10px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">登录</button>
                    <button id="btn-switch" style="flex: 1; padding: 10px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">切换账号</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 绑定事件
        document.getElementById('btn-login').onclick = () => {
            // 简单模拟登录成功
            this.close();
            bus.emit('system:speak', `欢迎回来，${user.name}`);
        };

        document.getElementById('btn-add-key').onclick = () => {
            const key = prompt("请输入新的 Gemini API Key:");
            if (key) {
                user.keys.push({ name: `Key ${user.keys.length + 1}`, value: key });
                this.render(); // 重新渲染
                document.getElementById('login-overlay').remove(); // 移除旧的
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
