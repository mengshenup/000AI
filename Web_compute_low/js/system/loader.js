import { bus } from './event_bus.js'; // 🚌 导入事件总线
import { pm } from './process_manager.js'; // 🛡️ 导入进程管理器 (确保优先加载)
import { network as net } from './network.js'; // 🌐 导入网络模块
import { wm } from './window_manager.js'; // 🪟 导入窗口管理器
import { store } from './store.js'; // 💾 导入状态存储
import { WEB_API_URL, DEFAULT_APPS } from './config.js'; // 🌐 导入配置和默认应用

// 🗑️ 移除静态导入，改为动态加载
// import './apps/browser.js'; 
// ...

export const VERSION = '1.0.0'; // 💖 系统核心模块版本号

// =================================
//  🎉 设置业务逻辑 (无参数)
//
//  🎨 代码用途：
//     定义各个模块之间如何协作。主要通过事件总线 (EventBus) 来解耦。
//     这里集中处理网络消息对 UI 的更新，以及 UI 操作对网络的请求。
//
//  💡 易懂解释：
//     这是制定“作战计划”。比如“收到敌人情报(网络消息)后，大屏幕(UI)要显示出来，小天使要报警”。
//
//  ⚠️ 警告：
//     随着业务变复杂，这个函数可能会变得很长。建议将来按功能拆分。
// =================================
function setupBusinessLogic() {
    // === 监听网络事件 -> 更新 UI ===

    // 监听网络统计数据更新 (上传/下载速度, 费用)
    // 优化：节流统计数据更新，每秒最多更新 2 次，减少 DOM 操作开销
    // 💖 逻辑已迁移至 traffic.js 和 billing.js 的 init() 中
    // let lastStatsUpdate = 0;
    // bus.on('net:stats', (stats) => { ... });

    // 监听实时画面帧更新
    // 优化：使用 requestAnimationFrame 节流渲染，避免高频 DOM 操作导致卡顿
    let pendingFrame = null; // 💖 待渲染的帧数据
    let isRendering = false; // 💖 渲染锁，防止重复调用

    const renderLoop = () => {
        if (pendingFrame) { // 💖 如果有待渲染的帧
            const el = document.getElementById('live-image'); // 📺 实时画面元素
            if (el) {
                el.src = pendingFrame; // 🖼️ 更新图片源
                el.style.display = 'block'; // 👁️ 确保图片显示
            }
            pendingFrame = null; // 💖 清空待渲染帧
        }
        isRendering = false; // 💖 释放渲染锁
    };

    bus.on('net:frame', (imgSrc) => { // 💖 监听帧数据事件
        // 🛠️ 修复：后端返回的是纯 Base64 字符串，需要添加 Data URI 前缀才能被 img 标签识别
        pendingFrame = `data:image/jpeg;base64,${imgSrc}`; // 💖 构造 Data URI
        if (!isRendering) { // 💖 如果当前没有在渲染
            isRendering = true; // 💖 加锁
            requestAnimationFrame(renderLoop); // 💖 请求下一帧渲染
        }
    });

    // 监听收到新情报 (转发给 IntelligenceApp，这里只做中转)
    bus.on('net:new_intel', (data) => {
        bus.emit('net:new_intel', data); // 📡 重新分发给 IntelligenceApp 监听
    });

    // 监听收到分析结果
    bus.on('net:analysis_result', (data) => {
        bus.emit('net:analysis_result', data); // 📤 转发分析结果
    });

    // === 监听 UI 命令 -> 发送网络请求 ===
    // (原本的 cmd:scan 和 cmd:remote_click 已移动到 browser.js)

    // 💖 胶囊拖拽逻辑已迁移至 capsule_manager.js，此处移除
}

window.onload = async () => {
    // =================================
    //  🎉 窗口加载完成回调 (无参数)
    //
    //  🎨 代码用途：
    //     当网页所有资源加载完毕后执行。
    //
    //  💡 易懂解释：
    //     等舞台都搭好了，演员都化好妆了，再拉开大幕。
    //
    //  ⚠️ 警告：
    //     如果 JS 报错，可能会导致这里的初始化代码中断执行，整个页面瘫痪。
    // =================================

    // 0. 等待 Store 初始化完成 (修复刷新重置 bug)
    await store.ready(); // 💖 确保 Store 已从 IndexedDB 加载数据

    try {
        // 1. 获取应用列表 (动态加载)
        let appsData;
        try {
            const res = await fetch(`${WEB_API_URL}/get_apps_list`); // 💖 从服务器获取应用列表
            appsData = await res.json(); // 💖 解析 JSON 数据
        } catch (e) {
            // =================================
            //  🎉 离线模式回退 (Offline Fallback)
            //
            //  🎨 代码用途：
            //     当无法连接到后端服务器时，使用本地硬编码的应用列表，确保系统能正常启动。
            //
            //  💡 易懂解释：
            //     如果电话打不通（断网了），就照着上次记下来的菜单（本地列表）做菜吧！🍲
            // =================================
            console.warn("无法连接应用服务器，使用本地离线模式", e);
            appsData = {
                apps: Object.values(DEFAULT_APPS), // 💖 使用 config.js 中的默认应用
                system_apps: [
                    { id: "sys-taskbar", filename: "taskbar.js", version: "1.0.0" },
                    { id: "sys-desktop", filename: "desktop.js", version: "1.0.0" },
                    { id: "sys-context-menu", filename: "context_menu.js", version: "1.0.0" },
                    { id: "app-login", filename: "login.js", version: "1.0.0" },
                    { id: "win-companion", filename: "angel.js", version: "1.0.0" },
                    { id: "svc-billing", filename: "billing.js", version: "1.0.0" },
                    { id: "svc-traffic", filename: "traffic.js", version: "1.0.0" },
                    { id: "svc-fps", filename: "fps.js", version: "1.0.0" }
                ],
                system_core: []
            };
        }
        const { apps, system_apps, system_core } = appsData;
        console.log(`[Loader] Fetched apps: ${apps.length}, system_apps: ${system_apps.length}`); // 🐛 Debug Log

        // 辅助函数：检查是否需要更新 (优先对比行数)
        const checkUpdate = (serverApp, cachedApp) => {
            if (!cachedApp) return true; // 💖 如果没有缓存，肯定要更新
            // 🛡️ 安全检查：优先对比代码行数 (防篡改/漏改版本号)
            // 注意：system_core 文件可能没有 id，这里主要针对 apps 和 system_apps
            if (serverApp.line_count !== undefined && cachedApp.line_count !== undefined) {
                if (serverApp.line_count !== cachedApp.line_count) { // 💖 如果行数不一致
                    console.warn(`[Security] 文件行数变更 detected: ${serverApp.filename || serverApp.id} (${cachedApp.line_count} -> ${serverApp.line_count})`); // ⚠️ 打印警告
                    return true; // 💖 需要更新
                }
            }
            // 检查版本号
            if (serverApp.version !== cachedApp.version) { // 💖 如果版本号不一致
                return true; // 💖 需要更新
            }
            return false; // 💖 不需要更新
        };

        // 2. 动态导入应用辅助函数
        const loadApp = async (path, isSystem) => {
            try {
                console.log(`⏳ 正在加载应用: ${path}`); // 📝 加载日志
                // 添加版本号参数以破坏浏览器缓存 (如果需要)
                // const url = `${path}?v=${Date.now()}`; 
                const m = await import(path); // 💖 动态导入模块
                // 只有导出了 config 的才被视为可注册的应用窗口
                if (m.config) {
                    console.log(`✅ 应用加载成功: ${m.config.id}`); // 📝 成功日志
                    // 💖 返回完整模块，以便后续调用 init
                    return { id: m.config.id, config: m.config, isSystem, init: m.init }; // 💖 返回应用对象
                } else {
                    console.warn(`⚠️ 应用 ${path} 缺少 config 导出`); // ⚠️ 警告日志
                }
            } catch (e) {
                console.error(`❌ 无法加载应用 ${path}:`, e); // ❌ 打印错误日志
            }
            return null; // 💖 加载失败返回 null
        };

        // 3. 并行加载所有应用
        // 优先加载系统应用
        // 💖 路径修正：因为 loader.js 在 system/ 下，所以要往上跳一级
        console.log("🔄 开始加载系统应用...");
        const systemModules = (await Promise.all(system_apps.map(async f => {
             console.log(`🔄 [System] Loading ${f.id}...`);
             const mod = await loadApp(`../apps_system/${f.filename}`, true);
             if(mod) console.log(`✅ [System] Loaded ${f.id}`);
             return mod;
        }))).filter(Boolean); // 💖 加载系统应用
        
        // 💖 检测是否为首次运行 (本地没有已安装应用记录)
        const isFirstRun = Object.keys(store.installedApps).length === 0;
        if (isFirstRun) {
            console.log("✨ 检测到首次运行，正在执行默认全安装...");
        }

        // 注册用户应用到懒加载列表
        apps.forEach(app => {
            if (app.id && app.filename) {
                // 💖 优先使用本地默认配置补全缺失的图标/颜色信息
                const defaultApp = DEFAULT_APPS[app.id];
                if (defaultApp) {
                    if (!app.icon) app.icon = defaultApp.icon;
                    if (!app.color) app.color = defaultApp.color;
                    if (!app.name) app.name = defaultApp.name;
                }

                // 💖 检查版本号，决定是否更新元数据
                const cached = store.installedApps[app.id]; // 💖 获取缓存的应用信息
                // 💖 如果是首次运行，强制更新元数据以完成"默认全安装"
                if (isFirstRun || checkUpdate(app, cached)) { // 💖 检查是否需要更新
                    if (!isFirstRun) console.log(`[Loader] 更新应用元数据: ${app.id} (v${app.version}, lines:${app.line_count})`); // 📝 打印日志
                    store.registerLazyApp(app.id, `../apps/${app.filename}`, app); // 💖 注册并更新元数据
                } else {
                    // 版本一致，仅注册路径，不更新元数据 (使用缓存)
                    store.registerLazyApp(app.id, `../apps/${app.filename}`, cached); // 💖 仅注册路径
                }
            } else if (typeof app === 'string') {
                // 兼容旧格式 (虽然 server 已经改了，但为了健壮性)
                // 无法获取 ID，只能跳过或尝试加载
                // console.warn("无法注册懊加载应用 (缺少ID):", app);
            }
        });
        
        // 💾 保存最新的元数据到本地数据库 (如果发生了更新)
        store.save(); // 💖 保存 Store 状态

        // 💖 只加载那些在 store 中标记为 isOpen 的应用，或者系统核心需要的应用
        // 我们需要遍历 store.apps，找到 isOpen: true 的，然后去 lazyRegistry 里找路径加载
        const userModules = []; // 💖 存储已加载的用户模块
        const pendingLoads = []; // 💖 存储待加载的 Promise

        Object.entries(store.apps).forEach(([id, appState]) => { // 💖 遍历所有应用状态
            if (appState.isOpen && !appState.isSystem) { // 💖 如果应用是打开状态且不是系统应用
                const path = store.getLazyAppPath(id); // 💖 获取懒加载路径
                if (path) { // 💖 如果路径存在
                    pendingLoads.push(loadApp(path, false)); // 💖 添加到加载队列
                }
            }
        });

        const loadedUserModules = (await Promise.all(pendingLoads)).filter(Boolean); // 💖 等待所有用户应用加载完成
        
        const allModules = [...systemModules, ...loadedUserModules]; // 💖 合并所有模块

        console.log(`应用加载完成: 系统应用 ${systemModules.length} 个, 用户应用 ${loadedUserModules.length} 个 (懒加载模式), 核心系统 ${system_core.length} 个`); // 📝 打印加载统计
        console.log(`📦 已注册安装应用: ${Object.keys(store.installedApps).length} 个 (准备就绪)`); // 💖 新增：明确显示已安装应用数量
        console.log(`[Loader] Installed Apps Keys:`, Object.keys(store.installedApps)); // 🐛 Debug Log

        // 4. 注入元数据并初始化
        allModules.forEach((module) => { // 💖 遍历所有模块
            const { id, config, isSystem } = module; // 💖 解构模块信息
            // 标记系统应用，以便 store.js 识别
            config.isSystem = isSystem; // 💖 设置系统应用标记
            store.setAppMetadata(id, config); // 💖 更新 Store 中的元数据

            // 💖 如果应用导出了 init 函数，则执行初始化 (用于后台逻辑，如 traffic/billing)
            if (typeof module.init === 'function') { // 💖 如果有 init 函数
                console.log(`初始化应用逻辑: ${id}`); // 📝 打印日志
                module.init(); // 🚀 执行初始化
            }
        });

        // 5. 清理僵尸数据
        store.prune(allModules.map(m => m.id)); // 💖 移除 Store 中多余的应用数据

        // 6. 启动窗口管理器
        wm.init(); // 🚀 初始化窗口管理器
        setupBusinessLogic(); // 🚀 设置业务逻辑
        // net.connect(); // 🚀 连接网络 (已移至 login.js，登录成功后连接)

        // 7. 启动系统级应用 (强制启动，不依赖记忆)
        // 用户要求：系统apps应该是最优先加载的... 无需手动打开
        systemModules.forEach(({id}) => { // 💖 遍历系统应用
            if (id === 'app-login') return; // 💖 跳过登录界面 (默认不显示)
            // 强制打开，不播放语音
            // 注意：openApp 内部会检查是否已打开
            wm.openApp(id, false); // 🚀 打开系统应用
        });

        // 8. 通知桌面刷新图标
        bus.emit('system:apps_loaded'); // 💖 通知桌面应用列表已就绪

    } catch (err) {
        console.error("初始化失败:", err); // ❌ 打印错误日志
        // 即使失败也尝试启动核心服务
        wm.init(); // 🚀 尝试初始化窗口管理器
        setupBusinessLogic(); // 🚀 尝试设置业务逻辑
        // net.connect(); // 🚀 尝试连接网络 (已移至 login.js)
    }

    // 启动时钟逻辑 (每秒更新一次)
    setInterval(() => {
        const clock = document.getElementById('clock-time'); // ⏰ 时钟元素
        // 获取当前时间并格式化为 HH:MM
        if (clock) clock.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // 🕒 更新时间显示
    }, 1000); // 💖 每秒执行一次

    // === 特定 UI 绑定 (非通用部分) ===

    // 辅助函数：在胶囊上方打开窗口
    // 💖 已废弃：逻辑已迁移至各个胶囊应用的 init() 中
    // const toggleCapsuleWindow = (capsuleId, appId) => { ... };

    // 绑定任务栏胶囊点击事件 -> 打开详情窗口
    // 💖 已废弃：逻辑已迁移至各个胶囊应用的 init() 中
    // document.getElementById('bar-traffic')?.addEventListener('click', ...);
    // document.getElementById('bar-billing')?.addEventListener('click', ...);

    // 绑定扫描按钮点击事件 (保留在这里，因为它可能属于全局工具栏，或者也可以移到 browser.js，但目前先保留)
    // 实际上 browser.js 已经监听了 cmd:scan，这里只是触发事件
    document.getElementById('btn-scan')?.addEventListener('click', () => bus.emit('cmd:scan')); // 🔍 绑定扫描按钮

    // (浏览器控制、视频进度条、远程点击逻辑已移动到 apps/browser.js)

    // === 小天使特殊拖拽绑定 ===
    // 移除：小天使现在是标准窗口，自动拥有拖拽功能
    // const angelEl = document.getElementById('angel-companion');
    // if (angelEl) {
    //     angelEl.addEventListener('mousedown', (e) => {
    //         if (e.button === 0) wm.startDrag(e, angelEl, 'window'); // 复用 window 拖拽逻辑
    //     });
    // }

    // (自定义壁纸按钮逻辑已移动到 apps/settings.js)

    // 🛠️ 暴露重置函数到全局，方便 F12 调试
    window.resetSystem = async () => {
        if (confirm("⚠️ 确定要重置所有系统状态吗？这将清除所有应用数据和布局。")) {
            await store.reset();
            location.reload();
        }
    };
    console.log("💡 提示: 在控制台输入 resetSystem() 可重置系统状态");
};
