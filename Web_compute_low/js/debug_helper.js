/* ==========================================================================
   📃 文件功能 : 调试助手 (Debug Helper)
   ⚡ 逻辑摘要 : 提供快速诊断和修复系统问题的工具函数
   💡 易懂解释 : 这是系统的"急救箱"！遇到问题时可以用它来检查和修复。
   📊 当前状态 : 活跃 (更新: 2025-12-16)
   ========================================================================== */

// 🔍 诊断系统状态
// 🧱 [2025-12-17] 修复: 使用 store 对象而不是直接读取 localStorage
window.diagnose = function() {
    console.log("=== 🔍 系统诊断报告 ===");
    
    // 1. 检查 store 状态 (主要数据源)
    const userId = localStorage.getItem('current_user_id') || 'default';
    console.log("📦 用户 ID:", userId);
    
    if (window.store) {
        console.log("\n=== 💾 Store 状态 (内存) ===");
        console.log("📦 store.apps:", window.store.apps);
        console.log("📦 store.installedApps:", window.store.installedApps);
        console.log("📦 store.lazyRegistry:", window.store.lazyRegistry);
        console.log("📦 已安装应用数量:", Object.keys(window.store.installedApps || {}).length);
        console.log("📦 应用状态数量:", Object.keys(window.store.apps || {}).length);
        console.log("📦 懒加载注册数量:", Object.keys(window.store.lazyRegistry || {}).length);
        
        // 检查小天使状态
        const companion = window.store.apps && window.store.apps['win-companion'];
        if (companion) {
            console.log("👼 小天使状态:", companion);
            console.log("👼 小天使是否打开:", companion.isOpen);
        } else {
            console.warn("⚠️ 小天使状态不存在！");
        }
    } else {
        console.warn("⚠️ Store 对象不可用");
    }
    
    // 2. 检查 DOM 状态
    console.log("\n=== 🖥️ DOM 状态 ===");
    const desktop = document.getElementById('desktop');
    const icons = desktop ? desktop.querySelectorAll('.desktop-icon') : [];
    const windows = desktop ? desktop.querySelectorAll('.window') : [];
    
    console.log("🖼️ 桌面图标数量:", icons.length);
    console.log("🪟 窗口数量:", windows.length);
    
    // 列出所有窗口
    windows.forEach(win => {
        const isOpen = win.classList.contains('open');
        const isMinimized = win.classList.contains('minimized');
        const content = win.querySelector('.content');
        console.log(`  - ${win.id}: open=${isOpen}, minimized=${isMinimized}, hasContent=${!!content && content.innerHTML.length > 0}`);
    });
    
    // 3. 检查小天使 DOM
    const angelScene = document.getElementById('angel-scene');
    const angelSpeech = document.getElementById('angel-speech');
    console.log("\n=== 👼 小天使 DOM ===");
    console.log("🎬 angel-scene:", angelScene ? "存在" : "不存在");
    console.log("💬 angel-speech:", angelSpeech ? "存在" : "不存在");
    
    // 4. 检查 store 状态 (如果可访问)
    if (window.store) {
        console.log("\n=== 💾 Store 状态 ===");
        console.log("📦 store.apps:", window.store.apps);
        console.log("📦 store.installedApps:", window.store.installedApps);
    }
    
    console.log("\n=== 诊断完成 ===");
    console.log("💡 如果发现问题，可以尝试运行 quickFix() 或 resetSystem()");
};

// 🔧 快速修复
// 🧱 [2025-12-17] 修复: 使用 store 对象进行修复
window.quickFix = async function() {
    console.log("🔧 正在执行快速修复...");
    
    if (!window.store) {
        console.error("❌ Store 对象不可用，请刷新页面");
        return;
    }
    
    try {
        // 1. 确保小天使是打开状态
        window.store.updateApp('win-companion', { isOpen: true, isMinimized: false });
        
        // 2. 重置所有窗口的最小化状态
        Object.keys(window.store.apps).forEach(id => {
            if (window.store.apps[id]) {
                window.store.updateApp(id, { isMinimized: false });
            }
        });
        
        // 3. 保存修复后的数据
        await window.store.save();
        
        console.log("✅ 快速修复完成！正在刷新页面...");
        setTimeout(() => location.reload(), 500);
    } catch (e) {
        console.error("❌ 修复失败:", e);
    }
};

// 🗑️ 清除缓存并重置
// 🧱 [2025-12-17] 修复: store.reset() 会清理 IndexedDB + localStorage
window.clearCache = async function() {
    if (confirm("⚠️ 确定要清除所有缓存吗？这将重置所有窗口位置和状态。")) {
        console.log("🗑️ 正在清除所有缓存...");
        
        if (window.store) {
            // store.reset() 会清理 IndexedDB 永久缓存 + localStorage 临时缓存
            await window.store.reset();
            console.log("✅ 所有缓存已清除");
        } else {
            console.warn("⚠️ Store 对象不可用，尝试手动清理...");
            // 备用方案：手动清理
            indexedDB.deleteDatabase('AngelMemoryBank');
            localStorage.clear();
            console.log("✅ 手动清理完成");
        }
        
        console.log("✅ 正在刷新页面...");
        setTimeout(() => location.reload(), 500);
    }
};

// 🔄 强制重新加载小天使
// 🧱 [2025-12-17] 修复: 使用 store 对象更新状态
window.reloadAngel = function() {
    console.log("🔄 正在重新加载小天使...");
    
    // 1. 关闭现有的小天使窗口
    const angelWin = document.getElementById('win-companion');
    if (angelWin) {
        angelWin.remove();
    }
    
    // 2. 更新 store 状态
    if (window.store) {
        window.store.updateApp('win-companion', { isOpen: true });
    }
    
    // 3. 触发重新打开
    if (window.wm) {
        window.wm.openApp('win-companion', false);
        console.log("✅ 小天使已重新加载！");
    } else {
        console.error("❌ WindowManager 不可用，请刷新页面");
    }
};

console.log("💡 调试助手已加载！可用命令:");
console.log("  - diagnose()    : 诊断系统状态");
console.log("  - quickFix()    : 快速修复常见问题");
console.log("  - clearCache()  : 清除缓存并重置");
console.log("  - reloadAngel() : 重新加载小天使");
console.log("  - resetSystem() : 完全重置系统 (已内置)");
