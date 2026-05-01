const HOTKEY_STORAGE_KEY = 'td-custom-hotkeys-v1';
const DEFAULT_BUILD_HOTKEYS = {
    lightWall: 'KeyQ',
    mediumWall: 'KeyW',
    heavyWall: 'KeyE',
    pistol: 'KeyA',
    machinegun: 'KeyS',
    farm: 'KeyD',
    factory: 'KeyI',
    djBooth: 'KeyO',
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
