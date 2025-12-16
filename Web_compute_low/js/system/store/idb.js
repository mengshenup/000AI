/**
 * @fileoverview IDB - IndexedDB 操作原子
 * @description 封装 IndexedDB 操作，提供简单的 get/set 接口
 * @module system/store/idb
 * 
 * 🎨 代码用途：
 *    封装 IndexedDB 操作，提供简单的 get/set 接口。
 *    IndexedDB 是浏览器提供的永久存储，容量可达数百 MB。
 * 
 * 💡 易懂解释：
 *    这是一个"大保险柜"，比 localStorage 的"小抽屉"大多了！🗄️
 */

/** @type {string} 数据库名称 */
const DB_NAME = 'AngelMemoryBank';

/** @type {string} 存储空间名称 */
const STORE_NAME = 'memory';

/** @type {number} 数据库版本 */
const DB_VERSION = 1;

/** @type {IDBDatabase|null} 数据库实例 */
let db = null;

/**
 * 初始化数据库
 * @returns {Promise<IDBDatabase>}
 */
export async function initDB() {
    if (db) return db;
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('❌ IndexedDB 打开失败:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('✅ IndexedDB 已就绪');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'key' });
                console.log('📦 IndexedDB 存储空间已创建');
            }
        };
    });
}

/**
 * 获取数据
 * @param {string} key - 键名
 * @returns {Promise<any>} 值，不存在返回 null
 */
export async function getItem(key) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        
        request.onsuccess = () => {
            resolve(request.result ? request.result.value : null);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * 保存数据
 * @param {string} key - 键名
 * @param {any} value - 值
 * @returns {Promise<void>}
 */
export async function setItem(key, value) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put({ key, value });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * 删除数据
 * @param {string} key - 键名
 * @returns {Promise<void>}
 */
export async function deleteItem(key) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * 获取数据库实例
 * @returns {IDBDatabase|null}
 */
export function getDB() {
    return db;
}
