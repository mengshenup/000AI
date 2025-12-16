/**
 * @fileoverview 情报站配置原子
 * @description 定义情报站应用的配置
 * @module apps/intelligence/config
 */

export const config = {
    id: 'win-intelligence',
    name: '智慧锦囊',
    version: '1.0.0',
    description: '记录灵感与秘密的宝库',
    icon: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z',
    color: '#00b894',
    pos: { x: 20, y: 200 },
    winPos: { x: 150, y: 150 },
    width: 500,
    height: 500,
    content: `
        <div style="margin-bottom:10px; display:flex; gap:10px;">
            <button id="btn-scan" style="flex:1; padding:8px; background:var(--primary-color); color:white; border:none; border-radius:4px; cursor:pointer;">
                📡 扫描老六点位
            </button>
            <button id="btn-add-custom" style="padding:8px; background:#00b894; color:white; border:none; border-radius:4px; cursor:pointer;">
                +
            </button>
        </div>
        <div id="file-list" style="height:380px; overflow-y:auto;"></div>
    `
};
