/**
 * @fileoverview 任务管理器配置原子
 * @description 定义任务管理器的配置
 * @module apps/task_manager/config
 */

export const config = {
    id: 'win-taskmgr',
    name: '活力源泉',
    description: '掌控系统能量的指挥中心',
    icon: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
    version: '1.0.0',
    color: '#d63031',
    pos: { x: 20, y: 380 },
    winPos: { x: 300, y: 300 },
    width: 450,
    height: 400,
    content: `
        <div id="task-list" style="height:100%; overflow-y:auto; padding:10px;"></div>
    `
};
