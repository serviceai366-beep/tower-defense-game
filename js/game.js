            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-size * 0.76, -size * 0.46, size * 1.52, size * 0.14);
            ctx.fillRect(-size * 0.76, size * 0.32, size * 1.52, size * 0.14);
        }
        ctx.fillStyle = '#111827';
        ctx.fillRect(-size * 0.58, -size * 0.5, size * 0.28, size * 0.18);
        ctx.fillRect(size * 0.3, -size * 0.5, size * 0.28, size * 0.18);
        ctx.fillRect(-size * 0.58, size * 0.32, size * 0.28, size * 0.18);
        ctx.fillRect(size * 0.3, size * 0.32, size * 0.28, size * 0.18);
        if (this.hitFlash > 0) {
            ctx.fillStyle = `rgba(250,204,21,${this.hitFlash})`;
            ctx.beginPath();
            ctx.arc(size * 0.75, 0, size * 0.35, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        if (this.hp < this.maxHp) {
            const w = 34, h = 4, r = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(this.x - w / 2, this.y - size - 10, w, h);
            ctx.fillStyle = r > 0.45 ? '#22c55e' : '#f59e0b';
            ctx.fillRect(this.x - w / 2, this.y - size - 10, w * r, h);
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;
        this.selectedMapId = DEFAULT_MAP_ID;
        this.selectedDifficultyId = DEFAULT_DIFFICULTY_ID;
        this.map = new GameMap(this.selectedMapId);
        this.waveManager = new WaveManager(this);
        this.enemies = []; this.towers = []; this.projectiles = []; this.vehicles = [];
        this.skyStrikes = [];
        this.effects = []; this.floatingTexts = [];
        this.gold = CONFIG.START_GOLD; this.playerGold = { p1: CONFIG.START_GOLD, p2: CONFIG.START_GOLD }; this.lives = CONFIG.START_LIVES;
        this.currentWave = 0; this.maxWaveReached = 0;
        this.gameState = 'menu';
        this.snapshotVersion = 0;
        this.lastVisibleGold = null;
        this.towerPlacementSignature = '';
        this.waveCountdown = CONFIG.FIRST_WAVE_TIMER;
        this.waveSpawningDone = false;
        this.selectedTowerType = null; this.selectedTower = null; this.selectedTowers = []; this.controlGroups = {}; this.selectedEnemy = null; this.hoveredEnemy = null; this.hoveredTower = null;
        this.isPaused = false; this.gameSpeed = 1; this.multiplayer = null;
        this.mouseX = 0; this.mouseY = 0; this.mouseScreenX = 0; this.mouseScreenY = 0; this.hoveredCell = null; this.lastTime = 0;
        this.cameraX = 0; this.cameraY = 0;
        this.pointerInsideCanvas = false;
        this.largeMapOverlayOpen = false;
        this.isRightMouseDown = false;
        this.isCameraDragging = false;
        this.rightDragStartScreenX = 0;
        this.rightDragStartScreenY = 0;
        this.rightDragLastScreenX = 0;
        this.rightDragLastScreenY = 0;
        this.rightDragDistance = 0;
        this.isMiniMapDragging = false;
        this.miniMapDragOffsetX = 0;
        this.miniMapDragOffsetY = 0;
        this.isLeftMouseDown = false;
        this.isSelectionDragging = false;
        this.selectionDragStartScreenX = 0;
        this.selectionDragStartScreenY = 0;
        this.selectionDragCurrentScreenX = 0;
        this.selectionDragCurrentScreenY = 0;
        this.selectionDragAdditive = false;
        this.suppressCanvasClick = false;
        this.baseHitFlash = 0;
        this.bossIntroTimer = 0;
        this.bossIntroName = '';
        this.bossIntroColor = '#ef4444';
        this.activeBoss = null;
        this.manualStrikeRequest = null;
        this.selectedAbilityKind = null;
        this.matchElapsed = 0;
        this.abilityStates = {};
        this.abilityStrikes = [];
        this.initAbilityStates();
        this.devModeAvailable = new URLSearchParams(window.location.search).get('dev') === '1';
        this.testModeEnabled = false;
        this.audio = new AudioManager();
        window.audio = this.audio;
        this.ui = new UI(this);
        this.setupCanvasEvents();
        this.setupResize();
        document.addEventListener('click', () => { this.audio.ensureCtx(); if (!this.audio.musicPlaying && !this.audio.musicMuted) this.audio.startMusic(); }, { once: true });
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    setupResize() {
        const resize = () => {
            const wr = document.getElementById('canvas-wrapper');
            if (!wr) return;
            const ww = wr.clientWidth, wh = wr.clientHeight;
            const ar = CONFIG.CANVAS_WIDTH / CONFIG.CANVAS_HEIGHT;
            let w, h;
            if (ww / wh > ar) { w = ww; h = w / ar; } else { h = wh; w = h * ar; }
            this.canvas.style.width = Math.floor(w) + 'px';
            this.canvas.style.height = Math.floor(h) + 'px';
        };
        window.addEventListener('resize', resize);
        setTimeout(resize, 50);
        resize();
    }
    getGridCols() { return this.map?.preset?.cols || CONFIG.GRID_COLS; }
    getGridRows() { return this.map?.preset?.rows || CONFIG.GRID_ROWS; }
    getWorldWidth() { return this.map?.worldWidth || (this.getGridCols() * CONFIG.CELL_SIZE); }
    getWorldHeight() { return this.map?.worldHeight || (this.getGridRows() * CONFIG.CELL_SIZE); }
    hasScrollableMap() { return this.getWorldWidth() > CONFIG.CANVAS_WIDTH || this.getWorldHeight() > CONFIG.CANVAS_HEIGHT; }
    clampCamera() {
        this.cameraX = Math.max(0, Math.min(this.cameraX, Math.max(0, this.getWorldWidth() - CONFIG.CANVAS_WIDTH)));
        this.cameraY = Math.max(0, Math.min(this.cameraY, Math.max(0, this.getWorldHeight() - CONFIG.CANVAS_HEIGHT)));
    }
    centerCameraOnWorld(x, y) {
        this.cameraX = x - CONFIG.CANVAS_WIDTH / 2;
        this.cameraY = y - CONFIG.CANVAS_HEIGHT / 2;
        this.clampCamera();
    }
    resetCameraToMap() {
        if (!this.hasScrollableMap()) {
            this.cameraX = 0;
            this.cameraY = 0;
            return;
        }
        const start = this.map?.preset?.waypoints?.[1] || this.map?.preset?.waypoints?.[0] || { x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 };
        this.centerCameraOnWorld(start.x, start.y);
    }
    screenToWorld(x, y) {
        return { x: x + this.cameraX, y: y + this.cameraY };
    }
    worldToScreen(x, y) {
        return { x: x - this.cameraX, y: y - this.cameraY };
    }
    getViewportWorldRect() {
        return { x: this.cameraX, y: this.cameraY, width: CONFIG.CANVAS_WIDTH, height: CONFIG.CANVAS_HEIGHT };
    }
    getViewportCenterWorld() {
        return { x: this.cameraX + CONFIG.CANVAS_WIDTH / 2, y: this.cameraY + CONFIG.CANVAS_HEIGHT / 2 };
    }
    updateCamera(dt) {}
    getMiniMapRect() {
        if (!this.hasScrollableMap()) return null;
        return {
            x: 14,
            y: CONFIG.CANVAS_HEIGHT - 116 - 14,
            width: 192,
            height: 116,
        };
    }
    getMiniMapViewportRect() {
        const rect = this.getMiniMapRect();
        if (!rect) return null;
        const view = this.getViewportWorldRect();
        return {
            x: rect.x + (view.x / this.getWorldWidth()) * rect.width,
            y: rect.y + (view.y / this.getWorldHeight()) * rect.height,
            width: (view.width / this.getWorldWidth()) * rect.width,
            height: (view.height / this.getWorldHeight()) * rect.height,
        };
    }
    centerCameraFromMiniMap(screenX, screenY, clampToBounds = false) {
        const rect = this.getMiniMapRect();
        if (!rect) return false;
        if (!clampToBounds && (screenX < rect.x || screenX > rect.x + rect.width || screenY < rect.y || screenY > rect.y + rect.height)) return false;
        const clampedX = Math.max(rect.x, Math.min(screenX, rect.x + rect.width));
        const clampedY = Math.max(rect.y, Math.min(screenY, rect.y + rect.height));
        const worldX = ((clampedX - rect.x) / rect.width) * this.getWorldWidth();
        const worldY = ((clampedY - rect.y) / rect.height) * this.getWorldHeight();
        this.centerCameraOnWorld(worldX, worldY);
        return true;
    }
    getSelectionCenterWorld(towers = null) {
        const group = (towers || this.getSelectedTowerGroup()).filter(t => t && !t.isDestroyed);
        if (!group.length) return this.getViewportCenterWorld();
        let totalX = 0, totalY = 0;
        for (const tower of group) {
            totalX += tower.x;
            totalY += tower.y;
        }
        return { x: totalX / group.length, y: totalY / group.length };
    }
    normalizeControlGroups() {
        for (const key of Object.keys(this.controlGroups)) {
            this.controlGroups[key] = (this.controlGroups[key] || []).filter(t => this.towers.includes(t) && !t.isDestroyed);
            if (!this.controlGroups[key].length) delete this.controlGroups[key];
        }
    }
    getSelectedTowerGroup() {
        const valid = (this.selectedTowers || []).filter(t => this.towers.includes(t) && !t.isDestroyed);
        const selectedValid = this.selectedTower && this.towers.includes(this.selectedTower) && !this.selectedTower.isDestroyed;
        if (selectedValid && !valid.includes(this.selectedTower)) valid.unshift(this.selectedTower);
        this.selectedTowers = valid;
        this.selectedTower = valid.includes(this.selectedTower) ? this.selectedTower : (valid[0] || null);
        return valid;
    }
    clearTowerSelection(hideInfo = true) {
        this.selectedTower = null;
        this.selectedTowers = [];
        this.selectedEnemy = null;
        if (hideInfo) this.ui.hideTowerInfo();
    }
    selectTowerGroup(towers, primary = null, showInfo = false) {
        const valid = (towers || []).filter((tower, index, list) => tower && this.towers.includes(tower) && !tower.isDestroyed && list.indexOf(tower) === index);
        this.selectedEnemy = null;
        this.selectedTowers = valid;
        this.selectedTower = primary && valid.includes(primary) ? primary : (valid[0] || null);
        if (!this.selectedTower) {
            this.selectedTowers = [];
            if (showInfo) this.ui.hideTowerInfo();
            return false;
        }
        if (showInfo) this.ui.showTowerInfo(this.selectedTower);
        else this.ui.hideTowerInfo();
        return true;
    }
    selectSingleTower(tower, showInfo = false) {
        return this.selectTowerGroup(tower ? [tower] : [], tower, showInfo);
    }
    selectAllTowersOfType(type, preferredTower = null) {
        const towers = this.towers.filter(t => !t.isDestroyed && t.type === type);
        if (!towers.length) return false;
        const primary = preferredTower && towers.includes(preferredTower) ? preferredTower : towers[0];
        this.selectTowerGroup(towers, primary, false);
        const center = this.getSelectionCenterWorld(towers);
        this.floatingTexts.push(new FloatingText(center.x, center.y - 30, `ВЫБРАНО x${towers.length}`, '#60a5fa'));
        return true;
    }
    assignControlGroup(key, additive = false) {
        const towers = this.getSelectedTowerGroup();
        if (!towers.length) return false;
        const nextGroup = additive
            ? [...(this.controlGroups[key] || []), ...towers].filter((tower, index, list) => tower && !tower.isDestroyed && list.indexOf(tower) === index)
            : [...towers];
        this.controlGroups[key] = nextGroup;
        const center = this.getSelectionCenterWorld(towers);
        const label = additive ? `ДОБАВЛЕНО В ${key} · x${nextGroup.length}` : `ГРУППА ${key} · x${nextGroup.length}`;
        this.floatingTexts.push(new FloatingText(center.x, center.y - 30, label, '#facc15'));
        return true;
    }
    recallControlGroup(key) {
        this.normalizeControlGroups();
        const towers = this.controlGroups[key] || [];
        if (!towers.length) return false;
        this.selectedTowerType = null;
        this.ui.deselectAllTowerButtons();
        this.selectTowerGroup(towers, towers[0], false);
        const center = this.getSelectionCenterWorld(towers);
