/**
 * @fileoverview ContextMenu 分子入口
 * @description 右键菜单管理
 * @module apps_system/context_menu/index
 */

export const VERSION = '1.0.0';

export const config = {
    id: 'sys-context-menu',
    name: '右键菜单',
    version: '1.0.0',
    type: 'service',
    isSystem: true
};

export class ContextMenuApp {
    constructor() {
        this.config = config;
        this.menu = null;
        this.isVisible = false;
        this.hide = this.hide.bind(this);
        window.addEventListener('load', () => this.init());
    }

    init() {
        this.menu = document.getElementById('context-menu');

        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.menu.contains(e.target)) {
                this.hide();
            }
        });

        document.addEventListener('scroll', this.hide, true);
    }

    show(x, y, items) {
        if (!this.menu) return;

        this.menu.innerHTML = '';
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'menu-item';
            el.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                background-color: rgba(0, 0, 0, 0.8);
                color: #fff;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            `;

            el.onmouseenter = () => el.style.backgroundColor = 'var(--primary-color)';
            el.onmouseleave = () => el.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';

            el.innerHTML = `
                ${item.icon ? `<span>${item.icon}</span>` : ''}
                <span>${item.label}</span>
            `;

            el.onclick = (e) => {
                e.stopPropagation();
                item.action();
                this.hide();
            };

            this.menu.appendChild(el);
        });

        this.menu.style.left = `${x}px`;
        this.menu.style.top = `${y}px`;
        this.menu.style.display = 'block';

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
        if (this.menu) {
            this.menu.style.display = 'none';
            this.isVisible = false;
        }
    }
}

export const contextMenuApp = new ContextMenuApp();
