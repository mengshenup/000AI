import { bus } from '../system/event_bus.js'; // 💖 引入事件总线
import { network } from '../system/network.js'; // 💖 引入网络模块
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
        // 监听打开登录界面的事件
        bus.on('system:open_login', () => this.open()); // 💖 收到打开登录界面指令时执行
        
        // 尝试自动登录
        this.autoLogin(); // 💖 尝试自动登录
    },

    // =================================
    //  🎉 自动登录 (无参数)
    //
    //  🎨 代码用途：
    //     检查本地缓存中是否有有效的 API Key 和用户信息，如果有则直接登录。
    //
    //  💡 易懂解释：
    //     “咦，这张脸我认识！” 如果你之前来过，门卫大叔会直接给你开门哦~ 👋
    //
    //  ⚠️ 警告：
    //     依赖 localStorage 中的 'angel_api_key' 和 'current_user_id'。
    // =================================
    async autoLogin() {
        // 1. 尝试从浏览器缓存读取 Key
        const cachedKey = localStorage.getItem('angel_api_key'); // 💖 获取缓存的 API Key
        const cachedUser = localStorage.getItem('current_user_id'); // 💖 获取缓存的用户 ID
        const cachedToken = localStorage.getItem('angel_auth_token'); // 💖 获取缓存的 Token
        
        if (cachedKey && cachedUser && cachedToken) { // 💖 如果三者都存在
            this.currentUser = { 
                id: cachedUser, 
                name: cachedUser, 
                account: cachedUser, 
                keys: [{ name: 'Cached Key', value: cachedKey }] 
            }; // 💖 构造当前用户对象
            this.updateSystemUser(); // 💖 更新系统用户状态
            network.connect(); // 🚀 连接网络
            return; // 💖 结束函数
        }

        // 2. 如果没有缓存，显示登录界面
        // this.open(); 
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
        
        // 发送 Key 给服务器 (如果有选中的 Key)
        if (this.currentUser.keys.length > 0) { // 💖 如果用户有 API Key
            // 默认使用第一个 Key
            const activeKey = this.currentUser.keys[0].value; // 💖 获取第一个 Key
            localStorage.setItem('angel_api_key', activeKey); // 缓存 Key // 💖 缓存 API Key
            network.send({ type: 'auth', key: activeKey }); // 💖 发送认证请求
        }
        
        // 重新加载该用户的窗口布局
        // store.syncFromClientDB(); // 需要 store 支持重载
    },

    // =================================
    //  🎉 渲染登录界面 (无参数)
    //
    //  🎨 代码用途：
    //     动态创建登录界面的 HTML 结构，包括头像、输入框和按钮，并绑定事件。
    //
    //  💡 易懂解释：
    //     画出门的样子：要有放照片的地方，填名字的地方，还有一个大大的“登录”按钮！🎨
    //
    //  ⚠️ 警告：
    //     直接操作 DOM，创建 id="login-overlay" 的元素。
    // =================================
    render() {
        const overlay = document.createElement('div'); // 💖 创建遮罩层容器
        overlay.id = 'login-overlay'; // 💖 设置 ID
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px);
            z-index: 9999; display: flex; justify-content: center; align-items: center;
        `; // 💖 设置样式：全屏、半透明黑背景、毛玻璃效果、居中对齐

        // 默认显示 admin
        const defaultUser = { name: 'Admin', account: 'admin', avatar: 'assets/wp-0.avif', keys: [] }; // 💖 默认显示的用户信息
        const user = this.currentUser || defaultUser; // 💖 如果没有当前用户，使用默认用户

        overlay.innerHTML = `
            <div class="login-card" style="
                background: rgba(255, 255, 255, 0.9); padding: 30px; border-radius: 20px;
                width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                display: flex; flex-direction: column; gap: 15px;
            ">
                <div style="text-align: center;">
                    <img src="${user.avatar}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.1);"> <!-- 💖 用户头像 -->
                    <h2 style="margin: 10px 0; color: #333;">Login</h2> <!-- 💖 标题 -->
                </div>

                <div class="form-group">
                    <label>账号</label>
                    <input type="text" id="login-account" value="${user.account}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px;"> <!-- 💖 账号输入框 -->
                </div>

                <div class="form-group">
                    <label>密码</label>
                    <input type="password" id="login-password" placeholder="默认为空" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px;"> <!-- 💖 密码输入框 -->
                </div>

                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button id="btn-login" style="flex: 1; padding: 10px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">登录</button> <!-- 💖 登录按钮 -->
                </div>
                <div id="login-msg" style="color: red; text-align: center; font-size: 12px;"></div> <!-- 💖 错误信息显示区域 -->
            </div>
        `;

        document.body.appendChild(overlay); // 💖 将遮罩层添加到页面

        // 绑定事件
        document.getElementById('btn-login').onclick = async () => { // 💖 登录按钮点击事件
            const account = document.getElementById('login-account').value; // 💖 获取账号
            const password = document.getElementById('login-password').value; // 💖 获取密码
            const msg = document.getElementById('login-msg'); // 💖 获取消息显示元素

            try {
                msg.innerText = "正在验证..."; // 💖 提示正在验证
                const res = await fetch(`${WEB_API_URL}/login`, { // 💖 发送登录请求
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ account, password }) // 💖 发送账号密码
                });

                if (res.ok) { // 💖 如果登录成功
                    const data = await res.json(); // 💖 解析响应数据
                    
                    // 💾 保存 Token
                    if (data.token) {
                        localStorage.setItem('angel_auth_token', data.token); // 💖 缓存 Token
                    }

                    this.currentUser = {
                        id: account,
                        name: account,
                        account: account,
                        avatar: 'assets/wp-0.avif',
                        keys: data.keys // 💖 获取用户的 API Keys
                    };
                    this.close(); // 💖 关闭登录界面
                    this.updateSystemUser(); // 💖 更新系统用户状态
                    network.connect(); // 🚀 连接网络
                    bus.emit('system:speak', `欢迎回来，${account}`); // 💖 语音欢迎
                } else {
                    const err = await res.json(); // 💖 解析错误信息
                    msg.innerText = err.detail || "登录失败"; // 💖 显示错误信息
                }
            } catch (e) {
                // =================================
                //  🎉 离线登录 (Offline Login)
                //
                //  🎨 代码用途：
                //     当登录服务器不可用时，允许用户以离线身份进入系统。
                //
                //  💡 易懂解释：
                //     门卫大叔不在家？那就自己开门进去吧，反正家里也没别人！🏠
                // =================================
                console.warn("登录服务器不可用，进入离线模式", e);
                // 离线模式逻辑
                this.currentUser = {
                    id: account || 'offline_user',
                    name: account || 'Offline User',
                    account: account || 'offline',
                    avatar: 'assets/wp-0.avif',
                    keys: []
                };
                this.close();
                this.updateSystemUser();
                // network.connect(); // 离线模式不连接网络
                bus.emit('system:speak', `离线模式启动，欢迎 ${this.currentUser.name}`);
            }
        };
        
        // 点击背景关闭
        overlay.onclick = (e) => {
            if (e.target === overlay) this.close(); // 💖 点击遮罩层背景时关闭
        };
    }
};

// 自动初始化
loginApp.init(); // 💖 启动应用
