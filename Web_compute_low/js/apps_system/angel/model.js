/**
 * @fileoverview 3D 模型原子
 * @description 处理小天使 3D 模型的构建
 * @module apps_system/angel/model
 */

/**
 * 构建小天使 3D 模型
 * @param {THREE.Scene} scene - 3D 场景
 * @returns {Object} {group, wL, wR} 模型组和翅膀引用
 */
export function buildModel(scene) {
    const group = new THREE.Group();
    group.scale.set(0.54, 0.54, 0.54);

    const matSkin = new THREE.MeshLambertMaterial({ color: 0xffe0bd });
    const matDress = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const matHair = new THREE.MeshLambertMaterial({ color: 0xffb6c1 });
    const matEye = new THREE.MeshBasicMaterial({ color: 0x20c997 });
    const matGold = new THREE.MeshBasicMaterial({ color: 0xffd700 });

    const box = (w, h, d, mat, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        return m;
    };

    // Head
    const head = new THREE.Group();
    head.position.y = 1.4;
    head.add(box(1, 0.9, 0.9, matSkin, 0, 0, 0));
    head.add(box(1.1, 0.8, 0.6, matHair, 0, 0.2, -0.3));
    head.add(box(1.1, 0.3, 1.0, matHair, 0, 0.55, 0));
    head.add(box(0.2, 0.7, 0.2, matHair, -0.5, 0.1, 0.4));
    head.add(box(0.2, 0.7, 0.2, matHair, 0.5, 0.1, 0.4));
    head.add(box(0.15, 0.15, 0.05, matEye, -0.25, -0.1, 0.46));
    head.add(box(0.15, 0.15, 0.05, matEye, 0.25, -0.1, 0.46));
    head.add(box(0.3, 1.8, 0.3, matHair, -0.7, -0.5, 0));
    head.add(box(0.3, 1.8, 0.3, matHair, 0.7, -0.5, 0));
    group.add(head);

    // Body
    group.add(box(0.8, 0.8, 0.5, matDress, 0, 0.6, 0));
    group.add(box(1.0, 0.4, 0.6, matDress, 0, 0.1, 0));

    // Legs
    const legs = new THREE.Group();
    legs.position.y = -0.5;
    legs.add(box(0.25, 0.8, 0.25, matSkin, -0.2, 0, 0));
    legs.add(box(0.25, 0.8, 0.25, matSkin, 0.2, 0, 0));
    group.add(legs);

    // Arms
    group.add(box(0.2, 0.7, 0.2, matSkin, -0.5, 0.6, 0));
    group.add(box(0.2, 0.7, 0.2, matSkin, 0.5, 0.6, 0));

    // Wings
    const createWing = (isLeft) => {
        const wing = new THREE.Group();
        const dir = isLeft ? -1 : 1;
        const matFeather = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95
        });

        for (let i = 0; i < 8; i++) {
            const f = box(0.15, 0.45, 0.03, matFeather, dir * (0.15 + i * 0.05), 0.05 + i * 0.02, 0.02);
            f.rotation.z = dir * (0.1 + i * 0.08);
            wing.add(f);
        }

        for (let i = 0; i < 10; i++) {
            const f = box(0.15, 0.7, 0.03, matFeather, dir * (0.2 + i * 0.08), 0.15 + i * 0.05, 0.04);
            f.rotation.z = dir * (0.2 + i * 0.12);
            wing.add(f);
        }

        for (let i = 0; i < 12; i++) {
            const len = 1.0 + Math.sin(i * 0.3) * 0.5;
            const f = box(0.12, len, 0.03, matFeather, dir * (0.25 + i * 0.1), 0.2 + len / 2 + i * 0.06, 0.06);
            f.rotation.z = dir * (0.3 + i * 0.18);
            f.rotation.y = dir * -0.2;
            wing.add(f);
        }

        return wing;
    };

    const wL = createWing(true);
    wL.position.set(-0.3, 0.6, -0.4);

    const wR = createWing(false);
    wR.position.set(0.3, 0.6, -0.4);

    group.add(wL);
    group.add(wR);

    // Halo
    group.add(box(1, 0.05, 1, matGold, 0, 2.2, 0));

    scene.add(group);

    return { group, wL, wR };
}
