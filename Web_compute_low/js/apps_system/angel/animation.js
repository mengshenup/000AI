/**
 * @fileoverview Animation - 动画循环原子
 * @description 小天使 3D 动画渲染循环
 * @module apps_system/angel/animation
 */

/**
 * 创建动画循环
 * @param {Object} app - AngelApp 实例
 * @returns {Function} animate 函数
 */
export function createAnimateLoop(app) {
    return function animate() {
        if (!app.isRunning) return;
        app.ctx.requestAnimationFrame(animate);

        const now = performance.now();
        if (!app.lastTime) app.lastTime = now;
        const delta = now - app.lastTime;

        if (app.frameInterval && delta < app.frameInterval) return;

        // 自动降级检测
        if (delta > 100) {
            app.lowFpsCount = (app.lowFpsCount || 0) + 1;
            if (app.lowFpsCount > 20 && app.perfMode !== 'low') {
                app.perfMode = 'low';
                app.targetFPS = 30;
                app.frameInterval = 1000 / 30;
                if (app.renderer) app.renderer.setPixelRatio(1);
                app.lowFpsCount = 0;
            }
        } else {
            app.lowFpsCount = 0;
        }

        app.lastTime = now - (delta % (app.frameInterval || 16.67));

        // 浮动动画
        const t = now / 1000;
        if (app.group) app.group.position.y = Math.sin(t * 1) * 0.2;
        if (app.wL) app.wL.rotation.y = 0.3 + Math.sin(t * 2) * 0.3;
        if (app.wR) app.wR.rotation.y = -0.3 - Math.sin(t * 2) * 0.3;

        // 渲染
        if (app.renderer && app.scene && app.camera) {
            app.renderer.render(app.scene, app.camera);
        }
    };
}

/**
 * 设置性能模式
 * @param {Object} app - AngelApp 实例
 * @param {string} mode - 'high' | 'low'
 */
export function setPerfMode(app, mode) {
    app.perfMode = mode;
    app.targetFPS = mode === 'low' ? 30 : 60;
    app.frameInterval = 1000 / app.targetFPS;
    if (app.renderer) {
        app.renderer.setPixelRatio(mode === 'low' ? 1 : window.devicePixelRatio);
    }
}
