// ==========================================
// --- SINTETIZADOR DE AUDIO RETRO (WEB AUDIO) ---
// ==========================================
window.AudioFX = {
    ctx: null,
    masterGain: null,
    volume: 0.8, // 0 a 1
    muted: false,
    init: () => {
        if (!AudioFX.ctx) {
            AudioFX.ctx = new (window.AudioContext || window.webkitAudioContext)();
            AudioFX.masterGain = AudioFX.ctx.createGain();
            AudioFX.masterGain.connect(AudioFX.ctx.destination);
            // Recupera preferencia de volumen/silencio guardada (si existe)
            try {
                const raw = localStorage.getItem('superKittyVsDemonios_audio');
                if (raw) {
                    const saved = JSON.parse(raw);
                    if (typeof saved.volume === 'number') AudioFX.volume = saved.volume;
                    if (typeof saved.muted === 'boolean') AudioFX.muted = saved.muted;
                }
            } catch (err) { /* si falla, se usan los valores por defecto */ }
            AudioFX.masterGain.gain.value = AudioFX.muted ? 0 : AudioFX.volume;
        }
    },
    setVolume: (v) => {
        AudioFX.volume = Math.max(0, Math.min(1, v));
        if (AudioFX.masterGain && !AudioFX.muted) AudioFX.masterGain.gain.value = AudioFX.volume;
        AudioFX._savePrefs();
    },
    setMuted: (m) => {
        AudioFX.muted = m;
        if (AudioFX.masterGain) AudioFX.masterGain.gain.value = m ? 0 : AudioFX.volume;
        AudioFX._savePrefs();
    },
    toggleMuted: () => {
        AudioFX.setMuted(!AudioFX.muted);
        return AudioFX.muted;
    },
    _savePrefs: () => {
        try {
            localStorage.setItem('superKittyVsDemonios_audio', JSON.stringify({ volume: AudioFX.volume, muted: AudioFX.muted }));
        } catch (err) { /* localStorage no disponible, no pasa nada grave */ }
    },
    playJump: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, AudioFX.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, AudioFX.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.15);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.15);
    },
    playShoot: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, AudioFX.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, AudioFX.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.1);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.1);
    },
    playFreeze: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, AudioFX.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(400, AudioFX.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.25);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.25);
    },
    playUlti: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, AudioFX.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1000, AudioFX.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.4);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.4);
    },
    playEnemyHit: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'square';
        osc.frequency.setValueAtTime(500, AudioFX.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, AudioFX.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.22, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.12);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.12);
    },
    playPlayerHit: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, AudioFX.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, AudioFX.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.28, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.3);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.3);
    },
    playKeyGet: () => {
        if (!AudioFX.ctx) return;
        const now = AudioFX.ctx.currentTime;
        [660, 880, 1320].forEach((freq, i) => {
            let osc = AudioFX.ctx.createOscillator();
            let gain = AudioFX.ctx.createGain();
            osc.connect(gain); gain.connect(AudioFX.masterGain);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.09);
            gain.gain.setValueAtTime(0.001, now + i * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.09 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.09 + 0.18);
            osc.start(now + i * 0.09); osc.stop(now + i * 0.09 + 0.18);
        });
    },
    playWorldUnlock: () => {
        if (!AudioFX.ctx) return;
        const now = AudioFX.ctx.currentTime;
        [523, 659, 784, 1047].forEach((freq, i) => {
            let osc = AudioFX.ctx.createOscillator();
            let gain = AudioFX.ctx.createGain();
            osc.connect(gain); gain.connect(AudioFX.masterGain);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            gain.gain.setValueAtTime(0.001, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.12 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.3);
            osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.3);
        });
    },
    // Loop de música de fondo muy simple (arpegio suave). Se puede parar con stopBackgroundMusic().
    _musicNodes: [],
    _musicInterval: null,
    playBackgroundMusic: () => {
        if (!AudioFX.ctx) return;
        AudioFX.stopBackgroundMusic();
        const notes = [392, 440, 494, 587, 494, 440];
        let step = 0;
        AudioFX._musicInterval = setInterval(() => {
            if (!AudioFX.ctx) return;
            let osc = AudioFX.ctx.createOscillator();
            let gain = AudioFX.ctx.createGain();
            osc.connect(gain); gain.connect(AudioFX.masterGain);
            osc.type = 'sine';
            const freq = notes[step % notes.length];
            osc.frequency.setValueAtTime(freq, AudioFX.ctx.currentTime);
            gain.gain.setValueAtTime(0.001, AudioFX.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, AudioFX.ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, AudioFX.ctx.currentTime + 0.4);
            osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.4);
            step++;
        }, 450);
    },
    stopBackgroundMusic: () => {
        if (AudioFX._musicInterval) {
            clearInterval(AudioFX._musicInterval);
            AudioFX._musicInterval = null;
        }
    }
};