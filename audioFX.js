// ==========================================
// --- SINTETIZADOR DE AUDIO RETRO (WEB AUDIO) - VERSIÓN SIMPLE ---
// ==========================================
const AudioFX = {
    ctx: null,
    musicPlaying: false,
    musicTimer: null,
    musicStep: 0,

    init: () => {
        if (!AudioFX.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) {
                console.error('[AudioFX] Este navegador no soporta Web Audio API.');
                return;
            }
            AudioFX.ctx = new AC();
            console.log('[AudioFX] init() llamado. Estado:', AudioFX.ctx.state);
        }
        if (AudioFX.ctx.state === 'suspended') {
            AudioFX.ctx.resume();
        }
    },

    // Sonido básico: un tono simple que sube o baja de frecuencia.
    _tone: (freq1, freq2, duration, type, volume) => {
        if (!AudioFX.ctx) {
            console.warn('[AudioFX] Intentaste reproducir un sonido pero AudioFX.init() no se ha llamado.');
            return;
        }
        const now = AudioFX.ctx.currentTime;
        const osc = AudioFX.ctx.createOscillator();
        const gain = AudioFX.ctx.createGain();
        osc.connect(gain);
        gain.connect(AudioFX.ctx.destination);

        osc.type = type;
        osc.frequency.setValueAtTime(freq1, now);
        osc.frequency.linearRampToValueAtTime(freq2, now + duration);

        gain.gain.setValueAtTime(volume, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    },

    // --- EFECTOS DE SONIDO ---
    playJump: () => AudioFX._tone(150, 600, 0.15, 'sine', 0.3),
    playShoot: () => AudioFX._tone(800, 200, 0.1, 'triangle', 0.25),
    playFreeze: () => AudioFX._tone(1200, 400, 0.25, 'square', 0.2),
    playUlti: () => AudioFX._tone(300, 1000, 0.4, 'sawtooth', 0.3),
    playPlayerHit: () => AudioFX._tone(180, 50, 0.2, 'sawtooth', 0.35),
    playEnemyHit: () => AudioFX._tone(500, 250, 0.12, 'square', 0.25),

    // --- MÚSICA DE FONDO: melodía simple en loop ---
    _melody: [261.63, 293.66, 329.63, 261.63, 329.63, 349.23, 392.00, 329.63],

    playBackgroundMusic: () => {
        if (!AudioFX.ctx || AudioFX.musicPlaying) return;
        AudioFX.musicPlaying = true;
        AudioFX.musicStep = 0;
        AudioFX._playNextNote();
    },

    _playNextNote: () => {
        if (!AudioFX.musicPlaying) return;
        const freq = AudioFX._melody[AudioFX.musicStep % AudioFX._melody.length];
        AudioFX._tone(freq, freq, 0.4, 'sine', 0.06);
        AudioFX.musicStep++;
        AudioFX.musicTimer = setTimeout(AudioFX._playNextNote, 500);
    },

    stopBackgroundMusic: () => {
        AudioFX.musicPlaying = false;
        if (AudioFX.musicTimer) {
            clearTimeout(AudioFX.musicTimer);
            AudioFX.musicTimer = null;
        }
    }
};