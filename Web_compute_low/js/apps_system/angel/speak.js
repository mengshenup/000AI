/**
 * @fileoverview 语音功能原子
 * @description 处理小天使的语音合成和气泡显示
 * @module apps_system/angel/speak
 */

/**
 * 文字转语音
 * @param {string} text - 要朗读的文本
 * @param {boolean} isMuted - 是否静音
 */
export function speak(text, isMuted = false) {
    if (isMuted || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;
    utterance.pitch = 1.5;

    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => 
        v.lang.includes('zh') && 
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Xiaoxiao'))
    ) || voices.find(v => v.lang.includes('zh'));

    if (zhVoice) {
        utterance.voice = zhVoice;
    }

    window.speechSynthesis.speak(utterance);
}

/**
 * 显示气泡
 * @param {string} text - 气泡文本
 * @param {Object} ctx - 应用上下文
 * @param {number} timer - 当前定时器ID
 * @param {boolean} isMuted - 是否静音
 * @returns {number} 新的定时器ID
 */
export function showBubble(text, ctx, timer, isMuted) {
    const b = document.getElementById('angel-speech');
    if (b) {
        b.innerText = text;
        b.classList.add('show');
        if (timer) ctx.clearTimeout(timer);
        const newTimer = ctx.setTimeout(() => b.classList.remove('show'), 4000);
        speak(text, isMuted);
        return newTimer;
    }
    return timer;
}

/**
 * 更新静音图标
 * @param {boolean} isMuted - 是否静音
 */
export function updateMuteIcon(isMuted) {
    const iconOn = document.getElementById('icon-sound-on');
    const iconOff = document.getElementById('icon-sound-off');

    if (isMuted) {
        if (iconOn) iconOn.style.display = 'none';
        if (iconOff) iconOff.style.display = 'block';
    } else {
        if (iconOn) iconOn.style.display = 'block';
        if (iconOff) iconOff.style.display = 'none';
    }
}
