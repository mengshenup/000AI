import { bus } from '../event_bus.js';

export class ContextMenuApp {
    // ---------------------------------------------------------------- //
    //  仪式菜单类 (Context Menu)
    //
    //  函数用处：
    //     管理自定义右键菜单的显示、隐藏和交互。
    //
    //  易懂解释：
    //     这是你的“魔法书”。当你念出咒语（点击右键），它就会浮现出来，供你选择要施展的法术。
    //
    //  警告：
    //     菜单的样式（如背景色、边框）依赖 CSS 类 .context-menu 和 .menu-item。
    // ---------------------------------------------------------------- //

    constructor() {
        this.menu = null; // 稍后在 init 中获取
        this.isVisible = false;

        // 绑定 this
        this.hide = this.hide.bind(this);
        
        // 自动初始化
        window.addEventListener('load', () => this.init());
    }

    init() {
        this.menu = document.getElementById('context-menu');
        
        // ---------------------------------------------------------------- //
        //  初始化()
        //
        //  函数用处：
        //     设置全局点击监听以关闭菜单。
        // ---------------------------------------------------------------- //

        // 点击任意地方关闭菜单
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.menu.contains(e.target)) {
                this.hide();
            }
        });

        // 滚动时也关闭菜单
        document.addEventListener('scroll', this.hide, true);
    }

    show(x, y, items) {
        // ---------------------------------------------------------------- //
        //  显示菜单(X坐标, Y坐标, 菜单项列表)
        //
        //  函数用处：
        //     在指定位置渲染并显示菜单。
        //
        //  易懂解释：
        //     在你的指尖召唤魔法书。
        //
        //  参数：
        //     items: Array<{ label: string, action: function, icon?: string }>
        // ---------------------------------------------------------------- //

        if (!this.menu) return;

        // 1. 生成菜单内容
        this.menu.innerHTML = '';
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'menu-item';
            // 简单的内联样式，建议后续移入 CSS 文件
            el.style.padding = '8px 12px';
            el.style.cursor = 'pointer';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.gap = '8px';
            el.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            el.style.color = '#fff';
            el.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';

            // 鼠标悬停效果
            el.onmouseenter = () => el.style.backgroundColor = 'var(--primary-color)';
            el.onmouseleave = () => el.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';

            el.innerHTML = `
                ${item.icon ? `<span>${item.icon}</span>` : ''}
                <span>${item.label}</span>
            `;

            el.onclick = (e) => {
                e.stopPropagation(); // 防止触发全局点击关闭
                item.action();
                this.hide();
            };

            this.menu.appendChild(el);
        });

        // 2. 设置位置
        this.menu.style.left = `${x}px`;
        this.menu.style.top = `${y}px`;
        this.menu.style.display = 'block';

        // 3. 边界检查 (防止菜单超出屏幕)
        const rect = this.menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.menu.style.left = `${window.innerWidth - rect.width - 5}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.menu.style.top = `${window.innerHeight - rect.height - 5}px`;
        }

        this.isVisible = true;
    }

    hide() {
        // ---------------------------------------------------------------- //
        //  隐藏菜单()
        // ---------------------------------------------------------------- //
        if (this.menu) {
            this.menu.style.display = 'none';
            this.isVisible = false;
        }
    }
}

export const contextMenuApp = new ContextMenuApp();
