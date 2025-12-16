/**
 * @fileoverview Voice - 语音识别原子
 * @description 小天使语音识别功能
 * @module apps_system/angel/voice
 */

import { speak, updateMuteIcon } from './speak.js';

/**
 * 切换静音
 * @param {Object} app - AngelApp 实例
 */
export function toggleMute(app) {
    app.isMuted = !app.isMuted;
    localStorage.setItem('angel_is_muted', app.isMuted);
    updateMuteIcon(app.isMuted);
    if (app.isMuted) {
        window.speechSynthesis.cancel();
    } else {
        speak("语音功能已开启", false);
    }
}

/**
 * 切换语音识别
 * @param {Object} app - AngelApp 实例
 */
export function toggleVoiceRecognition(app) {
    const btnVoice = document.getElementById('btn-voice');
    const input = document.getElementById('angel-input');

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        app._showBubble("抱歉，你的浏览器不支持语音识别 🎤");
        return;
    }

    if (app.isRecording) {
        if (app.recognition) app.recognition.stop();
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    app.recognition = new SpeechRecognition();
    app.recognition.lang = 'zh-CN';
    app.recognition.interimResults = false;
    app.recognition.maxAlternatives = 1;

    app.recognition.onstart = () => {
        app.isRecording = true;
        if (btnVoice) btnVoice.classList.add('recording');
        app._showBubble("正在听你说... 👂");
    };

    app.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (input) input.value = transcript;
    };

    app.recognition.onerror = () => {
        app._showBubble("没听清，请再说一遍 🙉");
    };

    app.recognition.onend = () => {
        app.isRecording = false;
        if (btnVoice) btnVoice.classList.remove('recording');
    };

    app.recognition.start();
}
