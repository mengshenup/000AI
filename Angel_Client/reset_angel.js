// 临时脚本：触发小天使重置
import { bus } from './js/event_bus.js';

console.log("正在发送重置指令...");
bus.emit('angel:reset');
console.log("指令已发送！");
