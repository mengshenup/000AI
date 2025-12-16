/**
 * @fileoverview Store 兼容层
 * @description 向后兼容的导出入口，实际实现在 store/ 目录下
 * @module system/store
 * @deprecated 请直接使用 './store/index.js'
 * 
 * 🎨 代码用途：
 *    这是一个兼容层，保持旧的 import 路径可用。
 *    实际实现已拆分到 store/ 目录下的原子模块。
 * 
 * 💡 易懂解释：
 *    这是一个"转发站"，旧代码还能用，新代码可以直接导入原子。📮
 * 
 * 使用方式：
 *    旧代码: import { store } from './store.js'  ✅ 仍然有效
 *    新代码: import { getItem } from './store/idb.js'  ✅ 更细粒度
 */

// 从分子入口重新导出所有内容
export { 
    VERSION,
    store,
    // 原子导出
    initDB, 
    getItem, 
    setItem, 
    deleteItem,
    syncFromClientDB, 
    syncFromServer, 
    syncToServer, 
    resetData,
    appCache
} from './store/index.js';
