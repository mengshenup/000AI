import { bus } from './event_bus.js'; // 🚌 导入事件总线
import { pm } from './process_manager.js'; // 🛡️ 导入进程管理器 (确保优先加载)
import { network as net } from './network.js'; // 🌐 导入网络模块
import { wm } from './window_manager.js'; // 🪟 导入窗口管理器
import { store } from './store.js'; // 💾 导入状态存储
import { loginApp } from '../apps_system/login.js'; // 🆕 导入登录应用
import { WEB_API_URL } from './config.js'; // 🌐 导入 Web API 地址

// 🗑️ 移除静态导入，改为动态加载
// import './apps/browser.js'; 
// ...

export const VERSION = '1.0.0'; // 💖 系统核心模块版本号

function setupBusinessLogic() {
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

    // === 监听网络事件 -> 更新 UI ===

    // 监听网络统计数据更新 (上传/下载速度, 费用)
    // 优化：节流统计数据更新，每秒最多更新 2 次，减少 DOM 操作开销
    // 💖 逻辑已迁移至 traffic.js 和 billing.js 的 init() 中
    // let lastStatsUpdate = 0;
    // bus.on('net:stats', (stats) => { ... });

    // 监听实时画面帧更新
    // 优化：使用 requestAnimationFrame 节流渲染，避免高频 DOM 操作导致卡顿
    let pendingFrame = null;
    let isRendering = false;

    const renderLoop = () => {
        if (pendingFrame) {
            const el = document.getElementById('live-image'); // 📺 实时画面元素
            if (el) {
                el.src = pendingFrame; // 🖼️ 更新图片源
                el.style.display = 'block'; // 👁️ 确保图片显示
            }
            pendingFrame = null;
        }
        isRendering = false;
    };

    bus.on('net:frame', (imgSrc) => {
        // 🛠️ 修复：后端返回的是纯 Base64 字符串，需要添加 Data URI 前缀才能被 img 标签识别
        pendingFrame = `data:image/jpeg;base64,${imgSrc}`;
        if (!isRendering) {
            isRendering = true;
            requestAnimationFrame(renderLoop);
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
    await store.ready();

    try {
        // 1. 获取应用列表 (动态加载)
        const res = await fetch(`${WEB_API_URL}/get_apps_list`);
        const { apps, system_apps, system_core } = await res.json();

        // 辅助函数：检查是否需要更新 (优先对比行数)
        const checkUpdate = (serverApp, cachedApp) => {
            if (!cachedApp) return true;
            // 🛡️ 安全检查：优先对比代码行数 (防篡改/漏改版本号)
            // 注意：system_core 文件可能没有 id，这里主要针对 apps 和 system_apps
            if (serverApp.line_count !== undefined && cachedApp.line_count !== undefined) {
                if (serverApp.line_count !== cachedApp.line_count) {
                    console.warn(`[Security] 文件行数变更 detected: ${serverApp.filename || serverApp.id} (${cachedApp.line_count} -> ${serverApp.line_count})`);
                    return true;
                }
            }
            // 检查版本号
            if (serverApp.version !== cachedApp.version) {
                return true;
            }
            return false;
        };

        // 2. 动态导入应用辅助函数
        const loadApp = async (path, isSystem) => {
            try {
                // 添加版本号参数以破坏浏览器缓存 (如果需要)
                // const url = `${path}?v=${Date.now()}`; 
                const m = await import(path);
                // 只有导出了 config 的才被视为可注册的应用窗口
                if (m.config) {
                    // 💖 返回完整模块，以便后续调用 init
                    return { id: m.config.id, config: m.config, isSystem, init: m.init };
                }
            } catch (e) {
                console.error(`无法加载应用 ${path}:`, e);
            }
            return null;
        };

        // 3. 并行加载所有应用
        // 优先加载系统应用
        // 💖 路径修正：因为 loader.js 在 system/ 下，所以要往上跳一级
        const systemModules = (await Promise.all(system_apps.map(f => loadApp(`../apps_system/${f.filename}`, true)))).filter(Boolean);
        
        // 💖 懒加载优化：不再一次性加载所有用户应用
        // const userModules = (await Promise.all(apps.map(f => loadApp(`../apps/${f}`, false)))).filter(Boolean);
        
        // 注册用户应用到懒加载列表
        apps.forEach(app => {
            if (app.id && app.filename) {
                // 💖 检查版本号，决定是否更新元数据
                const cached = store.installedApps[app.id];
                if (checkUpdate(app, cached)) {
                    console.log(`[Loader] 更新应用元数据: ${app.id} (v${app.version}, lines:${app.line_count})`);
                    store.registerLazyApp(app.id, `../apps/${app.filename}`, app);
                } else {
                    // 版本一致，仅注册路径，不更新元数据 (使用缓存)
                    store.registerLazyApp(app.id, `../apps/${app.filename}`, cached);
                }
            } else if (typeof app === 'string') {
                // 兼容旧格式 (虽然 server 已经改了，但为了健壮性)
                // 无法获取 ID，只能跳过或尝试加载
                // console.warn("无法注册懊加载应用 (缺少ID):", app);
            }
        });
        
        // 💾 保存最新的元数据到本地数据库 (如果发生了更新)
        store.save();

        // 💖 只加载那些在 store 中标记为 isOpen 的应用，或者系统核心需要的应用
        // 我们需要遍历 store.apps，找到 isOpen: true 的，然后去 lazyRegistry 里找路径加载
        const userModules = [];
        const pendingLoads = [];

        Object.entries(store.apps).forEach(([id, appState]) => {
            if (appState.isOpen && !appState.isSystem) {
                const path = store.getLazyAppPath(id);
                if (path) {
                    pendingLoads.push(loadApp(path, false));
                }
            }
        });

        const loadedUserModules = (await Promise.all(pendingLoads)).filter(Boolean);
        
        const allModules = [...systemModules, ...loadedUserModules];

        console.log(`应用加载完成: 系统应用 ${systemModules.length} 个, 用户应用 ${loadedUserModules.length} 个 (懒加载模式)`);

        // 4. 注入元数据并初始化
        allModules.forEach((module) => {
            const { id, config, isSystem } = module;
            // 标记系统应用，以便 store.js 识别
            config.isSystem = isSystem;
            store.setAppMetadata(id, config);

            // 💖 如果应用导出了 init 函数，则执行初始化 (用于后台逻辑，如 traffic/billing)
            if (typeof module.init === 'function') {
                console.log(`初始化应用逻辑: ${id}`);
                module.init();
            }
        });

        // 5. 清理僵尸数据
        store.prune(allModules.map(m => m.id));

        // 6. 启动窗口管理器
        wm.init();
        setupBusinessLogic();
        net.connect();

        // 7. 启动系统级应用 (强制启动，不依赖记忆)
        // 用户要求：系统apps应该是最优先加载的... 无需手动打开
        systemModules.forEach(({id}) => {
            // 强制打开，不播放语音
            // 注意：openApp 内部会检查是否已打开
            wm.openApp(id, false);
        });

    } catch (err) {
        console.error("初始化失败:", err);
        // 即使失败也尝试启动核心服务
        wm.init();
        setupBusinessLogic();
        net.connect();
    }

    // 启动时钟逻辑 (每秒更新一次)
    setInterval(() => {
        const clock = document.getElementById('clock-time'); // ⏰ 时钟元素
        // 获取当前时间并格式化为 HH:MM
        if (clock) clock.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // 🕒 更新时间显示
    }, 1000);

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
};
