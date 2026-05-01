const HOTKEY_STORAGE_KEY = 'td-custom-hotkeys-v1';
const DEFAULT_BUILD_HOTKEYS = {
    lightWall: 'KeyQ',
    mediumWall: 'KeyW',
    heavyWall: 'KeyE',
    pistol: 'KeyA',
    machinegun: 'KeyS',
    farm: 'KeyD',
    scanner: 'KeyF',
    rifle: 'KeyG',
    healer: 'KeyZ',
    flamethrower: 'KeyX',
    cryo: 'KeyC',
    grenade: 'KeyV',
    sniper: 'KeyB',
    rocket: 'KeyT',
    pulse: 'KeyY',
    tesla: 'KeyH',
    airfield: 'KeyN',
    nukeSilo: 'KeyJ',
    railgun: 'KeyU',
};
const DEFAULT_UPGRADE_HOTKEY = 'KeyP';

class UI {
    constructor(game) { this.game = game; this.init(); }
    fmtTime(v) {
        const rounded = Math.round(v * 10) / 10;
        return (Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)) + 'с';
    }
    hotkeyLabel(code) {
        if (!code) return '—';
        if (code.startsWith('Key')) return code.slice(3);
        if (code.startsWith('Digit')) return code.slice(5);
        const fallback = {
            Backquote: '`',
            Minus: '-',
            Equal: '=',
            BracketLeft: '[',
            BracketRight: ']',
            Backslash: '\\',
            Semicolon: ';',
            Quote: '\'',
            Comma: ',',
            Period: '.',
            Slash: '/',
        };
        return fallback[code] || code;
    }
    getBuildHotkey(type) {
        return this.buildHotkeys[type] || '';
    }
    getUpgradeHotkey() {
        return this.upgradeHotkey;
    }
    isAllowedHotkey(code) {
        return /^(Key[A-Z]|Digit[0-9]|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash)$/.test(code || '');
    }
    loadHotkeys() {
        this.buildHotkeys = { ...DEFAULT_BUILD_HOTKEYS };
        this.upgradeHotkey = DEFAULT_UPGRADE_HOTKEY;
        try {
            const raw = window.localStorage.getItem(HOTKEY_STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved?.build && typeof saved.build === 'object') {
                for (const [type, code] of Object.entries(saved.build)) {
                    if (DEFAULT_BUILD_HOTKEYS[type] && this.isAllowedHotkey(code)) this.buildHotkeys[type] = code;
                }
            }
            if (this.isAllowedHotkey(saved?.upgrade)) this.upgradeHotkey = saved.upgrade;
        } catch (_) {}
    }
    saveHotkeys() {
        try {
            window.localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify({
                build: this.buildHotkeys,
                upgrade: this.upgradeHotkey,
            }));
        } catch (_) {}
    }
    getHotkeyActionLabel(kind, key) {
        if (kind === 'upgrade') return 'Прокачка';
        return TOWER_TYPES[key]?.name || key;
    }
    getHotkeyConflict(code, currentKind = '', currentKey = '') {
        for (const [type, hotkey] of Object.entries(this.buildHotkeys || {})) {
            if (hotkey !== code) continue;
            if (currentKind === 'build' && currentKey === type) continue;
            return { kind: 'build', key: type, label: this.getHotkeyActionLabel('build', type) };
        }
        if (this.upgradeHotkey === code && currentKind !== 'upgrade') {
            return { kind: 'upgrade', key: 'upgrade', label: this.getHotkeyActionLabel('upgrade', 'upgrade') };
        }
        return null;
    }
    setHotkeyStatus(message = '', tone = '') {
        if (!this.hotkeySettingsStatus) return;
        this.hotkeySettingsStatus.textContent = message;
        this.hotkeySettingsStatus.classList.remove('error', 'success');
        if (tone) this.hotkeySettingsStatus.classList.add(tone);
    }
    applyHotkeyChange(kind, key, code) {
        const conflict = this.getHotkeyConflict(code, kind, key);
        if (conflict) {
            this.setHotkeyStatus(`Клавиша ${this.hotkeyLabel(code)} уже занята: ${conflict.label}.`, 'error');
            return false;
        }
        if (kind === 'upgrade') this.upgradeHotkey = code;
        else this.buildHotkeys[key] = code;
        this.saveHotkeys();
        this.renderHotkeySettings();
        this.updateTowerButtons();
        if (this.infoMode === 'tower' && this.game.selectedTower && this.towerInfoPanel.style.display !== 'none') {
            this.showTowerInfo(this.game.selectedTower);
        }
        this.setHotkeyStatus(`Назначено: ${this.getHotkeyActionLabel(kind, key)} → ${this.hotkeyLabel(code)}`, 'success');
        return true;
    }
    resetHotkeysToDefault() {
        this.finishHotkeyRebind(false);
        this.buildHotkeys = { ...DEFAULT_BUILD_HOTKEYS };
        this.upgradeHotkey = DEFAULT_UPGRADE_HOTKEY;
        this.saveHotkeys();
        this.renderHotkeySettings();
        this.updateTowerButtons();
        if (this.infoMode === 'tower' && this.game.selectedTower && this.towerInfoPanel.style.display !== 'none') {
            this.showTowerInfo(this.game.selectedTower);
        }
        this.setHotkeyStatus('Клавиши возвращены по умолчанию.', 'success');
    }
    finishHotkeyRebind(cancelled = false) {
        if (this.rebindingHotkeyCleanup) this.rebindingHotkeyCleanup();
        this.rebindingHotkeyCleanup = null;
        this.rebindingHotkeyTarget = null;
        this.renderHotkeySettings();
        if (cancelled) this.setHotkeyStatus('Переназначение отменено.', '');
    }
    startHotkeyRebind(kind, key, button) {
        if (!button) return;
        this.finishHotkeyRebind(false);
        this.rebindingHotkeyTarget = { kind, key, button };
        button.classList.add('rebinding');
        button.textContent = '...';
        this.setHotkeyStatus(`Нажми новую клавишу для: ${this.getHotkeyActionLabel(kind, key)}. Esc — отмена.`, '');
        const onKeyDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') {
                this.finishHotkeyRebind(true);
                return;
            }
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            if (!this.isAllowedHotkey(e.code)) {
                this.setHotkeyStatus('Эту клавишу нельзя назначить. Используй буквы, цифры или основные символы.', 'error');
                return;
            }
            const applied = this.applyHotkeyChange(kind, key, e.code);
            if (applied) this.finishHotkeyRebind(false);
        };
        this.rebindingHotkeyCleanup = () => {
            window.removeEventListener('keydown', onKeyDown, true);
            if (this.rebindingHotkeyTarget?.button) this.rebindingHotkeyTarget.button.classList.remove('rebinding');
        };
        window.addEventListener('keydown', onKeyDown, true);
    }
    renderHotkeySettings() {
        if (!this.hotkeySettingsList) return;
        const entries = [
            'pistol', 'machinegun', 'rifle', 'sniper', 'grenade', 'rocket', 'tesla', 'railgun',
            'flamethrower', 'cryo', 'scanner', 'healer', 'farm', 'airfield', 'nukeSilo', 'pulse',
            'lightWall', 'mediumWall', 'heavyWall'
        ].map(type => ({ kind: 'build', key: type }));
        entries.push({ kind: 'upgrade', key: 'upgrade' });
        this.hotkeySettingsList.innerHTML = entries.map(entry => {
            const code = entry.kind === 'upgrade' ? this.getUpgradeHotkey() : this.getBuildHotkey(entry.key);
            const meta = entry.kind === 'upgrade' ? 'группа / выбранная башня' : 'строительство';
            return `<div class="hotkey-setting-row">
                <div class="hotkey-setting-label">
                    <div class="hotkey-setting-name">${this.getHotkeyActionLabel(entry.kind, entry.key)}</div>
                    <div class="hotkey-setting-meta">${meta}</div>
                </div>
                <button class="hotkey-setting-btn" type="button" data-hotkey-kind="${entry.kind}" data-hotkey-key="${entry.key}">${this.hotkeyLabel(code)}</button>
            </div>`;
        }).join('');
        this.hotkeySettingsList.querySelectorAll('.hotkey-setting-btn').forEach(btn => {
            this.bindActionPress(btn, () => this.startHotkeyRebind(btn.dataset.hotkeyKind, btn.dataset.hotkeyKey, btn));
        });
    }
    syncAudioSettingsUI() {
        const audio = this.game.audio;
        if (!audio) return;
        const musicPercent = Math.round(audio.musicVolume * 100);
        const sfxPercent = Math.round(audio.sfxVolume * 100);
        if (this.musicVolInput) this.musicVolInput.value = musicPercent;
        if (this.musicVolValue) this.musicVolValue.textContent = `${musicPercent}%`;
        if (this.sfxVolInput) this.sfxVolInput.value = sfxPercent;
        if (this.sfxVolValue) this.sfxVolValue.textContent = `${sfxPercent}%`;
        if (this.musicToggleBtn) {
            this.musicToggleBtn.textContent = audio.musicMuted ? 'ВЫКЛ' : 'ВКЛ';
            this.musicToggleBtn.classList.toggle('off', audio.musicMuted);
        }
        if (this.sfxToggleBtn) {
            this.sfxToggleBtn.textContent = audio.sfxMuted ? 'ВЫКЛ' : 'ВКЛ';
            this.sfxToggleBtn.classList.toggle('off', audio.sfxMuted);
        }
    }
    renderMusicThemes() {
        if (!this.musicThemeList || !this.game.audio?.getMusicThemes) return;
        const activeTheme = this.game.audio.musicTheme;
        this.musicThemeList.innerHTML = this.game.audio.getMusicThemes().map(theme => `
            <button class="music-theme-btn${theme.id === activeTheme ? ' active' : ''}" type="button" data-theme="${theme.id}">
                <span class="music-theme-icon">${theme.icon}</span>
                <span class="music-theme-main">
                    <span class="music-theme-name">${theme.name}</span>
                    <span class="music-theme-desc">${theme.description}</span>
                </span>
                <span class="music-theme-tag">${theme.tag}</span>
            </button>
        `).join('');
        this.musicThemeList.querySelectorAll('.music-theme-btn').forEach(btn => {
            this.bindActionPress(btn, () => {
                if (!this.game.audio.setMusicTheme(btn.dataset.theme)) return;
                this.renderMusicThemes();
                this.syncAudioSettingsUI();
            });
        });
    }
    formatAbilityTimer(seconds) {
        const safe = Math.max(0, Math.ceil(seconds));
        const mins = Math.floor(safe / 60);
        const secs = safe % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    updateAbilityBar() {
        if (!this.abilityButtons) return;
        for (const [kind, btn] of Object.entries(this.abilityButtons)) {
            const state = this.game.getAbilityState?.(kind);
            const cfg = ABILITY_TYPES[kind];
            if (!btn || !state || !cfg) continue;
            const ready = state.charges > 0;
            btn.classList.toggle('ready', ready);
            btn.classList.toggle('empty', !ready);
            btn.classList.toggle('active', this.game.selectedAbilityKind === kind);
            btn.disabled = this.game.gameState === 'menu' || this.game.gameState === 'won' || this.game.gameState === 'lost' || this.game.gameState === 'ended';
            const timerEl = btn.querySelector('.ability-timer');
            const chargesEl = btn.querySelector('.ability-charges');
            if (timerEl) timerEl.textContent = ready ? `+${this.formatAbilityTimer(state.nextChargeIn)}` : this.formatAbilityTimer(state.nextChargeIn);
            if (chargesEl) chargesEl.textContent = String(state.charges);
            btn.title = `${cfg.name}\n${cfg.description}\nЗаряды: ${state.charges}`;
        }
    }
    selectTowerType(type) {
        const btn = [...this.towerButtons].find(candidate => candidate.dataset.type === type);
        if (!btn || btn.classList.contains('locked')) return false;
        if (this.game.selectedTowerType === type) {
            this.game.selectedTowerType = null;
            this.deselectAllTowerButtons();
            return true;
        }
        this.game.clearSelectedAbility?.();
        this.game.selectedTowerType = type;
        this.game.clearTowerSelection(true);
        this.hideTowerInfo();
        this.deselectAllTowerButtons();
        btn.classList.add('selected');
        this.hideTowerTooltip();
        return true;
    }
    canUseHostOnlyMenu() {
        return !this.game.isRemoteViewer();
    }
    applyMultiplayerRoleState() {
        const guest = this.game.isRemoteViewer();
        const waitingText = 'Ждем, пока ваш партнер сделает выбор';
        this.modeSelectBtn?.toggleAttribute('disabled', guest);
        this.continueMapSelectBtn?.toggleAttribute('disabled', guest);
        this.startMapBtn?.toggleAttribute('disabled', guest);
        this.skipBtn?.toggleAttribute('disabled', guest);
        this.pauseBtn?.toggleAttribute('disabled', guest);
        this.speedBtn?.toggleAttribute('disabled', guest);
        this.skipBtn?.classList.toggle('coop-disabled', guest);
        this.pauseBtn?.classList.toggle('coop-disabled', guest);
        this.speedBtn?.classList.toggle('coop-disabled', guest);
        if (this.pauseBtn) {
            this.pauseBtn.textContent = this.game.isPaused ? '▶ ПРОД.' : '▮▮ ПАУЗА';
            this.pauseBtn.classList.toggle('active', this.game.isPaused && !guest);
        }
        if (this.speedBtn) {
            this.speedBtn.textContent = this.game.gameSpeed === 3 ? '⏩ x3' : this.game.gameSpeed === 2 ? '⏩ x2' : '▶ x1';
        }
        if (this.restartBtn) {
            const inRoom = this.game.isRoomActive();
            this.restartBtn.disabled = false;
            this.restartBtn.classList.toggle('coop-exit', inRoom);
            this.restartBtn.textContent = inRoom ? '⎋ ВЫЙТИ' : '🔄';
            this.restartBtn.title = inRoom ? 'Выйти из co-op матча' : 'Перезапуск карты';
        }
        this.difficultyGrid?.querySelectorAll('.difficulty-card').forEach(card => {
            card.toggleAttribute('disabled', guest);
            card.classList.toggle('coop-locked', guest);
        });
        this.mapCardGrid?.querySelectorAll('.map-card').forEach(card => {
            card.toggleAttribute('disabled', guest);
            card.classList.toggle('coop-locked', guest);
        });
        if (guest) {
            if (this.startMapBtn) this.startMapBtn.textContent = waitingText;
            if (this.modeSelectBtn) this.modeSelectBtn.textContent = '⏳ ЖДЕМ ГЛАВНОГО ИГРОКА';
        } else if (this.modeSelectBtn) {
            this.modeSelectBtn.textContent = '▶ ВЫБРАТЬ РЕЖИМ';
        }
    }
    getUnitClassName(unitClass, singular = false) {
        const labels = singular
            ? { light: 'Лёгкий', medium: 'Средний', heavy: 'Тяжёлый' }
            : { light: 'Лёгкие', medium: 'Средние', heavy: 'Тяжёлые' };
        return labels[unitClass] || unitClass;
    }
    getModifierMarkup(modifiers) {
        const classes = ['light', 'medium', 'heavy'];
        return classes.map(cls => {
            const mult = modifiers?.[cls] ?? 1;
            const diff = Math.round((mult - 1) * 100);
            const color = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#94a3b8';
            const label = diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : '0%';
            return `<div>${this.getUnitClassName(cls)}: <strong style="color:${color}">${label}</strong></div>`;
        }).join('');
    }
    bindActionPress(el, handler) {
        if (!el) return;
        let handledPointer = false;
        el.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            handledPointer = true;
            e.preventDefault();
            handler();
        });
        el.addEventListener('click', () => {
            if (handledPointer) {
                handledPointer = false;
                return;
            }
            handler();
        });
    }
    positionTooltip(tt, rect) {
        const margin = 10;
        const width = tt.offsetWidth;
        const height = tt.offsetHeight;
        let left = rect.left - width - 12;
        if (left < margin) left = rect.right + 12;
        if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;
        let top = rect.top + rect.height / 2 - height / 2;
        if (top < margin) top = margin;
        if (top + height > window.innerHeight - margin) top = window.innerHeight - height - margin;
        tt.style.left = Math.max(margin, left) + 'px';
        tt.style.top = Math.max(margin, top) + 'px';
    }
    getEnemyProfile(enemy) {
        const profileType = enemy.profileType || enemy.type;
        const profileMap = {
            runner: { heightCm: 172, weightKg: 61, threat: 'Налётчик' },
            normal: { heightCm: 181, weightKg: 84, threat: 'Штурмовик' },
            ghost: { heightCm: 186, weightKg: 49, threat: 'Фазовый' },
            shade: { heightCm: 190, weightKg: 72, threat: 'Скрытный' },
            stalker: { heightCm: 197, weightKg: 118, threat: 'Охотник' },
            armored: { heightCm: 194, weightKg: 148, threat: 'Броня' },
            tank: { heightCm: 218, weightKg: 246, threat: 'Таран' },
            destroyer: { heightCm: 206, weightKg: 198, threat: 'Осадный' },
            necro: { heightCm: 189, weightKg: 92, threat: 'Поддержка' },
            boss: { heightCm: 268, weightKg: 420, threat: 'Аномалия' },
        };
        return profileMap[profileType] || { heightCm: 180, weightKg: 90, threat: 'Неизвестно' };
    }
    init() {
        this.goldEl = document.getElementById('gold-value');
        this.livesEl = document.getElementById('lives-value');
        this.waveEl = document.getElementById('wave-value');
        this.bodyEl = document.body;
        this.canvasWrapper = document.getElementById('canvas-wrapper');
        this.headerEl = document.getElementById('game-header');
        this.topBar = document.getElementById('top-bar');
        this.sidebarEl = document.getElementById('sidebar');
        this.timerPanel = document.getElementById('wave-timer-panel');
        this.timerValue = document.getElementById('timer-value');
        this.timerBar = document.getElementById('timer-bar-fill');
        this.bonusValue = document.getElementById('bonus-value');
        this.skipBtn = document.getElementById('btn-skip');
        this.waveStatus = document.getElementById('wave-status');
        this.pauseBtn = document.getElementById('btn-pause');
        this.speedBtn = document.getElementById('btn-speed');
        this.restartBtn = document.getElementById('btn-restart');
        this.abilityButtons = {
            fortress: document.getElementById('ability-fortress'),
            freeze: document.getElementById('ability-freeze'),
            sunfall: document.getElementById('ability-sunfall'),
        };
        this.towerInfoPanel = document.getElementById('tower-info');
        this.layoutControls = document.getElementById('layout-controls');
        this.layoutTopBtn = document.getElementById('btn-toggle-top-ui');
        this.layoutSidebarBtn = document.getElementById('btn-toggle-sidebar');
        this.mapOnlyBtn = document.getElementById('btn-map-only');
        this.settingsFab = document.getElementById('btn-open-settings');
        this.testAccessBtn = document.getElementById('btn-test-access');
        this.settingsDrawer = document.getElementById('settings-drawer');
        this.settingsCloseBtn = document.getElementById('btn-close-settings');
        this.settingsRestartBtn = document.getElementById('btn-settings-restart');
        this.returnMainMenuBtn = document.getElementById('btn-return-main-menu');
        this.towerHud = document.getElementById('tower-action-hud');
        this.hudUpgradeBtn = document.getElementById('hud-upgrade');
        this.hudSellBtn = document.getElementById('hud-sell');
        this.hudInfoBtn = document.getElementById('hud-info');
        this.siloHud = document.getElementById('silo-action-hud');
        this.siloHudCard = this.siloHud?.querySelector('.silo-hud-card') || null;
        this.siloHudStatus = document.getElementById('silo-hud-status');
        this.siloCountTactical = document.getElementById('silo-count-tactical');
        this.siloCountStrategic = document.getElementById('silo-count-strategic');
        this.siloCountTsar = document.getElementById('silo-count-tsar');
        this.siloSelectTactical = document.getElementById('silo-select-tactical');
        this.siloSelectStrategic = document.getElementById('silo-select-strategic');
        this.siloSelectTsar = document.getElementById('silo-select-tsar');
        this.siloBuyTactical = document.getElementById('silo-buy-tactical');
        this.siloBuyStrategic = document.getElementById('silo-buy-strategic');
        this.siloBuyTsar = document.getElementById('silo-buy-tsar');
        this.siloInfoBtn = document.getElementById('silo-info');
        this.siloSellBtn = document.getElementById('silo-sell');
        this.musicVolInput = document.getElementById('music-vol');
        this.musicVolValue = document.getElementById('music-vol-value');
        this.musicToggleBtn = document.getElementById('btn-music-toggle');
        this.sfxVolInput = document.getElementById('sfx-vol');
        this.sfxVolValue = document.getElementById('sfx-vol-value');
        this.sfxToggleBtn = document.getElementById('btn-sfx-toggle');
        this.musicThemeList = document.getElementById('music-theme-list');
        this.hotkeySettingsList = document.getElementById('hotkey-settings-list');
        this.hotkeySettingsStatus = document.getElementById('hotkey-settings-status');
        this.hotkeyResetBtn = document.getElementById('btn-hotkeys-reset');
        this.startScreen = document.getElementById('start-screen');
        this.mainMenuView = document.getElementById('main-menu-view');
        this.mapSelectView = document.getElementById('map-select-view');
        this.modeSelectBtn = document.getElementById('btn-open-mode-select');
        this.mainSettingsBtn = document.getElementById('btn-main-settings');
        this.difficultyPanel = document.getElementById('difficulty-panel');
        this.difficultyGrid = document.getElementById('difficulty-grid');
        this.continueMapSelectBtn = document.getElementById('btn-continue-map-select');
        this.backMainMenuBtn = document.getElementById('btn-back-main-menu');
        this.selectedDifficultySummary = document.getElementById('selected-difficulty-summary');
        this.mapCardGrid = document.getElementById('map-card-grid');
        this.mapDetailPreview = document.getElementById('map-detail-preview');
        this.mapDetailBadge = document.getElementById('map-detail-badge');
        this.mapDetailTitle = document.getElementById('map-detail-title');
        this.mapDetailDescription = document.getElementById('map-detail-description');
        this.mapDetailTags = document.getElementById('map-detail-tags');
        this.startMapBtn = document.getElementById('btn-start-map');
        this.overlayEl = document.getElementById('game-overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMessage = document.getElementById('overlay-message');
        this.overlayBtn = document.getElementById('overlay-btn');
        this.towerButtons = document.querySelectorAll('.tower-btn');
        this.lastTowerInfoKey = '';
        this.infoMode = '';
        this.topUiHidden = false;
        this.sidebarHidden = false;
        this.mapOnlyActive = false;
        this.settingsOpen = false;
        this.rebindingHotkeyCleanup = null;
        this.rebindingHotkeyTarget = null;
        this.loadHotkeys();
        this.setupEvents();
        this.renderMusicThemes();
        this.syncAudioSettingsUI();
        this.renderHotkeySettings();
        this.renderDifficultyCards();
        this.renderMapCards();
        this.applyLayoutState();
        this.updateGold(CONFIG.START_GOLD); this.updateLives(CONFIG.START_LIVES); this.updateWave(0);
        if (this.testAccessBtn && !this.game.devModeAvailable) {
            this.testAccessBtn.remove();
            this.testAccessBtn = null;
        }
        this.updateTestAccessState();
        this.updateTowerButtons(); this.updateAbilityBar(); this.showCountdownState(); this.showStartScreen(this.game.selectedMapId);
    }
    setupEvents() {
        window.addEventListener('resize', () => { this.hideTowerTooltip(); this.updateActionHud(); });
        window.addEventListener('keydown', (e) => {
            const tag = e.target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === 'Escape' && this.settingsOpen) {
                this.hideSettingsPanel();
                e.preventDefault();
                return;
            }
            if (this.rebindingHotkeyTarget) return;
            if (this.settingsOpen || this.game.gameState === 'menu' || this.game.gameState === 'won' || this.game.gameState === 'lost' || this.game.gameState === 'ended') return;
            if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
            const buildType = Object.keys(this.buildHotkeys || {}).find(type => this.buildHotkeys[type] === e.code);
            if (buildType) {
                if (this.selectTowerType(buildType)) e.preventDefault();
                return;
            }
            if (e.code === this.getUpgradeHotkey()) {
                this.upgradeSelectedTower();
                e.preventDefault();
            }
        });
        this.skipBtn.addEventListener('click', () => this.game.skipCountdown());
        this.pauseBtn.addEventListener('click', () => {
            if (this.game.isRemoteViewer()) return;
            this.game.isPaused = !this.game.isPaused;
            this.pauseBtn.textContent = this.game.isPaused ? '▶ ПРОД.' : '▮▮ ПАУЗА';
            this.pauseBtn.classList.toggle('active', this.game.isPaused);
            this.game.multiplayer?.publishSnapshot?.();
        });
        this.speedBtn.addEventListener('click', () => {
            if (this.game.isRemoteViewer()) return;
            if (this.game.gameSpeed === 1) { this.game.gameSpeed = 2; this.speedBtn.textContent = '⏩ x2'; }
            else if (this.game.gameSpeed === 2) { this.game.gameSpeed = 3; this.speedBtn.textContent = '⏩ x3'; }
            else { this.game.gameSpeed = 1; this.speedBtn.textContent = '▶ x1'; }
            this.game.multiplayer?.publishSnapshot?.();
        });
        this.restartBtn.addEventListener('click', () => this.game.restart());
        this.overlayBtn.addEventListener('click', () => this.game.restart());
        this.settingsFab?.addEventListener('click', () => this.toggleSettingsPanel());
        this.mainSettingsBtn?.addEventListener('click', () => this.toggleSettingsPanel());
        this.modeSelectBtn?.addEventListener('click', () => { if (this.canUseHostOnlyMenu()) this.showDifficultyPanel(); });
        this.continueMapSelectBtn?.addEventListener('click', () => { if (this.canUseHostOnlyMenu()) this.showMapSelectView(); });
        this.backMainMenuBtn?.addEventListener('click', () => this.showMainMenuView());
        this.testAccessBtn?.addEventListener('click', () => this.handleTestAccess());
        this.settingsCloseBtn?.addEventListener('click', () => this.hideSettingsPanel());
        this.settingsRestartBtn?.addEventListener('click', () => {
            this.hideSettingsPanel();
            this.game.restart();
        });
        this.returnMainMenuBtn?.addEventListener('click', () => {
            this.hideSettingsPanel();
            this.game.resetMatchState(true);
        });
        this.hotkeyResetBtn?.addEventListener('click', () => this.resetHotkeysToDefault());
        this.startMapBtn?.addEventListener('click', () => { if (this.canUseHostOnlyMenu()) this.game.startMatch(this.game.selectedMapId, this.game.selectedDifficultyId); });
        this.mapCardGrid?.addEventListener('click', (e) => {
            const card = e.target.closest('.map-card');
            if (!card || !this.canUseHostOnlyMenu()) return;
            this.game.selectMap(card.dataset.mapId);
            this.refreshMapSelection();
        });
        this.bindActionPress(this.layoutTopBtn, () => this.toggleTopUi());
        this.bindActionPress(this.layoutSidebarBtn, () => this.toggleSidebar());
        this.bindActionPress(this.mapOnlyBtn, () => this.toggleMapOnly());
        Object.entries(this.abilityButtons || {}).forEach(([kind, btn]) => {
            this.bindActionPress(btn, () => {
                if (this.game.selectAbility(kind)) this.updateAbilityBar();
            });
        });
        this.bindActionPress(this.hudUpgradeBtn, () => this.upgradeSelectedTower());
        this.bindActionPress(this.hudSellBtn, () => this.sellSelectedTower());
        this.bindActionPress(this.hudInfoBtn, () => this.toggleSelectedTowerInfo());
        this.bindActionPress(this.siloSelectTactical, () => this.selectSiloPayload('tactical'));
        this.bindActionPress(this.siloSelectStrategic, () => this.selectSiloPayload('strategic'));
        this.bindActionPress(this.siloSelectTsar, () => this.selectSiloPayload('tsar'));
        this.bindActionPress(this.siloBuyTactical, () => this.buySiloPayload('tactical'));
        this.bindActionPress(this.siloBuyStrategic, () => this.buySiloPayload('strategic'));
        this.bindActionPress(this.siloBuyTsar, () => this.buySiloPayload('tsar'));
        this.bindActionPress(this.siloInfoBtn, () => this.toggleSelectedTowerInfo());
        this.bindActionPress(this.siloSellBtn, () => this.sellSelectedTower());
        this.towerButtons.forEach(btn => {
            const hotkey = this.getBuildHotkey(btn.dataset.type);
            if (hotkey) btn.dataset.hotkey = this.hotkeyLabel(hotkey);
            else delete btn.dataset.hotkey;
            btn.addEventListener('click', () => {
                const type = btn.dataset.type; if (btn.classList.contains('locked')) return;
                this.selectTowerType(type);
            });
            btn.addEventListener('mouseenter', () => this.showTowerTooltip(btn));
            btn.addEventListener('mouseleave', () => this.hideTowerTooltip());
        });
        this.musicVolInput?.addEventListener('input', (e) => {
            if (!this.game.audio) return;
            this.game.audio.setMusicVolume(e.target.value / 100);
            this.syncAudioSettingsUI();
        });
        this.sfxVolInput?.addEventListener('input', (e) => {
            if (!this.game.audio) return;
            this.game.audio.setSfxVolume(e.target.value / 100);
            this.syncAudioSettingsUI();
        });
        this.musicToggleBtn?.addEventListener('click', () => {
            if (!this.game.audio) return;
            this.game.audio.toggleMusic();
            this.syncAudioSettingsUI();
        });
        this.sfxToggleBtn?.addEventListener('click', () => {
            if (!this.game.audio) return;
            this.game.audio.toggleSfx();
            this.syncAudioSettingsUI();
        });
    }
    showSettingsPanel() {
        this.syncAudioSettingsUI();
        this.renderMusicThemes();
        this.settingsOpen = true;
        this.settingsDrawer?.classList.add('open');
        this.bodyEl.classList.add('settings-open');
    }
    hideSettingsPanel() {
        this.settingsOpen = false;
        this.settingsDrawer?.classList.remove('open');
        this.bodyEl.classList.remove('settings-open');
    }
    toggleSettingsPanel() {
        if (this.settingsOpen) this.hideSettingsPanel();
        else this.showSettingsPanel();
    }
    updateTestAccessState() {
        if (!this.testAccessBtn) return;
        const active = !!this.game.testModeEnabled;
        this.testAccessBtn.classList.toggle('active', active);
        this.testAccessBtn.textContent = active ? 'TEST ON' : 'TEST';
        this.testAccessBtn.title = active ? 'Тестовый режим активен' : 'Тестовый режим';
    }
    handleTestAccess() {
        if (!this.game.devModeAvailable) return;
        if (this.game.testModeEnabled) {
            this.game.enableTestMode();
            return;
        }
        this.game.enableTestMode();
    }
    buildMapPreviewSvg(map) {
        const innerWidth = 186;
        const innerHeight = 86;
        const cols = map.cols || CONFIG.GRID_COLS;
        const rows = map.rows || CONFIG.GRID_ROWS;
        const scale = Math.min(innerWidth / Math.max(1, cols - 1), innerHeight / Math.max(1, rows - 1));
        const offsetX = 12 + (innerWidth - (cols - 1) * scale) / 2;
        const offsetY = 10 + (innerHeight - (rows - 1) * scale) / 2;
        const points = map.route.map(([col, row]) => {
            const x = offsetX + col * scale;
            const y = offsetY + row * scale;
            return `${x},${y}`;
        }).join(' ');
        const startX = offsetX + map.route[0][0] * scale;
        const startY = offsetY + map.route[0][1] * scale;
        const endX = offsetX + map.route[map.route.length - 1][0] * scale;
        const endY = offsetY + map.route[map.route.length - 1][1] * scale;
        return `<svg viewBox="0 0 210 110" class="map-preview-svg" aria-hidden="true">
            <defs>
                <filter id="glow-${map.id}">
                    <feGaussianBlur stdDeviation="2.2" result="blur"></feGaussianBlur>
                    <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
                </filter>
            </defs>
            <polyline points="${points}" fill="none" stroke="rgba(245,158,11,0.95)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.2"></polyline>
            <polyline points="${points}" fill="none" stroke="rgba(255,244,214,0.92)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-${map.id})"></polyline>
            <circle cx="${startX}" cy="${startY}" r="5" fill="#22c55e"></circle>
            <circle cx="${endX}" cy="${endY}" r="6" fill="#ef4444"></circle>
        </svg>`;
    }
    getMapPreviewStyle(map) {
        return map.art ? ` style="background-image:url('${map.art}')"` : '';
    }
    renderDifficultyCards() {
        if (!this.difficultyGrid) return;
        this.difficultyGrid.innerHTML = Object.values(DIFFICULTY_LEVELS).map(diff => `
            <button class="difficulty-card difficulty-${diff.id}" type="button" data-difficulty-id="${diff.id}">
                <div class="difficulty-card-head">
                    <span class="difficulty-name">${diff.name}</span>
                    <span class="difficulty-badge">${diff.badge}</span>
                </div>
                <p>${diff.description}</p>
                <div class="difficulty-stats">
                    <span>Старт: ${diff.startGold}💰</span>
                    <span>Враги: ${Math.round(diff.countScale * 100)}%</span>
                    <span>Боссы: ${Math.round(diff.bossHpScale * 100)}%</span>
                </div>
            </button>
        `).join('');
        this.difficultyGrid.querySelectorAll('.difficulty-card').forEach(card => {
            this.bindActionPress(card, () => {
                if (!this.canUseHostOnlyMenu()) return;
                this.game.selectDifficulty(card.dataset.difficultyId);
                this.refreshDifficultySelection();
            });
        });
        this.refreshDifficultySelection();
        this.applyMultiplayerRoleState();
    }
    refreshDifficultySelection() {
        const diff = this.game.getDifficultyConfig();
        this.difficultyGrid?.querySelectorAll('.difficulty-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.difficultyId === diff.id);
        });
        if (this.selectedDifficultySummary) {
            this.selectedDifficultySummary.innerHTML = `
                <span class="map-tag">Режим: ${diff.name}</span>
                <span class="map-tag">${diff.badge}</span>
                <span class="map-tag">Старт: ${diff.startGold} золота</span>
            `;
        }
        if (this.startMapBtn) {
            const map = getMapPreset(this.game.selectedMapId);
            this.startMapBtn.textContent = `▶ НАЧАТЬ: ${map.name.toUpperCase()} · ${diff.name.toUpperCase()}`;
        }
        this.applyMultiplayerRoleState();
    }
    showDifficultyPanel() {
        this.difficultyPanel?.classList.add('visible');
        this.difficultyPanel?.setAttribute('aria-hidden', 'false');
        this.refreshDifficultySelection();
    }
    showMainMenuView() {
        if (this.mainMenuView) this.mainMenuView.hidden = false;
        if (this.mapSelectView) this.mapSelectView.hidden = true;
        this.difficultyPanel?.classList.remove('visible');
        this.difficultyPanel?.setAttribute('aria-hidden', 'true');
    }
    showMapSelectView() {
        if (this.mainMenuView) this.mainMenuView.hidden = true;
        if (this.mapSelectView) this.mapSelectView.hidden = false;
        this.refreshMapSelection();
    }
    renderMapCards() {
        if (!this.mapCardGrid) return;
        this.mapCardGrid.innerHTML = MAP_PRESETS.map(map => `
            <button class="map-card map-theme-${map.theme}" type="button" data-map-id="${map.id}">
                <div class="map-card-preview"${this.getMapPreviewStyle(map)}>${this.buildMapPreviewSvg(map)}</div>
                <div class="map-card-body">
                    <div class="map-card-badge">${map.badge}</div>
                    <div class="map-card-title">${map.name}</div>
                    <div class="map-card-desc">${map.description}</div>
                </div>
            </button>
        `).join('');
        this.applyMultiplayerRoleState();
    }
    refreshMapSelection() {
        const map = getMapPreset(this.game.selectedMapId);
        this.mapCardGrid?.querySelectorAll('.map-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.mapId === map.id);
        });
        if (this.mapDetailPreview) this.mapDetailPreview.innerHTML = `<div class="map-detail-visual map-theme-${map.theme}"${this.getMapPreviewStyle(map)}>${this.buildMapPreviewSvg(map)}</div>`;
        if (this.mapDetailBadge) this.mapDetailBadge.textContent = map.badge;
        if (this.mapDetailTitle) this.mapDetailTitle.textContent = map.name;
        if (this.mapDetailDescription) this.mapDetailDescription.textContent = map.description;
        this.refreshDifficultySelection();
        if (this.mapDetailTags) {
            const turns = map.route.length - 2;
            const straight = expandRouteCells(map.route).length;
            this.mapDetailTags.innerHTML = [
                `<span class="map-tag">${map.cols} x ${map.rows} клеток</span>`,
                `<span class="map-tag">${turns} поворотов</span>`,
                `<span class="map-tag">${straight} клеток пути</span>`,
                `<span class="map-tag">База: ${map.baseCell.col + 1}:${map.baseCell.row + 1}</span>`,
                map.isLarge ? `<span class="map-tag">Камера + миникарта</span>` : '',
            ].join('');
        }
    }
    showStartScreen(mapId = this.game.selectedMapId) {
        this.game.selectMap(mapId);
        this.hideSettingsPanel();
        this.showMainMenuView();
        this.refreshMapSelection();
        this.applyMultiplayerRoleState();
        if (this.startScreen) this.startScreen.style.display = 'flex';
        this.bodyEl.classList.add('menu-open');
    }
    hideStartScreen() {
        if (this.startScreen) this.startScreen.style.display = 'none';
        this.bodyEl.classList.remove('menu-open');
    }
    tick(dt) {
        this.updateActionHud();
        this.updateAbilityBar();
        if (this.towerInfoPanel.style.display === 'none') return;
        if (this.game.selectedTower) {
            if (this.game.selectedTower.isDestroyed) { this.hideTowerInfo(); return; }
            if (this.infoMode !== 'tower') return;
            const infoKey = this.buildTowerInfoKey(this.game.selectedTower);
            if (infoKey === this.lastTowerInfoKey) return;
            this.showTowerInfo(this.game.selectedTower);
            return;
        }
        if (this.game.selectedEnemy) {
            if (this.game.selectedEnemy.isDead || this.game.selectedEnemy.reachedEnd) { this.hideTowerInfo(); return; }
            if (this.infoMode !== 'enemy') return;
            const infoKey = this.buildEnemyInfoKey(this.game.selectedEnemy);
            if (infoKey === this.lastTowerInfoKey) return;
            this.showEnemyInfo(this.game.selectedEnemy);
        }
    }
    buildTowerInfoKey(tower) {
        const farmCount = tower.isFarm ? this.game.getFarmCountForPlayer(tower.ownerId || 'p1') : 0;
        return [
            tower.type, tower.level, Math.round(tower.hp), tower.maxHp, tower.damage, tower.range, tower.fireRate,
            tower.scanRadius, tower.invisibleDetectionLevel, tower.healRadius, tower.healRate, tower.farmIncome, tower.targetMode,
            tower.slowFactor, tower.slowDuration, tower.projectileSpeedMultiplier, tower.airAttackRadius, tower.orbitRadius, tower.rocketDamage,
            Math.ceil(tower.fortressTimer || 0),
            tower.isNukeSilo ? tower.selectedPayload : '',
            tower.isNukeSilo ? tower.getPayloadStock('tactical') : 0,
            tower.isNukeSilo ? tower.getPayloadStock('strategic') : 0,
            tower.isNukeSilo ? tower.getPayloadStock('tsar') : 0,
            tower.isBusy() ? tower.getWorkLabel() : 'ready',
            Math.ceil(tower.getRemainingWorkTime()),
            tower.canUpgrade() ? tower.getUpgradeCost() : -1,
            tower.canUpgrade() ? tower.getUpgradeTime() : -1,
            tower.getSellValue(), this.game.getDisplayGold(), farmCount, tower.ownerId || 'p1'
        ].join('|');
    }
    buildEnemyInfoKey(enemy) {
        return [
            enemy.type, Math.round(enemy.hp), enemy.maxHp, enemy.baseSpeed, enemy.reward,
            enemy.unitClass, enemy.invisibilityLevel, enemy.canAttackTowers, enemy.towerAttackDamage, enemy.towerAttackRate,
            enemy.towerAttackRange, enemy.isInvisible, enemy.bossStage, enemy.skyAttackEnabled, enemy.skyAttackDamage,
            enemy.skyAttackRadius, enemy.skyAttackInterval, enemy.disablePulseEnabled, enemy.disablePulseRadius, enemy.disablePulseDuration,
            enemy.bossPersona, enemy.name, Math.ceil(enemy.stunTimer || 0)
        ].join('|');
    }
    deselectAllTowerButtons() { this.towerButtons.forEach(b => b.classList.remove('selected')); }
    updateTowerButtons() {
        const displayGold = this.game.getDisplayGold();
        this.towerButtons.forEach(btn => {
            const type = btn.dataset.type, cfg = TOWER_TYPES[type], unlocked = this.game.isTowerUnlocked(type);
            const hotkey = this.getBuildHotkey(type);
            btn.classList.toggle('locked', !unlocked);
            btn.classList.toggle('cant-afford', unlocked && displayGold < cfg.cost);
            if (hotkey) btn.dataset.hotkey = this.hotkeyLabel(hotkey);
            else delete btn.dataset.hotkey;
            btn.title = hotkey ? `Клавиша: ${this.hotkeyLabel(hotkey)}` : '';
            const lock = btn.querySelector('.tower-btn-lock');
            if (lock) { lock.style.display = unlocked ? 'none' : 'block'; if (!unlocked) lock.textContent = '🔒 В.' + cfg.unlockWave; }
        });
    }
    showTowerTooltip(btn) {
        const type = btn.dataset.type, cfg = TOWER_TYPES[type];
        let tt = document.getElementById('tower-tooltip');
        if (!tt) { tt = document.createElement('div'); tt.id = 'tower-tooltip'; document.body.appendChild(tt); }
        const unlocked = this.game.isTowerUnlocked(type);
        const hotkey = this.getBuildHotkey(type);
        const hotkeyLine = hotkey ? `<br><span class="tt-stat">⌨ ${this.hotkeyLabel(hotkey)}</span>` : '';
        const mods = cfg.damageModifiers ? `<br><span style="color:#94a3b8">Классы:</span><div style="margin-top:4px;display:grid;grid-template-columns:1fr;gap:2px">${this.getModifierMarkup(cfg.damageModifiers)}</div>` : '';
        const wallStats = cfg.isWall ? `<span class="tt-stat">🛣 Дорога</span><span class="tt-stat">⚔ Обмен HP в упор</span>` : '';
        const airfieldStats = cfg.isAirfield ? `<span class="tt-stat">🛫 2 клетки</span><span class="tt-stat">🛩 Орбита:${cfg.orbitRadius}px</span><span class="tt-stat">🎯 Круг:${cfg.airAttackRadius}px</span>` : '';
        const nukeStats = cfg.isNukeSilo ? `<span class="tt-stat">☢ Ручной пуск</span><span class="tt-stat">🌍 Безлимитная дальность</span><span class="tt-stat">🧱 Любая клетка</span>` : '';
        const cryoStats = cfg.slowFactor && cfg.slowFactor < 1 ? `<span class="tt-stat">🧊 Слоу:${Math.round((1 - cfg.slowFactor) * 100)}%</span><span class="tt-stat">⌛ ${cfg.slowDuration}с</span>` : '';
        const pulseStats = cfg.isPulseTower ? `<span class="tt-stat">🌐 Волна:${cfg.range}px</span>` : '';
        const primaryStats = [
            `<span class="tt-stat">💰${cfg.cost}</span>`,
            cfg.damage ? `<span class="tt-stat">⚔${cfg.damage}</span>` : '',
            cfg.range ? `<span class="tt-stat">📏${cfg.range}px</span>` : '',
            `<span class="tt-stat">🛡${cfg.hp}HP</span>`,
            `<span class="tt-stat">⏳${this.fmtTime(cfg.buildTime || 0)}</span>`
        ].filter(Boolean).join('');
        tt.innerHTML = `<strong>${cfg.name}</strong>${!unlocked ? ' <span style="color:#ef4444">🔒</span>' : ''}<br>${cfg.description}<br>
            ${primaryStats}
            ${hotkeyLine}
            ${cfg.isAoe ? `<span class="tt-stat">💥AoE:${cfg.aoeRadius}px</span>` : ''}
            ${cfg.chainTargets ? `<span class="tt-stat">⚡Цепь:${cfg.chainTargets}</span>` : ''}
            ${cfg.isScanner ? `<span class="tt-stat">📡Скан:${cfg.scanRadius}px</span><span class="tt-stat">👁Вижен:${cfg.detectionLevel || 1}</span>` : ''}
            ${cfg.isHealer ? `<span class="tt-stat">🔧Хил:${cfg.healRate}HP/с</span><span class="tt-stat">📏Зона:${cfg.healRadius}px</span>` : ''}
            ${cfg.isFarm ? `<span class="tt-stat">🌾Доход:${cfg.farmIncome}💰/раунд</span>` : ''}
            ${wallStats}
            ${airfieldStats}
            ${nukeStats}
            ${cryoStats}
            ${pulseStats}
            ${!unlocked ? `<br><span style="color:#ef4444;font-weight:700">Волна ${cfg.unlockWave}</span>` : ''}${mods}`;
        const r = btn.getBoundingClientRect();
        tt.style.display = 'block';
        this.positionTooltip(tt, r);
    }
    hideTowerTooltip() { const tt = document.getElementById('tower-tooltip'); if (tt) tt.style.display = 'none'; }
    updateGold(v) { this.goldEl.textContent = v; this.updateTowerButtons(); }
    updateLives(v) {
        this.livesEl.textContent = v;
        const dangerThreshold = Math.ceil(CONFIG.START_LIVES * 0.25);
        const warningThreshold = Math.ceil(CONFIG.START_LIVES * 0.5);
        this.livesEl.style.color = v <= dangerThreshold ? '#ef4444' : v <= warningThreshold ? '#f59e0b' : '#22c55e';
    }
    updateWave(v) { this.waveEl.textContent = v + ' / ' + CONFIG.TOTAL_WAVES; }
    showCountdownState() { this.timerPanel.style.display = ''; this.waveStatus.style.display = 'none'; this.skipBtn.style.display = ''; this.applyMultiplayerRoleState(); }
    showWaveActive(wave) {
        const text = '\u2694 \u0412\u041e\u041b\u041d\u0410 ' + wave + ' \u2014 \u0411\u041e\u0419...';
        if (this.timerPanel.style.display !== 'none') this.timerPanel.style.display = 'none';
        if (this.waveStatus.style.display === 'none') this.waveStatus.style.display = '';
        if (this.waveStatus.textContent !== text) this.waveStatus.textContent = text;
        if (this.skipBtn.style.display !== 'none') this.skipBtn.style.display = 'none';
    }
    updateCountdown(time, bonus) {
        if (this.timerPanel.style.display === 'none' || this.waveStatus.style.display !== 'none') this.showCountdownState();
        const secs = Math.ceil(time);
        const secText = secs + 'с';
        if (this.timerValue.textContent !== secText) this.timerValue.textContent = secText;
        const max = this.game.currentWave === 0 ? CONFIG.FIRST_WAVE_TIMER : CONFIG.WAVE_TIMER;
        this.timerBar.style.width = Math.max(0, (time / max) * 100) + '%';
        const bonusText = String(bonus);
        if (this.bonusValue.textContent !== bonusText) this.bonusValue.textContent = bonusText;
    }
    getTowerDetailText(tower) {
        const detailMap = {
            pistol: 'Система: компактный затвор, лёгкий ствол и быстрая подача боеприпаса.',
            machinegun: 'Система: усиленная лента, массивный ствол и узел охлаждения для плотного огня.',
            rifle: 'Система: точный прицельный модуль, устойчивый станок и улучшенный затвор.',
            sniper: 'Система: длинный ствол, ручное наведение по ПКМ, тяжёлая пуля и медленная перезарядка.',
            grenade: 'Система: осколочная камера, дуговой выброс и ударный взрыватель.',
            rocket: 'Система: кассета тяжёлых ракет, разгонный блок и усиленная БЧ.',
            tesla: 'Система: накопители, дуговые катушки и разрядный контур.',
            railgun: 'Система: магнитные рельсы, силовые конденсаторы и ускоряющий канал.',
            flamethrower: 'Система: бак смеси, форсунка давления и воспламеняющий модуль.',
            healer: 'Система: ремонтные дроны, сварочный блок и распределитель энергии.',
            scanner: 'Система: антенная решётка, визор слежения и фильтр маскировки.',
            farm: 'Система: автономная теплица, склад ресурсов и модуль снабжения.',
            cryo: 'Система: крио-камера, холодный контур и распылитель заморозки.',
            pulse: 'Система: импульсный сердечник, кольцевой излучатель и стабилизатор поля.',
            airfield: 'Система: ВПП на 2 клетки, авиамодуль сопровождения и подвес бомб на Ур.3.',
            nukeSilo: 'Система: шахтный стакан, подземный лифт, ручной командный пульт и три уровня боеголовок.',
            lightWall: 'Система: лёгкие бетонные секции, быстрое развёртывание и малая масса.',
            mediumWall: 'Система: усиленный каркас, дорожные крепления и амортизирующий слой.',
            heavyWall: 'Система: тяжёлые бронеплиты, глубокая фиксация и таранный запас прочности.'
        };
        return detailMap[tower.type] || 'Система: полевая сборка с базовыми боевыми и сервисными узлами.';
    }
    getTowerCenterScreenPosition(tower) {
        const canvasRect = this.game.canvas.getBoundingClientRect();
        const wrapperRect = this.canvasWrapper.getBoundingClientRect();
        const scaleX = canvasRect.width / CONFIG.CANVAS_WIDTH;
        const scaleY = canvasRect.height / CONFIG.CANVAS_HEIGHT;
        const screen = this.game.worldToScreen(tower.x, tower.y);
        return {
            x: canvasRect.left - wrapperRect.left + screen.x * scaleX,
            y: canvasRect.top - wrapperRect.top + screen.y * scaleY
        };
    }
    setHudButtonPosition(button, centerX, centerY, areaW, areaH) {
        const margin = 10;
        const width = button.offsetWidth || 96;
        const height = button.offsetHeight || 34;
        let left = Math.max(margin, Math.min(centerX - width / 2, areaW - width - margin));
        let top = Math.max(margin, Math.min(centerY - height / 2, areaH - height - margin));
        if (this.layoutControls) {
            const wrapperRect = this.canvasWrapper.getBoundingClientRect();
            const controlsRect = this.layoutControls.getBoundingClientRect();
            const blocked = {
                left: controlsRect.left - wrapperRect.left - 4,
                top: controlsRect.top - wrapperRect.top - 4,
                right: controlsRect.right - wrapperRect.left + 4,
                bottom: controlsRect.bottom - wrapperRect.top + 4
            };
            const intersects = left < blocked.right && left + width > blocked.left && top < blocked.bottom && top + height > blocked.top;
            if (intersects) {
                top = Math.min(areaH - height - margin, blocked.bottom + 8);
                if (top < blocked.bottom && left < blocked.right) {
                    left = Math.min(areaW - width - margin, blocked.right + 8);
                }
            }
        }
        button.style.left = left + 'px';
        button.style.top = top + 'px';
    }
    getTowerScreenBounds(tower) {
        const canvasRect = this.game.canvas.getBoundingClientRect();
        const wrapperRect = this.canvasWrapper.getBoundingClientRect();
        const scaleX = canvasRect.width / CONFIG.CANVAS_WIDTH;
        const scaleY = canvasRect.height / CONFIG.CANVAS_HEIGHT;
        const bounds = tower.getBounds();
        const topLeft = this.game.worldToScreen(bounds.left, bounds.top);
        const left = canvasRect.left - wrapperRect.left + topLeft.x * scaleX;
        const top = canvasRect.top - wrapperRect.top + topLeft.y * scaleY;
        const width = bounds.width * scaleX;
        const height = bounds.height * scaleY;
        return { left, top, width, height, right: left + width, bottom: top + height };
    }
    hideSiloHud() {
        if (!this.siloHud) return;
        this.siloHud.classList.remove('visible');
        this.siloHud.setAttribute('aria-hidden', 'true');
    }
    hideActionHud() {
        if (this.towerHud) {
            this.towerHud.classList.remove('visible');
            this.towerHud.setAttribute('aria-hidden', 'true');
        }
        this.hideSiloHud();
    }
    positionSiloHud(tower, areaW, areaH) {
        if (!this.siloHudCard) return;
        const margin = 10;
        const gap = 14;
        const bounds = this.getTowerScreenBounds(tower);
        const width = this.siloHudCard.offsetWidth || 248;
        const height = this.siloHudCard.offsetHeight || 228;
        const canvasRect = this.game.canvas.getBoundingClientRect();
        const wrapperRect = this.canvasWrapper.getBoundingClientRect();
        const scaleX = canvasRect.width / CONFIG.CANVAS_WIDTH;
        const scaleY = canvasRect.height / CONFIG.CANVAS_HEIGHT;
        const pathRects = [];
        const towerSafeRect = {
            left: bounds.left - 12,
            top: bounds.top - 12,
            right: bounds.right + 12,
            bottom: bounds.bottom + 12,
        };
        for (let row = 0; row < this.game.getGridRows(); row++) {
            for (let col = 0; col < this.game.getGridCols(); col++) {
                if (!this.game.isPathCell(col, row)) continue;
                const topLeft = this.game.worldToScreen(col * CONFIG.CELL_SIZE, row * CONFIG.CELL_SIZE);
                const bottomRight = this.game.worldToScreen((col + 1) * CONFIG.CELL_SIZE, (row + 1) * CONFIG.CELL_SIZE);
                pathRects.push({
                    left: canvasRect.left - wrapperRect.left + topLeft.x * scaleX,
                    top: canvasRect.top - wrapperRect.top + topLeft.y * scaleY,
                    right: canvasRect.left - wrapperRect.left + bottomRight.x * scaleX,
                    bottom: canvasRect.top - wrapperRect.top + bottomRight.y * scaleY,
                });
            }
        }
        let blocked = null;
        if (this.layoutControls) {
            const controlsRect = this.layoutControls.getBoundingClientRect();
            blocked = {
                left: controlsRect.left - wrapperRect.left - 6,
                top: controlsRect.top - wrapperRect.top - 6,
                right: controlsRect.right - wrapperRect.left + 6,
                bottom: controlsRect.bottom - wrapperRect.top + 6,
            };
        }
        const addSideCandidates = (list, left, topValues, priorityBase) => {
            topValues.forEach((top, index) => list.push({ left, top, priority: priorityBase + index }));
        };
        const addVerticalCandidates = (list, top, leftValues, priorityBase) => {
            leftValues.forEach((left, index) => list.push({ left, top, priority: priorityBase + index }));
        };
        const candidates = [];
        addSideCandidates(candidates, bounds.right + gap, [
            bounds.top + bounds.height / 2 - height / 2,
            bounds.bottom - height,
            bounds.top,
        ], 0);
        addSideCandidates(candidates, bounds.left - width - gap, [
            bounds.top + bounds.height / 2 - height / 2,
            bounds.bottom - height,
            bounds.top,
        ], 10);
        addVerticalCandidates(candidates, bounds.bottom + gap, [
            bounds.left + bounds.width / 2 - width / 2,
            bounds.right - width,
            bounds.left,
        ], 20);
        addVerticalCandidates(candidates, bounds.top - height - gap, [
            bounds.left + bounds.width / 2 - width / 2,
            bounds.right - width,
            bounds.left,
        ], 30);
        const getIntersectionArea = (a, b) => {
            const overlapW = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const overlapH = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            return overlapW * overlapH;
        };
        const scoreCandidate = (candidate) => {
            const clampedLeft = Math.max(margin, Math.min(candidate.left, areaW - width - margin));
            const clampedTop = Math.max(margin, Math.min(candidate.top, areaH - height - margin));
            const overflowLeft = Math.max(0, margin - candidate.left);
            const overflowTop = Math.max(0, margin - candidate.top);
            const overflowRight = Math.max(0, candidate.left + width - (areaW - margin));
            const overflowBottom = Math.max(0, candidate.top + height - (areaH - margin));
            let score = overflowLeft + overflowTop + overflowRight + overflowBottom;
            const candidateRect = {
                left: clampedLeft,
                top: clampedTop,
                right: clampedLeft + width,
                bottom: clampedTop + height,
            };
            const towerOverlapArea = getIntersectionArea(candidateRect, towerSafeRect);
            if (towerOverlapArea > 0) score += 8000 + towerOverlapArea * 0.4;
            let pathArea = 0;
            let pathHits = 0;
            for (const pathRect of pathRects) {
                const overlapArea = getIntersectionArea(candidateRect, pathRect);
                if (overlapArea <= 0) continue;
                pathArea += overlapArea;
                pathHits++;
            }
            if (pathHits > 0) score += 1200 + pathArea * 0.08 + pathHits * 120;
            if (blocked) {
                const intersects = candidateRect.left < blocked.right
                    && candidateRect.right > blocked.left
                    && candidateRect.top < blocked.bottom
                    && candidateRect.bottom > blocked.top;
                if (intersects) score += 180;
            }
            return { score, left: clampedLeft, top: clampedTop };
        };
        const best = candidates
            .map(candidate => {
                const resolved = scoreCandidate(candidate);
                return { candidate, ...resolved };
            })
            .sort((a, b) => a.score - b.score || a.candidate.priority - b.candidate.priority)[0];
        const left = best?.left ?? Math.max(margin, Math.min(bounds.right + gap, areaW - width - margin));
        const top = best?.top ?? Math.max(margin, Math.min(bounds.bottom + gap, areaH - height - margin));
        this.siloHudCard.style.left = left + 'px';
        this.siloHudCard.style.top = top + 'px';
    }
    updateSiloHud(tower, areaW, areaH) {
        if (!this.siloHud || !tower?.isNukeSilo) {
            this.hideSiloHud();
            return;
        }
        const selectedPayload = tower.getSelectedPayloadConfig();
        const totalPayloads = tower.getTotalPayloadCount();
        const pendingLaunch = this.game.manualStrikeRequest?.tower === tower && this.game.manualStrikeRequest.timer > 0;
        let status = `Активна: ${selectedPayload.name}`;
        if (tower.isBusy()) status = tower.getWorkLabel();
        else if (tower.isDisabled()) status = 'СИСТЕМА ОГЛУШЕНА';
        else if (pendingLaunch) status = 'ПОДТВЕРДИ ПУСК ПКМ';
        else if (totalPayloads <= 0) status = 'Арсенал пуст';
        else status = `Готово: ${selectedPayload.name} · ${tower.getPayloadStock(tower.selectedPayload)} шт`;
        this.siloHudStatus.textContent = status;
        this.siloCountTactical.textContent = tower.getPayloadStock('tactical');
        this.siloCountStrategic.textContent = tower.getPayloadStock('strategic');
        this.siloCountTsar.textContent = tower.getPayloadStock('tsar');
        this.siloSelectTactical.classList.toggle('active', tower.selectedPayload === 'tactical');
        this.siloSelectStrategic.classList.toggle('active', tower.selectedPayload === 'strategic');
        this.siloSelectTsar.classList.toggle('active', tower.selectedPayload === 'tsar');
        const canControl = this.game.canControlTower(tower);
        const displayGold = this.game.getDisplayGold();
        this.siloBuyTactical.textContent = `КУПИТЬ МАЛУЮ · ${NUCLEAR_PAYLOADS.tactical.cost}💰`;
        this.siloBuyStrategic.textContent = `КУПИТЬ СТРАТ · ${NUCLEAR_PAYLOADS.strategic.cost}💰`;
        this.siloBuyTsar.textContent = `КУПИТЬ ЦАРЬ · ${NUCLEAR_PAYLOADS.tsar.cost}💰`;
        this.siloSelectTactical.disabled = !canControl;
        this.siloSelectStrategic.disabled = !canControl;
        this.siloSelectTsar.disabled = !canControl;
        this.siloBuyTactical.disabled = !canControl || displayGold < NUCLEAR_PAYLOADS.tactical.cost;
        this.siloBuyStrategic.disabled = !canControl || displayGold < NUCLEAR_PAYLOADS.strategic.cost;
        this.siloBuyTsar.disabled = !canControl || displayGold < NUCLEAR_PAYLOADS.tsar.cost;
        this.siloInfoBtn.textContent = this.infoMode === 'tower' && this.towerInfoPanel.style.display !== 'none' ? 'ЗАКРЫТЬ ИНФО' : 'ИНФО';
        this.siloSellBtn.textContent = `ПРОДАТЬ · ${tower.getSellValue()}💰`;
        this.siloSellBtn.disabled = !canControl;
        this.siloHud.classList.add('visible');
        this.siloHud.setAttribute('aria-hidden', 'false');
        this.positionSiloHud(tower, areaW, areaH);
    }
    getUpgradeableTowerCandidates() {
        const selection = this.game.getSelectedTowerGroup?.() || [];
        const towers = selection.length ? selection : (this.game.selectedTower ? [this.game.selectedTower] : []);
        return towers
            .filter(tower => tower && this.game.canControlTower(tower) && !tower.isNukeSilo && !tower.isBusy() && tower.canUpgrade())
            .sort((a, b) => {
                const costDiff = a.getUpgradeCost() - b.getUpgradeCost();
                if (costDiff !== 0) return costDiff;
                const levelDiff = a.level - b.level;
                if (levelDiff !== 0) return levelDiff;
                const investedDiff = a.totalInvested - b.totalInvested;
                if (investedDiff !== 0) return investedDiff;
                const rowDiff = a.row - b.row;
                if (rowDiff !== 0) return rowDiff;
                return a.col - b.col;
            });
    }
    updateActionHud() {
        const tower = this.game.selectedTower;
        if (!tower || tower.isDestroyed || this.game.selectedTowerType) {
            this.hideActionHud();
            return;
        }
        const areaW = this.canvasWrapper.clientWidth;
        const areaH = this.canvasWrapper.clientHeight;
        const pos = this.getTowerCenterScreenPosition(tower);
        const selectionCount = this.game.getSelectedTowerGroup?.().length || 1;
        const upgradeCandidates = this.getUpgradeableTowerCandidates();
        const nextUpgradeTower = upgradeCandidates[0] || null;
        const canControl = this.game.canControlTower(tower);
        const displayGold = this.game.getDisplayGold();
        if (tower.isNukeSilo && selectionCount <= 1) {
            this.hideActionHud();
            this.updateSiloHud(tower, areaW, areaH);
            return;
        }
        this.hideSiloHud();
        if (nextUpgradeTower) {
            const upgradeCost = nextUpgradeTower.getUpgradeCost();
            const suffix = selectionCount > 1 ? ` · x${upgradeCandidates.length}` : '';
            this.hudUpgradeBtn.textContent = `⬆ ${upgradeCost}💰${suffix}`;
            this.hudUpgradeBtn.disabled = !canControl || displayGold < upgradeCost;
        } else {
            this.hudUpgradeBtn.textContent = '◆ MAX';
            this.hudUpgradeBtn.disabled = true;
        }
        this.hudSellBtn.textContent = `💰 ${tower.getSellValue()}`;
        this.hudSellBtn.disabled = !canControl;
        const infoOpen = this.infoMode === 'tower' && this.towerInfoPanel.style.display !== 'none';
        this.hudInfoBtn.textContent = infoOpen ? '✕ ИНФО' : 'ℹ ИНФО';
        this.hudInfoBtn.disabled = false;
        this.towerHud.classList.add('visible');
        this.towerHud.setAttribute('aria-hidden', 'false');
        this.setHudButtonPosition(this.hudUpgradeBtn, pos.x, pos.y - 56, areaW, areaH);
        this.setHudButtonPosition(this.hudSellBtn, pos.x - 78, pos.y + 36, areaW, areaH);
        this.setHudButtonPosition(this.hudInfoBtn, pos.x + 78, pos.y + 36, areaW, areaH);
    }
    applyLayoutState() {
        this.bodyEl.classList.toggle('ui-hide-top', this.topUiHidden);
        this.bodyEl.classList.toggle('ui-hide-sidebar', this.sidebarHidden);
        this.bodyEl.classList.toggle('ui-map-only', this.mapOnlyActive);
        this.updateLayoutButtons();
        window.dispatchEvent(new Event('resize'));
    }
    updateLayoutButtons() {
        this.layoutTopBtn?.classList.toggle('active', this.topUiHidden || this.mapOnlyActive);
        this.layoutSidebarBtn?.classList.toggle('active', this.sidebarHidden || this.mapOnlyActive);
        this.mapOnlyBtn?.classList.toggle('active', this.mapOnlyActive);
    }
    toggleTopUi() {
        if (this.mapOnlyActive) {
            this.mapOnlyActive = false;
            this.topUiHidden = false;
        } else {
            this.topUiHidden = !this.topUiHidden;
        }
        this.applyLayoutState();
    }
    toggleSidebar() {
        if (this.mapOnlyActive) {
            this.mapOnlyActive = false;
            this.sidebarHidden = false;
        } else {
            this.sidebarHidden = !this.sidebarHidden;
        }
        this.applyLayoutState();
    }
    toggleMapOnly() {
        this.mapOnlyActive = !this.mapOnlyActive;
        this.applyLayoutState();
    }
    ensureSidebarVisible() {
        if (!this.sidebarHidden && !this.mapOnlyActive) return;
        this.sidebarHidden = false;
        this.mapOnlyActive = false;
        this.applyLayoutState();
    }
    cycleSiloPayload(step = 1) {
        const tower = this.game.selectedTower;
        if (!tower || tower.isDestroyed || !tower.isNukeSilo) return;
        const kinds = Object.keys(NUCLEAR_PAYLOADS);
        const index = kinds.indexOf(tower.selectedPayload);
        const nextKind = kinds[(index + step + kinds.length) % kinds.length];
        if (!this.game.selectTowerPayload(tower, nextKind)) return;
        this.updateActionHud();
        if (this.infoMode === 'tower' && this.towerInfoPanel.style.display !== 'none') this.showTowerInfo(tower);
    }
    selectSiloPayload(kind) {
        const tower = this.game.selectedTower;
        if (!tower || tower.isDestroyed || !tower.isNukeSilo) return;
        if (!this.game.selectTowerPayload(tower, kind)) return;
        this.updateActionHud();
        if (this.infoMode === 'tower') this.showTowerInfo(tower);
    }
    buySiloPayload(kind) {
        const tower = this.game.selectedTower;
        if (!tower || tower.isDestroyed || !tower.isNukeSilo) return;
        if (!this.game.buyTowerPayload(tower, kind)) return;
        this.updateGold(this.game.getDisplayGold());
        this.updateActionHud();
        if (this.infoMode === 'tower' && this.towerInfoPanel.style.display !== 'none') this.showTowerInfo(tower);
    }
    upgradeSelectedTower() {
        const tower = this.game.selectedTower;
        if (!tower || tower.isDestroyed) return;
        if (tower.isNukeSilo) {
            this.cycleSiloPayload(1);
            return;
        }
        const upgradeTower = this.getUpgradeableTowerCandidates()[0] || null;
        if (!upgradeTower) return;
        if (!this.game.upgradeTower(upgradeTower)) return;
        this.updateGold(this.game.getDisplayGold());
        if (this.infoMode === 'tower' && tower === upgradeTower) this.showTowerInfo(tower);
        if ((this.game.getSelectedTowerGroup?.().length || 1) > 1) {
            this.game.floatingTexts.push(new FloatingText(upgradeTower.x, upgradeTower.y - 30, `АПГРЕЙД ${upgradeTower.getConfig().name}`, '#22c55e'));
        }
    }
    sellSelectedTower() {
        const tower = this.game.selectedTower;
        if (!tower || tower.isDestroyed) return;
        if (!this.game.sellTower(tower)) return;
        this.updateGold(this.game.getDisplayGold());
        this.hideTowerInfo();
    }
    toggleSelectedTowerInfo() {
        const tower = this.game.selectedTower;
        if (!tower || tower.isDestroyed) return;
        if (this.sidebarHidden || this.mapOnlyActive) {
            this.ensureSidebarVisible();
            this.showTowerInfo(tower);
            return;
        }
        const isOpen = this.infoMode === 'tower' && this.towerInfoPanel.style.display !== 'none';
        if (isOpen) {
            this.hideTowerInfo();
            return;
        }
        this.ensureSidebarVisible();
        this.showTowerInfo(tower);
    }
    showTowerInfo(tower) {
        const cfg = tower.getConfig();
        const busy = tower.isBusy();
        let html = `<h3>${cfg.icon} ${cfg.name} <span class="tower-level">Ур.${tower.level}</span></h3><div class="info-stats">`;
        if (tower.isScanner) { html += `<div>📡 Скан: <strong>${tower.scanRadius}px</strong></div><div>👁 Вижен: <strong>Ур.${tower.invisibleDetectionLevel}</strong></div><div>🛡 HP: <strong>${Math.round(tower.hp)}/${tower.maxHp}</strong></div>`; }
        else if (tower.isHealer) { html += `<div>🔧 Хил: <strong>${tower.healRate} HP/с</strong></div><div>📏 Зона: <strong>${tower.healRadius}px</strong></div><div>🛡 HP: <strong>${Math.round(tower.hp)}/${tower.maxHp}</strong></div>`; }
        else if (tower.isFarm) {
            const fc = this.game.towers.filter(t => t.isFarm && !t.isDestroyed).length;
            html += `<div>🌾 Доход: <strong>${tower.farmIncome}💰/раунд</strong></div><div>🛡 HP: <strong>${Math.round(tower.hp)}/${tower.maxHp}</strong></div><div>🏠 Ферм: <strong>${fc}/${CONFIG.MAX_FARMS}</strong></div>`;
        } else if (tower.isNukeSilo) {
            const selectedPayload = tower.getSelectedPayloadConfig();
            html += `<div>☢ Режим: <strong>ручной пуск</strong></div><div>🌍 Дальность: <strong>без ограничений</strong></div><div>🛡 HP: <strong>${Math.round(tower.hp)}/${tower.maxHp}</strong></div><div>📦 Боеголовок: <strong>${tower.getTotalPayloadCount()}</strong></div><div>🎯 Выбрано: <strong>${selectedPayload.name}</strong></div><div>🖱 Пуск: <strong>${selectedPayload.shortName === 'МАЛАЯ' ? 'ПКМ по врагу' : 'ПКМ по любой точке карты'}</strong></div>`;
        } else if (tower.isManualAim) {
            const manualGroupCount = this.game.getSelectedManualAimTowers?.().length || 1;
            html += `<div>⚔ Урон: <strong>${tower.damage}</strong></div><div>📏 Дальность: <strong>${tower.range}px</strong></div><div>⏱ Перезарядка: <strong>${tower.fireRate}с</strong></div><div>🛡 HP: <strong>${Math.round(tower.hp)}/${tower.maxHp}</strong></div><div>🖱 Режим: <strong>ПКМ по врагу</strong></div><div>👥 Выбрано: <strong>${manualGroupCount}</strong></div>`;
        } else if (tower.isAirfield) {
            html += `<div>⚔ Пули: <strong>${tower.damage}</strong></div><div>🛩 Орбита: <strong>${tower.orbitRadius}px</strong></div><div>🎯 Круг атаки: <strong>${tower.airAttackRadius}px</strong></div><div>⏱ Очередь: <strong>${tower.fireRate}с</strong></div><div>💣 Бомбы: <strong>${tower.rocketDamage > 0 ? ('да, каждые ' + tower.rocketCooldownDuration + 'с') : 'нет'}</strong></div><div>🛡 HP: <strong>${Math.round(tower.hp)}/${tower.maxHp}</strong></div>`;
        } else if (tower.isPulseTower) {
            html += `<div>🌐 Волна: <strong>${tower.range}px</strong></div><div>⚔ Урон волны: <strong>${tower.damage}</strong></div><div>⏱ Частота: <strong>${tower.fireRate}с</strong></div><div>🛡 HP: <strong>${Math.round(tower.hp)}/${tower.maxHp}</strong></div>`;
        } else if (tower.slowFactor < 1) {
            html += `<div>⚔ ${tower.damage}</div><div>📏 ${tower.range}px</div><div>⏱ ${tower.fireRate}с</div><div>🧊 Замедление: <strong>${Math.round((1 - tower.slowFactor) * 100)}%</strong></div><div>⌛ Длительность: <strong>${tower.slowDuration}с</strong></div><div>🛡 ${Math.round(tower.hp)}/${tower.maxHp}</div>`;
        } else if (tower.isWall) {
            html += `<div>🛡 Прочность: <strong>${Math.round(tower.hp)}/${tower.maxHp}</strong></div><div>🛣 Позиция: <strong>Дорога</strong></div><div>⚔ Эффект: <strong>обмен HP в упор</strong></div><div>💥 Удар врага: <strong>по его текущему HP</strong></div>`;
        } else {
            html += `<div>⚔ ${tower.damage}</div><div>📏 ${tower.range}px</div><div>⏱ ${tower.fireRate}с</div><div>🛡 ${Math.round(tower.hp)}/${tower.maxHp}</div>
            ${tower.aoeRadius ? `<div>💥 AoE:${tower.aoeRadius}px</div>` : ''}${tower.chainTargets ? `<div>⚡ Цепь:${tower.chainTargets}</div>` : ''}`;
        }
        html += '</div>';
        if (cfg.damageModifiers) {
            html += `<div class="info-build" style="margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;background:rgba(59,130,246,0.08)">
                <div style="margin-bottom:4px">🎯 УРОН ПО КЛАССАМ</div>
                <div class="info-stats" style="margin-bottom:0">${this.getModifierMarkup(cfg.damageModifiers)}</div>
            </div>`;
        }
        html += `<div class="info-build" style="margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;background:rgba(148,163,184,0.08)">
            <div>🧩 СОСТАВ И УЗЛЫ</div>
            <div style="margin-top:4px;color:#cbd5e1">${this.getTowerDetailText(tower)}</div>
        </div>`;
        if (tower.isNukeSilo) {
            const selectedPayload = tower.getSelectedPayloadConfig();
            html += `<div class="info-build" style="margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;background:rgba(220,38,38,0.08)">
                <div>☢ АРСЕНАЛ</div>
                <div class="info-stats" style="margin-top:6px">
                    <div>🚀 Малая: <strong>${tower.getPayloadStock('tactical')}</strong></div>
                    <div>🛰 Стратег: <strong>${tower.getPayloadStock('strategic')}</strong></div>
                    <div>☢ Царь: <strong>${tower.getPayloadStock('tsar')}</strong></div>
                    <div>🎛 Активна: <strong>${selectedPayload.shortName}</strong></div>
                </div>
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                    <button id="btn-silo-cycle-prev" class="btn-small" type="button">◀</button>
                    <button id="btn-silo-cycle-next" class="btn-small" type="button">▶</button>
                    <button id="btn-silo-load-tactical" class="btn-small" type="button">МАЛАЯ ${NUCLEAR_PAYLOADS.tactical.cost}💰</button>
                    <button id="btn-silo-load-strategic" class="btn-small" type="button">СТРАТ ${NUCLEAR_PAYLOADS.strategic.cost}💰</button>
                    <button id="btn-silo-load-tsar" class="btn-small" type="button">ЦАРЬ ${NUCLEAR_PAYLOADS.tsar.cost}💰</button>
                </div>
                <div style="margin-top:6px;color:#cbd5e1">Малая ракета идёт только по врагу и самонаводится. Стратегическая и Царь-бомба летят в точку, куда ты нажал.</div>
            </div>`;
        }
        html += `<div class="info-build" style="margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;background:${busy ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)'}">
            <div>${busy ? '⏳ ' + tower.getWorkLabel() : '✅ ГОТОВО'}</div>
            <div style="margin-top:4px;color:#cbd5e1">${busy ? 'Осталось: <strong>' + this.fmtTime(tower.getRemainingWorkTime()) + '</strong>' : 'Стройка: <strong>' + this.fmtTime(cfg.buildTime || 0) + '</strong>'}</div>
        </div>`;
        if (!tower.isScanner && !tower.isHealer && !tower.isFarm && !tower.isWall && !tower.isPulseTower && !tower.isNukeSilo && !tower.isManualAim) html += `<div class="info-target">Цель: <button id="btn-target-mode" class="btn-small">${TARGET_MODE_NAMES[tower.targetMode]}</button></div>`;
        html += `<div class="info-build" style="margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;background:rgba(250,204,21,0.08)">
            <div>🎮 БЫСТРЫЕ ДЕЙСТВИЯ</div>
            <div style="margin-top:4px;color:#cbd5e1">Прокачка, продажа и открытие этой карточки доступны прямо вокруг башни на карте. Горячая клавиша улучшения: <strong>${this.hotkeyLabel(this.getUpgradeHotkey())}</strong>.</div>
        </div>`;
        if (tower.isManualAim) {
            html += `<div class="info-build" style="margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;background:rgba(56,189,248,0.08)">
                <div>⌨ ГРУППЫ</div>
                <div style="margin-top:4px;color:#cbd5e1">Двойной клик выделяет все такие башни. Рамка <strong>ЛКМ</strong> выделяет башни в зоне, <strong>Ctrl + цифра</strong> сохраняет группу, цифра вызывает её, а <strong>ПКМ</strong> даёт залп всей группе.</div>
            </div>`;
        }
        if (tower.canUpgrade()) {
            html += `<div class="info-build" style="margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;background:rgba(34,197,94,0.06)">
                <div>⬆ СЛЕД. УЛУЧШЕНИЕ</div>
                <div style="margin-top:4px;color:#cbd5e1">Цена: <strong>${tower.getUpgradeCost()}💰</strong> · Время: <strong>${this.fmtTime(tower.getUpgradeTime())}</strong></div>
            </div>`;
        }
        if (tower.isFortified?.()) {
            html += `<div class="info-build" style="margin-top:8px;padding:8px;border:1px solid rgba(125,211,252,0.22);border-radius:6px;background:rgba(59,130,246,0.1)">
                <div>🛡 БАСТИОН АКТИВЕН</div>
                <div style="margin-top:4px;color:#cbd5e1">Неуязвимость и ускорение стрельбы · Осталось: <strong>${Math.ceil(tower.fortressTimer)}с</strong></div>
            </div>`;
        }
        this.towerInfoPanel.innerHTML = html; this.towerInfoPanel.style.display = 'block'; this.lastTowerInfoKey = this.buildTowerInfoKey(tower);
        this.infoMode = 'tower';
        this.bindActionPress(document.getElementById('btn-target-mode'), () => {
            const i = TARGET_MODES.indexOf(tower.targetMode);
            tower.targetMode = TARGET_MODES[(i + 1) % TARGET_MODES.length];
            document.getElementById('btn-target-mode').textContent = TARGET_MODE_NAMES[tower.targetMode];
        });
        this.bindActionPress(document.getElementById('btn-silo-cycle-prev'), () => this.cycleSiloPayload(-1));
        this.bindActionPress(document.getElementById('btn-silo-cycle-next'), () => this.cycleSiloPayload(1));
        this.bindActionPress(document.getElementById('btn-silo-load-tactical'), () => this.buySiloPayload('tactical'));
        this.bindActionPress(document.getElementById('btn-silo-load-strategic'), () => this.buySiloPayload('strategic'));
        this.bindActionPress(document.getElementById('btn-silo-load-tsar'), () => this.buySiloPayload('tsar'));
    }
    showEnemyInfo(enemy) {
        this.ensureSidebarVisible();
        const profile = this.getEnemyProfile(enemy);
        const hpPercent = Math.max(0, Math.round(enemy.hp / enemy.maxHp * 100));
        const currentBaseDamage = getEnemyBaseDamage(enemy);
        const className = this.getUnitClassName(enemy.unitClass, true);
        const invisibility = enemy.isInvisible ? `Ур.${enemy.invisibilityLevel || 1}` : 'Нет';
        let html = `<h3>🧟 ${enemy.name} <span class="tower-level">${className}</span></h3><div class="info-stats">`;
        html += `<div>❤️ HP: <strong>${Math.round(enemy.hp)}/${enemy.maxHp}</strong></div>`;
        html += `<div>📊 Класс: <strong>${className}</strong></div>`;
        html += `<div>🏃 Скорость: <strong>${enemy.baseSpeed}</strong></div>`;
        html += `<div>💥 Урон базе сейчас: <strong>${currentBaseDamage}</strong></div>`;
        html += `<div>💰 Награда: <strong>${enemy.reward}</strong></div>`;
        html += `<div>👁 Статус: <strong>${enemy.isInvisible ? 'Невидимый' : 'Видимый'}</strong></div>`;
        html += `<div>🫥 Скрытность: <strong>${invisibility}</strong></div>`;
        html += `<div>📏 Рост: <strong>${profile.heightCm} см</strong></div>`;
        html += `<div>⚖ Масса: <strong>${profile.weightKg} кг</strong></div>`;
        html += `<div>☣ Тип угрозы: <strong>${profile.threat}</strong></div>`;
        html += `<div>🫀 HP %: <strong>${hpPercent}%</strong></div>`;
        html += `<div>🧠 Логика: <strong>по текущему HP</strong></div>`;
        if (enemy.stunTimer > 0) html += `<div>❄ Стан: <strong>${enemy.stunTimer.toFixed(1)}с</strong></div>`;
        if (enemy.canAttackTowers) {
            html += `<div>🛠 Урон по башне: <strong>${enemy.towerAttackDamage}</strong></div>`;
            html += `<div>📡 Радиус атаки: <strong>${enemy.towerAttackRange}px</strong></div>`;
            html += `<div>⏱ Перезарядка: <strong>${enemy.towerAttackRate}с</strong></div>`;
        }
        if (enemy.skyAttackEnabled) {
            html += `<div>☄ Небесный удар: <strong>${enemy.skyAttackDamage}</strong></div>`;
            html += `<div>💥 Радиус удара: <strong>${enemy.skyAttackRadius}px</strong></div>`;
            html += `<div>⏱ Интервал: <strong>${enemy.skyAttackInterval}с</strong></div>`;
        }
        if (enemy.disablePulseEnabled) {
            html += `<div>🌀 Глушащая волна: <strong>${enemy.disablePulseRadius}px</strong></div>`;
            html += `<div>⛔ Стан башен: <strong>${enemy.disablePulseDuration.toFixed(1)}с</strong></div>`;
        }
        if (enemy.isBoss) {
            html += `<div>👑 Стадия босса: <strong>${enemy.bossStage}</strong></div>`;
            html += `<div>🧬 Архетип: <strong>${enemy.bossPersona || 'аномалия'}</strong></div>`;
        }
        html += '</div>';
        html += `<div class="info-build" style="margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;background:rgba(239,68,68,0.09)">
            <div>🔍 ЦЕЛЬ ВЫБРАНА</div>
            <div style="margin-top:4px;color:#cbd5e1">Наведи на врага, чтобы быстро посмотреть класс и HP. Клик показывает полную карточку.</div>
        </div>`;
        this.towerInfoPanel.innerHTML = html;
        this.towerInfoPanel.style.display = 'block';
        this.lastTowerInfoKey = this.buildEnemyInfoKey(enemy);
        this.infoMode = 'enemy';
    }
    hideTowerInfo() { this.towerInfoPanel.style.display = 'none'; this.towerInfoPanel.innerHTML = ''; this.lastTowerInfoKey = ''; this.infoMode = ''; }
    showGameOver(won) {
        this.overlayEl.style.display = 'flex';
        this.overlayTitle.textContent = won ? '🏆 ПОБЕДА' : '💀 ПОРАЖЕНИЕ';
        this.overlayTitle.style.color = won ? '#22c55e' : '#ef4444';
        this.overlayMessage.textContent = won ? `Все ${CONFIG.TOTAL_WAVES} волн пережиты!` : 'Зомби прорвались к базе...';
        if (this.overlayBtn) this.overlayBtn.textContent = '🔄 ИГРАТЬ СНОВА';
    }
    showSessionEnded(message) {
        this.overlayEl.style.display = 'flex';
        this.overlayTitle.textContent = 'CO-OP ЗАВЕРШЕН';
        this.overlayTitle.style.color = '#f97316';
        this.overlayMessage.textContent = message || 'Игрок вышел, поэтому игра закончена';
        if (this.overlayBtn) this.overlayBtn.textContent = '⌂ В МЕНЮ';
    }
    hideGameOver() { this.overlayEl.style.display = 'none'; }
    reset(startInMenu = false) {
        this.updateGold(this.game.getDisplayGold()); this.updateLives(this.game.lives); this.updateWave(this.game.currentWave);
        this.showCountdownState(); this.hideTowerInfo(); this.hideGameOver(); this.deselectAllTowerButtons();
        this.pauseBtn.textContent = '▮▮ ПАУЗА'; this.speedBtn.textContent = '▶ x1';
        this.game.selectedTowerType = null; this.game.selectedTower = null; this.game.selectedTowers = []; this.game.controlGroups = {}; this.topUiHidden = false; this.sidebarHidden = false; this.mapOnlyActive = false;
        this.lastTowerInfoKey = ''; this.applyLayoutState(); this.hideActionHud(); this.hideSettingsPanel(); this.updateTowerButtons(); this.updateAbilityBar(); this.updateTestAccessState(); this.applyMultiplayerRoleState();
        if (startInMenu) this.showStartScreen(this.game.selectedMapId);
        else this.hideStartScreen();
    }
}
