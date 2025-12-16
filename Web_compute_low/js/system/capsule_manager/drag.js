/**
 * @fileoverview 胶囊拖拽原子
 * @description 处理胶囊的水平拖拽功能
 * @module system/capsule_manager/drag
 * 
 * 🧱 踩坑记录:
 *    1. [2025-12-17] [已修复] 返回清理函数，避免内存泄漏
 */

/**
 * 启用元素的拖拽功能 (水平方向)
 * @param {HTMLElement} capsule - 需要启用拖拽的 DOM 元素
 * @param {number} initialOffset - 初始偏移量
 * @returns {Function} 清理函数，调用后移除所有事件监听器
 */
export function enableDrag(capsule, initialOffset = 0) {
    let isDragging = false;
    let startX = 0;
    let currentX = initialOffset;

    capsule.style.cursor = 'grab';
    capsule.style.position = 'relative';
    capsule.style.transition = 'transform 0.1s';

    const handleMouseDown = (e) => {
        isDragging = true;
        startX = e.clientX - currentX;
        capsule.style.cursor = 'grabbing';
        capsule.style.transition = 'none';
        e.preventDefault();
        e.stopPropagation();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        capsule.style.transform = `translateX(${currentX}px)`;
    };

    const handleMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            capsule.style.cursor = 'grab';
            capsule.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

            // 保存位置
            const appId = capsule.id.replace('capsule-', '');
            console.log(`[Capsule] 拖拽结束，保存位置: ${appId} -> ${currentX}px`);
            import('../store.js').then(({ store }) => {
                store.updateApp(appId, { capsuleOffsetX: currentX });
            }).catch(e => {
                console.warn('[Capsule] 保存位置失败:', e.message);
            });
        }
    };

    capsule.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 返回清理函数
    return () => {
        capsule.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
}
