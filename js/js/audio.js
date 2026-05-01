const AUDIO_SETTINGS_KEY = 'td-audio-settings-v2';
const MUSIC_THEMES = {
    apocalypse: {
        id: 'apocalypse',
        name: 'Апокалипсис',
        icon: '☣',
        tag: 'тёмная',
        description: 'Тягучий тревожный фон с тяжёлым басом и мрачной мелодией.',
    },
    neon: {
        id: 'neon',
        name: 'Неон Штурм',
        icon: '✦',
        tag: 'динамика',
        description: 'Более яркая синт-волна с чётким пульсом и живым движением.',
    },
    march: {
        id: 'march',
        name: 'Железный Марш',
        icon: '⚙',
        tag: 'давление',
        description: 'Тяжёлый индустриальный ритм для волн и поздних боссов.',
    },
    frost: {
        id: 'frost',
        name: 'Ледяная Ночь',
        icon: '❄',
        tag: 'атмосфера',
        description: 'Холодная атмосферная тема с воздухом, эхом и стеклянными нотами.',
    },
};

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.musicVolume = 0.25;
        this.sfxVolume = 0.5;
        this.musicMuted = false;
        this.sfxMuted = false;
        this.initialized = false;
        this.musicPlaying = false;
        this.musicTimeout = null;
        this.lastSfx = {};
        this.musicTheme = 'apocalypse';
        this.loadSettings();
    }

    loadSettings() {
        try {
            const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (typeof saved.musicVolume === 'number') this.musicVolume = Math.max(0, Math.min(1, saved.musicVolume));
            if (typeof saved.sfxVolume === 'number') this.sfxVolume = Math.max(0, Math.min(1, saved.sfxVolume));
            if (typeof saved.musicMuted === 'boolean') this.musicMuted = saved.musicMuted;
            if (typeof saved.sfxMuted === 'boolean') this.sfxMuted = saved.sfxMuted;
            if (saved.musicTheme && MUSIC_THEMES[saved.musicTheme]) this.musicTheme = saved.musicTheme;
        } catch (_) {}
    }

    saveSettings() {
        try {
            window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({
                musicVolume: this.musicVolume,
                sfxVolume: this.sfxVolume,
                musicMuted: this.musicMuted,
                sfxMuted: this.sfxMuted,
                musicTheme: this.musicTheme,
            }));
        } catch (_) {}
    }

    getMusicThemes() {
        return Object.values(MUSIC_THEMES);
    }

    restartMusic() {
        this.stopMusic();
        if (!this.musicMuted) this.startMusic();
    }

    setMusicTheme(theme) {
        if (!MUSIC_THEMES[theme]) return false;
        this.musicTheme = theme;
        this.saveSettings();
        if (!this.musicMuted && this.ensureCtx()) {
            if (this.musicPlaying) this.restartMusic();
            else this.startMusic();
        }
        return true;
    }

    init() {
        if (this.initialized) return;
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.applyVolumes();
        this.initialized = true;
    }

    ensureCtx() {
        if (!this.initialized) this.init();
        if (!this.ctx) return false;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
    }

    applyVolumes() {
        if (!this.initialized) return;
        this.musicGain.gain.setTargetAtTime(this.musicMuted ? 0 : this.musicVolume, this.ctx.currentTime, 0.05);
        this.sfxGain.gain.setTargetAtTime(this.sfxMuted ? 0 : this.sfxVolume, this.ctx.currentTime, 0.05);
    }

    canPlay(key, cooldown) {
        const now = Date.now();
        if (this.lastSfx[key] && now - this.lastSfx[key] < (cooldown || 55)) return false;
        this.lastSfx[key] = now;
        return true;
    }

    noiseBuf(dur) {
        const sr = this.ctx.sampleRate, buf = this.ctx.createBuffer(1, sr * dur, sr), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    tone(freq, dur, type, vol, dest) {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(vol || 0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(dest || this.sfxGain);
        o.start(t); o.stop(t + dur + 0.02);
    }

    sweep(f1, f2, dur, type, vol) {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f1, t);
        o.frequency.linearRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(vol || 0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(this.sfxGain);
        o.start(t); o.stop(t + dur + 0.02);
    }

    noise(dur, vol, fq) {
        const t = this.ctx.currentTime;
        const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf(dur + 0.1);
        const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fq || 3000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol || 0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        s.connect(f); f.connect(g); g.connect(this.sfxGain);
        s.start(t);
    }

    musicNote(freq, start, dur, type, vol) {
        const t = this.ctx.currentTime + start;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol || 0.025, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g);
        g.connect(this.musicGain);
        o.start(t);
        o.stop(t + dur + 0.03);
    }

    musicSweep(f1, f2, start, dur, type, vol) {
        const t = this.ctx.currentTime + start;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f1, t);
        o.frequency.linearRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(vol || 0.02, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g);
        g.connect(this.musicGain);
        o.start(t);
        o.stop(t + dur + 0.03);
    }

    musicNoise(start, dur, vol, lowpass) {
        const t = this.ctx.currentTime + start;
        const s = this.ctx.createBufferSource();
        s.buffer = this.noiseBuf(dur + 0.15);
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = lowpass || 1400;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol || 0.01, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        s.connect(f);
        f.connect(g);
        g.connect(this.musicGain);
        s.start(t);
        s.stop(t + dur + 0.04);
    }

    // ─── TOWER SHOT SOUNDS ───────────────────────────
    playShot(type) {
        if (!this.ensureCtx() || !this.canPlay('s_' + type)) return;
        switch (type) {
            case 'pistol':
                this.tone(820, 0.07, 'square', 0.1);
                this.noise(0.04, 0.05, 4500);
                break;
            case 'machinegun':
                this.tone(1100, 0.035, 'square', 0.07);
                this.noise(0.025, 0.04, 6000);
                break;
            case 'rifle':
                this.tone(650, 0.11, 'sawtooth', 0.1);
                this.noise(0.07, 0.07, 3500);
                break;
            case 'flamethrower':
                this.noise(0.1, 0.08, 1800);
                this.tone(180, 0.08, 'sawtooth', 0.03);
                break;
            case 'sniper':
                this.tone(1900, 0.14, 'sine', 0.14);
                this.noise(0.09, 0.1, 5000);
                this.tone(85, 0.25, 'sine', 0.05);
                break;
            case 'grenade':
                this.tone(140, 0.18, 'sine', 0.12);
                this.noise(0.08, 0.07, 2200);
                break;
            case 'cryo':
                this.tone(720, 0.08, 'triangle', 0.07);
                this.tone(360, 0.11, 'sine', 0.05);
                break;
            case 'rocket':
                this.sweep(300, 150, 0.12, 'sawtooth', 0.08);
                this.tone(80, 0.25, 'sine', 0.07);
                break;
            case 'pulse':
                this.tone(260, 0.16, 'sine', 0.08);
                this.sweep(420, 160, 0.14, 'triangle', 0.05);
                break;
            case 'tesla':
                this.tone(440, 0.05, 'sawtooth', 0.1);
                this.tone(880, 0.04, 'square', 0.07);
                this.tone(220, 0.07, 'sawtooth', 0.05);
                break;
            case 'airfield':
                this.tone(980, 0.03, 'square', 0.05);
                this.tone(760, 0.045, 'square', 0.04);
                break;
            case 'railgun':
                this.tone(55, 0.35, 'sine', 0.12);
                this.tone(2200, 0.12, 'sine', 0.07);
                this.noise(0.1, 0.08, 1400);
                break;
        }
    }
    playNukeLoad(kind) {
        if (!this.ensureCtx() || !this.canPlay('nukeLoad_' + kind, 80)) return;
        if (kind === 'tsar') {
            this.tone(70, 0.22, 'sawtooth', 0.08);
            this.tone(220, 0.14, 'triangle', 0.05);
        } else if (kind === 'strategic') {
            this.tone(180, 0.12, 'square', 0.06);
            this.tone(360, 0.1, 'triangle', 0.04);
        } else {
            this.tone(420, 0.06, 'sine', 0.05);
            this.tone(620, 0.05, 'sine', 0.04);
        }
    }
    playNukeLaunch(kind) {
        if (!this.ensureCtx() || !this.canPlay('nukeLaunch_' + kind, 160)) return;
        if (kind === 'tsar') {
            this.sweep(130, 60, 0.45, 'sawtooth', 0.1);
            this.noise(0.18, 0.08, 1100);
            this.tone(52, 0.55, 'sine', 0.08);
        } else if (kind === 'strategic') {
            this.sweep(220, 90, 0.34, 'sawtooth', 0.08);
            this.noise(0.12, 0.06, 1500);
            this.tone(95, 0.28, 'sine', 0.06);
        } else {
            this.sweep(340, 150, 0.2, 'triangle', 0.06);
            this.noise(0.08, 0.04, 2200);
        }
    }
    playNukeImpact(kind) {
        if (!this.ensureCtx() || !this.canPlay('nukeImpact_' + kind, 120)) return;
        if (kind === 'tsar') {
            this.tone(42, 0.75, 'sine', 0.18);
            this.noise(0.38, 0.16, 900);
            setTimeout(() => { if (this.ctx) this.sweep(180, 40, 0.85, 'sawtooth', 0.08); }, 70);
        } else if (kind === 'strategic') {
            this.tone(68, 0.42, 'sine', 0.14);
            this.noise(0.24, 0.12, 1200);
        } else {
            this.tone(120, 0.22, 'sine', 0.12);
            this.noise(0.12, 0.08, 1700);
        }
    }

    playExplosion() {
        if (!this.ensureCtx() || !this.canPlay('expl', 80)) return;
        this.tone(75, 0.3, 'sine', 0.16);
        this.noise(0.22, 0.12, 1300);
    }

    playBaseHit() {
        if (!this.ensureCtx() || !this.canPlay('base', 150)) return;
        this.tone(280, 0.1, 'square', 0.14);
        setTimeout(() => { if (this.ctx) this.tone(180, 0.14, 'square', 0.1); }, 90);
    }

    playTowerDamage() {
        if (!this.ensureCtx() || !this.canPlay('tdmg', 100)) return;
        this.noise(0.05, 0.06, 3500);
        this.tone(480, 0.04, 'triangle', 0.05);
    }

    playTowerDestroyed() {
        if (!this.ensureCtx() || !this.canPlay('tdest', 200)) return;
        this.tone(160, 0.25, 'sawtooth', 0.12);
        this.noise(0.18, 0.1, 1800);
        this.tone(55, 0.35, 'sine', 0.08);
    }

    playEnemyDeath() {
        if (!this.ensureCtx() || !this.canPlay('edie', 40)) return;
        this.noise(0.05, 0.05, 2200);
        this.tone(380, 0.035, 'sine', 0.04);
    }

    playWaveStart() {
        if (!this.ensureCtx()) return;
        this.sweep(180, 400, 0.28, 'sawtooth', 0.1);
        setTimeout(() => this.sweep(200, 450, 0.2, 'sawtooth', 0.06), 150);
    }

    playBossIntro(stage) {
        if (!this.ensureCtx() || !this.canPlay('bossIntro', 4200)) return;
        const accent = stage >= 4 ? 72 : stage >= 3 ? 82 : stage >= 2 ? 92 : 105;
        this.tone(accent, 2.25, 'sawtooth', 0.08);
        this.tone(accent * 1.5, 1.85, 'triangle', 0.04);
        this.tone(accent * 0.5, 2.4, 'sine', 0.03);
        [0, 260, 520, 840, 1180, 1540, 1940, 2380, 2840].forEach((delay, index) => {
            setTimeout(() => {
                if (!this.ctx) return;
                this.noise(0.085, 0.085, 760 - stage * 55);
                this.tone(118 - index * 3, 0.11, 'square', 0.05);
                this.tone(60 + (index % 2) * 8, 0.16, 'sine', 0.035);
            }, delay);
        });
        setTimeout(() => {
            if (!this.ctx) return;
            this.sweep(260, 140, 1.65, 'sawtooth', 0.06);
        }, 260);
    }

    playUpgrade() {
        if (!this.ensureCtx()) return;
        this.tone(523, 0.09, 'sine', 0.08);
        setTimeout(() => this.tone(659, 0.09, 'sine', 0.08), 75);
        setTimeout(() => this.tone(784, 0.12, 'sine', 0.07), 150);
    }

    playSell() {
        if (!this.ensureCtx()) return;
        this.tone(900, 0.04, 'sine', 0.06);
        setTimeout(() => this.tone(700, 0.05, 'sine', 0.04), 45);
    }

    playPlace() {
        if (!this.ensureCtx()) return;
        this.tone(400, 0.04, 'sine', 0.07);
        this.tone(600, 0.05, 'sine', 0.05);
    }

    playConstruction() {
        if (!this.ensureCtx() || !this.canPlay('build', 90)) return;
        this.noise(0.045, 0.055, 2400);
        this.tone(170, 0.05, 'square', 0.04);
        setTimeout(() => {
            if (!this.ctx) return;
            this.noise(0.03, 0.04, 4200);
            this.tone(980, 0.028, 'triangle', 0.025);
        }, 35);
        setTimeout(() => {
            if (!this.ctx) return;
            this.tone(120, 0.09, 'sawtooth', 0.03);
        }, 60);
    }

    playGameOver(won) {
        if (!this.ensureCtx()) return;
        if (won) {
            [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'sine', 0.1), i * 120));
        } else {
            this.tone(200, 0.5, 'sawtooth', 0.12);
            setTimeout(() => this.tone(150, 0.6, 'sawtooth', 0.1), 200);
            setTimeout(() => this.tone(100, 0.8, 'sine', 0.08), 400);
        }
    }

    // ─── BACKGROUND MUSIC ────────────────────────────
    startMusic() {
        if (this.musicPlaying || this.musicMuted) return;
        if (!this.ensureCtx()) return;
        this.musicPlaying = true;
        this._musicLoop();
    }

    _musicLoop() {
        if (!this.musicPlaying || !this.ctx) return;
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
            this.musicTimeout = null;
        }
        switch (this.musicTheme) {
            case 'neon':
                this._musicLoopNeon();
                break;
            case 'march':
                this._musicLoopMarch();
                break;
            case 'frost':
                this._musicLoopFrost();
                break;
            default:
                this._musicLoopApocalypse();
                break;
        }
    }

    _musicLoopApocalypse() {
        const dur = 8;
        this.musicNote(55, 0, dur + 0.25, 'sine', 0.08);
        this.musicNote(82.4, 0, dur + 0.25, 'sine', 0.04);
        this.musicNoise(0, dur + 0.3, 0.015, 220);
        [220, 261.6, 330, 293.7, 220, 196, 261.6, 220].forEach((freq, i) => {
            this.musicNote(freq, i * (dur / 8), 0.76, 'triangle', 0.028);
        });
        this.musicTimeout = setTimeout(() => this._musicLoop(), (dur - 0.15) * 1000);
    }

    _musicLoopNeon() {
        const dur = 8;
        [0, 2, 4, 6].forEach((step, i) => {
            const bass = [92.5, 110, 138.6, 123.5][i];
            this.musicNote(bass, step, 1.9, 'sawtooth', 0.032);
            this.musicNote(bass * 2, step, 1.1, 'triangle', 0.018);
        });
        [370, 440, 554, 659, 740, 659, 554, 440, 392, 440, 587, 659, 740, 659, 587, 440].forEach((freq, i) => {
            this.musicNote(freq, i * 0.5, 0.38, i % 2 === 0 ? 'triangle' : 'square', 0.02);
        });
        [0, 1, 2, 3, 4, 5, 6, 7].forEach((beat) => {
            this.musicNoise(beat + 0.02, 0.06, 0.008, 2800);
            this.musicSweep(160, 110, beat, 0.12, 'triangle', 0.015);
        });
        this.musicTimeout = setTimeout(() => this._musicLoop(), (dur - 0.1) * 1000);
    }

    _musicLoopMarch() {
        const dur = 8;
        [0, 1, 2, 3, 4, 5, 6, 7].forEach((beat) => {
            this.musicSweep(78, 48, beat, 0.22, 'sine', 0.032);
            this.musicNoise(beat, 0.08, 0.012, 900);
            if (beat % 2 === 1) this.musicNoise(beat + 0.18, 0.04, 0.006, 2600);
        });
        [98, 98, 110, 123.5].forEach((root, i) => {
            const start = i * 2;
            this.musicNote(root, start, 1.7, 'sawtooth', 0.03);
            this.musicNote(root * 1.5, start + 0.12, 0.75, 'triangle', 0.018);
            this.musicNote(root * 2, start + 0.44, 0.58, 'square', 0.015);
        });
        [196, 220, 247, 196, 220, 262, 247, 220].forEach((freq, i) => {
            this.musicNote(freq, i * 0.95 + 0.18, 0.42, 'square', 0.014);
        });
        this.musicTimeout = setTimeout(() => this._musicLoop(), (dur - 0.08) * 1000);
    }

    _musicLoopFrost() {
        const dur = 10;
        this.musicNoise(0, dur + 0.2, 0.012, 520);
        this.musicNote(174.6, 0, dur, 'sine', 0.028);
        this.musicNote(261.6, 0.15, dur - 0.2, 'triangle', 0.016);
        [523.3, 659.3, 784, 698.5, 659.3, 587.3].forEach((freq, i) => {
            this.musicNote(freq, i * 1.5 + 0.4, 1.15, 'sine', 0.018);
            this.musicNote(freq * 0.5, i * 1.5 + 0.62, 1.45, 'triangle', 0.009);
        });
        [0.8, 3.3, 5.8, 8.1].forEach((start, i) => {
            this.musicSweep(420 + i * 35, 250 + i * 12, start, 1.2, 'sine', 0.011);
        });
        this.musicTimeout = setTimeout(() => this._musicLoop(), (dur - 0.18) * 1000);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimeout) { clearTimeout(this.musicTimeout); this.musicTimeout = null; }
    }

    // ─── VOLUME CONTROLS ─────────────────────────────
    setMusicVolume(v) { this.musicVolume = v; this.applyVolumes(); this.saveSettings(); }
    setSfxVolume(v) { this.sfxVolume = v; this.applyVolumes(); this.saveSettings(); }

    toggleMusic() {
        this.musicMuted = !this.musicMuted;
        this.applyVolumes();
        if (this.musicMuted) this.stopMusic(); else this.startMusic();
        this.saveSettings();
        return !this.musicMuted;
    }

    toggleSfx() {
        this.sfxMuted = !this.sfxMuted;
        this.applyVolumes();
        this.saveSettings();
        return !this.sfxMuted;
    }
}
