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
        this.enemies = []; this.towers = []; this.projectiles = [];
        this.skyStrikes = [];
        this.effects = []; this.floatingTexts = [];
        this.gold = CONFIG.START_GOLD; this.playerGold = { p1: CONFIG.START_GOLD, p2: CONFIG.START_GOLD }; this.lives = CONFIG.START_LIVES;
        this.currentWave = 0; this.maxWaveReached = 0;
        this.gameState = 'menu';
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
        this.floatingTexts.push(new FloatingText(center.x, center.y - 30, `ГРУППА ${key}`, '#38bdf8'));
        return true;
    }
    removeTowerFromSelections(tower) {
        this.selectedTowers = (this.selectedTowers || []).filter(t => t !== tower && this.towers.includes(t) && !t.isDestroyed);
        if (this.selectedTower === tower) this.selectedTower = this.selectedTowers[0] || null;
        this.normalizeControlGroups();
        if (!this.selectedTower && !this.selectedTowers.length) this.ui.hideTowerInfo();
    }
    getSelectedManualAimTowers() {
        const towers = this.getSelectedTowerGroup();
        if (!towers.length || !this.selectedTower?.isManualAim) return [];
        return towers.filter(t => t.isManualAim);
    }
    getSelectionDragRect() {
        if (!this.isSelectionDragging) return null;
        const left = Math.min(this.selectionDragStartScreenX, this.selectionDragCurrentScreenX);
        const top = Math.min(this.selectionDragStartScreenY, this.selectionDragCurrentScreenY);
        const right = Math.max(this.selectionDragStartScreenX, this.selectionDragCurrentScreenX);
        const bottom = Math.max(this.selectionDragStartScreenY, this.selectionDragCurrentScreenY);
        return { left, top, right, bottom, width: right - left, height: bottom - top };
    }
    getTowersInScreenRect(rect) {
        if (!rect) return [];
        const towers = [];
        for (const tower of this.towers) {
            if (tower.isDestroyed) continue;
            const bounds = tower.getBounds();
            const left = bounds.left - this.cameraX;
            const top = bounds.top - this.cameraY;
            const right = left + bounds.width;
            const bottom = top + bounds.height;
            if (right < rect.left || left > rect.right || bottom < rect.top || top > rect.bottom) continue;
            towers.push(tower);
        }
        return towers;
    }
    applySelectionDrag() {
        const rect = this.getSelectionDragRect();
        if (!rect || rect.width < 8 || rect.height < 8) return false;
        const draggedTowers = this.getTowersInScreenRect(rect);
        if (!draggedTowers.length) {
            if (!this.selectionDragAdditive) this.clearTowerSelection(true);
            return false;
        }
        const nextSelection = this.selectionDragAdditive
            ? [...this.getSelectedTowerGroup(), ...draggedTowers]
            : draggedTowers;
        this.selectTowerGroup(nextSelection, draggedTowers[0], false);
        const center = this.getSelectionCenterWorld(nextSelection);
        this.floatingTexts.push(new FloatingText(center.x, center.y - 30, `ВЫДЕЛЕНО x${this.getSelectedTowerGroup().length}`, '#60a5fa'));
        return true;
    }
    setupCanvasEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            const r = this.canvas.getBoundingClientRect();
            const screenX = (e.clientX - r.left) * (CONFIG.CANVAS_WIDTH / r.width);
            const screenY = (e.clientY - r.top) * (CONFIG.CANVAS_HEIGHT / r.height);
            if (e.button === 0 && !this.largeMapOverlayOpen) {
                const miniRect = this.getMiniMapRect();
                const viewRect = this.getMiniMapViewportRect();
                if (miniRect && screenX >= miniRect.x && screenX <= miniRect.x + miniRect.width && screenY >= miniRect.y && screenY <= miniRect.y + miniRect.height) {
                    if (viewRect && screenX >= viewRect.x && screenX <= viewRect.x + viewRect.width && screenY >= viewRect.y && screenY <= viewRect.y + viewRect.height) {
                        this.isMiniMapDragging = true;
                        this.miniMapDragOffsetX = screenX - (viewRect.x + viewRect.width / 2);
                        this.miniMapDragOffsetY = screenY - (viewRect.y + viewRect.height / 2);
                        this.hoveredCell = null;
                        this.hoveredEnemy = null;
                        this.hoveredTower = null;
                    }
                    return;
                }
                if (!this.selectedTowerType && !this.selectedAbilityKind) {
                    this.isLeftMouseDown = true;
                    this.isSelectionDragging = false;
                    this.selectionDragStartScreenX = screenX;
                    this.selectionDragStartScreenY = screenY;
                    this.selectionDragCurrentScreenX = screenX;
                    this.selectionDragCurrentScreenY = screenY;
                    this.selectionDragAdditive = !!e.ctrlKey;
                }
            }
            if (e.button !== 2 || !this.hasScrollableMap()) return;
            this.isRightMouseDown = true;
            this.isCameraDragging = false;
            this.rightDragDistance = 0;
            this.rightDragStartScreenX = screenX;
            this.rightDragStartScreenY = screenY;
            this.rightDragLastScreenX = this.rightDragStartScreenX;
            this.rightDragLastScreenY = this.rightDragStartScreenY;
        });
        this.canvas.addEventListener('mousemove', (e) => {
            const r = this.canvas.getBoundingClientRect();
            this.pointerInsideCanvas = true;
            this.mouseScreenX = (e.clientX - r.left) * (CONFIG.CANVAS_WIDTH / r.width);
            this.mouseScreenY = (e.clientY - r.top) * (CONFIG.CANVAS_HEIGHT / r.height);
            if (this.isMiniMapDragging && !this.largeMapOverlayOpen) {
                this.centerCameraFromMiniMap(this.mouseScreenX - this.miniMapDragOffsetX, this.mouseScreenY - this.miniMapDragOffsetY, true);
                return;
            }
            if (this.isLeftMouseDown && !this.selectedTowerType && !this.selectedAbilityKind && !this.largeMapOverlayOpen) {
                this.selectionDragCurrentScreenX = this.mouseScreenX;
                this.selectionDragCurrentScreenY = this.mouseScreenY;
                if (!this.isSelectionDragging) {
                    const dragDistance = Math.hypot(this.mouseScreenX - this.selectionDragStartScreenX, this.mouseScreenY - this.selectionDragStartScreenY);
                    if (dragDistance > 8) {
                        this.isSelectionDragging = true;
                        this.hoveredCell = null;
                        this.hoveredEnemy = null;
                        this.hoveredTower = null;
                    }
                }
                if (this.isSelectionDragging) return;
            }
            if (this.isRightMouseDown && this.hasScrollableMap() && !this.largeMapOverlayOpen) {
                const dx = this.mouseScreenX - this.rightDragLastScreenX;
                const dy = this.mouseScreenY - this.rightDragLastScreenY;
                this.rightDragDistance += Math.hypot(this.mouseScreenX - this.rightDragLastScreenX, this.mouseScreenY - this.rightDragLastScreenY);
                if (this.rightDragDistance > 4) this.isCameraDragging = true;
                if (this.isCameraDragging) {
                    this.cameraX -= dx;
                    this.cameraY -= dy;
                    this.clampCamera();
                }
                this.rightDragLastScreenX = this.mouseScreenX;
                this.rightDragLastScreenY = this.mouseScreenY;
            }
            const world = this.screenToWorld(this.mouseScreenX, this.mouseScreenY);
            this.mouseX = world.x;
            this.mouseY = world.y;
            const col = Math.floor(world.x / CONFIG.CELL_SIZE), row = Math.floor(world.y / CONFIG.CELL_SIZE);
            this.hoveredCell = (col >= 0 && col < this.getGridCols() && row >= 0 && row < this.getGridRows()) ? { col, row } : null;
            this.hoveredTower = this.getTowerAtPoint(world.x, world.y);
            this.hoveredEnemy = this.hoveredTower ? null : this.getEnemyAt(world.x, world.y);
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.pointerInsideCanvas = false;
            this.hoveredCell = null;
            this.hoveredEnemy = null;
            this.hoveredTower = null;
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isLeftMouseDown = false;
                if (this.isMiniMapDragging) {
                    this.suppressCanvasClick = true;
                    setTimeout(() => { this.suppressCanvasClick = false; }, 0);
                }
                if (this.isSelectionDragging) {
                    this.applySelectionDrag();
                    this.suppressCanvasClick = true;
                    setTimeout(() => { this.suppressCanvasClick = false; }, 0);
                }
                this.isMiniMapDragging = false;
                this.miniMapDragOffsetX = 0;
                this.miniMapDragOffsetY = 0;
                this.isSelectionDragging = false;
                return;
            }
            if (e.button === 2) {
                this.isRightMouseDown = false;
                this.isCameraDragging = false;
                this.rightDragDistance = 0;
            }
        });
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'menu' || this.gameState === 'won' || this.gameState === 'lost') return;
            if (this.suppressCanvasClick) {
                this.suppressCanvasClick = false;
                return;
            }
            const r = this.canvas.getBoundingClientRect();
            const screenX = (e.clientX - r.left) * (CONFIG.CANVAS_WIDTH / r.width);
            const screenY = (e.clientY - r.top) * (CONFIG.CANVAS_HEIGHT / r.height);
            if (this.largeMapOverlayOpen) {
                this.handleLargeMapOverlayClick(screenX, screenY);
                return;
            }
            if (this.centerCameraFromMiniMap(screenX, screenY)) return;
            const world = this.screenToWorld(screenX, screenY);
            const x = world.x;
            const y = world.y;
            const col = Math.floor(x / CONFIG.CELL_SIZE);
            const row = Math.floor(y / CONFIG.CELL_SIZE);
            const clickedTower = this.getTowerAtPoint(x, y);
            const enemy = clickedTower ? null : this.getEnemyAt(x, y);
            const inGrid = col >= 0 && col < this.getGridCols() && row >= 0 && row < this.getGridRows();
            this.clearManualStrikeRequest();
            if (this.selectedAbilityKind) {
                this.handleAbilityClick(x, y, clickedTower);
                return;
            }
            if (this.selectedTowerType) {
                const placement = inGrid ? this.resolvePlacementAnchor(this.selectedTowerType, x, y, col, row) : null;
                if (placement) this.tryPlaceTower(placement.col, placement.row);
                return;
            }
            if (clickedTower) {
                this.selectSingleTower(clickedTower, false);
                return;
            }
            if (enemy) {
                this.selectedEnemy = enemy; this.selectedTower = null; this.selectedTowers = [];
                this.ui.showEnemyInfo(enemy);
                return;
            }
            if (!inGrid) return;
            else {
                const t = this.getTowerAt(col, row);
                if (t) {
                    this.selectSingleTower(t, false);
                } else {
                    this.clearTowerSelection(true);
                }
            }
        });
        this.canvas.addEventListener('dblclick', (e) => {
            if (this.gameState === 'menu' || this.gameState === 'won' || this.gameState === 'lost' || this.selectedTowerType || this.largeMapOverlayOpen) return;
            const r = this.canvas.getBoundingClientRect();
            const screenX = (e.clientX - r.left) * (CONFIG.CANVAS_WIDTH / r.width);
            const screenY = (e.clientY - r.top) * (CONFIG.CANVAS_HEIGHT / r.height);
            const world = this.screenToWorld(screenX, screenY);
            const clickedTower = this.getTowerAtPoint(world.x, world.y);
            if (!clickedTower || clickedTower.isDestroyed) return;
            this.selectAllTowersOfType(clickedTower.type, clickedTower);
        });
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.gameState === 'menu' || this.gameState === 'won' || this.gameState === 'lost') return;
            const r = this.canvas.getBoundingClientRect();
            if (this.largeMapOverlayOpen) {
                this.largeMapOverlayOpen = false;
                return;
            }
            if (this.isCameraDragging || this.rightDragDistance > 4) {
                this.isRightMouseDown = false;
                this.isCameraDragging = false;
                this.rightDragDistance = 0;
                return;
            }
            if (this.selectedAbilityKind) {
                this.clearSelectedAbility();
                return;
            }
            const screenX = (e.clientX - r.left) * (CONFIG.CANVAS_WIDTH / r.width);
            const screenY = (e.clientY - r.top) * (CONFIG.CANVAS_HEIGHT / r.height);
            const world = this.screenToWorld(screenX, screenY);
            const x = world.x;
            const y = world.y;
            const enemy = this.getEnemyAt(x, y);
            if (this.getSelectedManualAimTowers().length > 0) {
                if (enemy) {
                    this.handleManualSniperContext(enemy);
                    return;
                }
                return;
            }
            if (this.selectedTower?.isNukeSilo) {
                this.handleManualStrikeContext(x, y, enemy);
                return;
            }
            this.selectedTowerType = null; this.clearTowerSelection(true); this.ui.deselectAllTowerButtons();
        });
        window.addEventListener('keydown', (e) => {
            const digitMatch = /^Digit([0-9])$/.exec(e.code || '');
            const digitKey = digitMatch ? digitMatch[1] : null;
            const isDigit = !!digitKey;
            if (isDigit && this.gameState !== 'menu' && this.gameState !== 'won' && this.gameState !== 'lost') {
                if (e.ctrlKey) {
                    if (this.assignControlGroup(digitKey, false)) e.preventDefault();
                    return;
                }
                if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    if (this.assignControlGroup(digitKey, true)) e.preventDefault();
                    return;
                }
                if (!e.altKey && !e.metaKey && !e.shiftKey) {
                    if (this.recallControlGroup(digitKey)) e.preventDefault();
                    return;
                }
            }
            if (e.key.toLowerCase() !== 'm' || !this.hasScrollableMap() || this.gameState === 'menu') return;
            this.largeMapOverlayOpen = !this.largeMapOverlayOpen;
        });
    }
    isTowerUnlocked(type) { return this.testModeEnabled || this.maxWaveReached >= TOWER_TYPES[type].unlockWave; }
    isPathCell(col, row) { return this.map.preset.grid[row]?.[col] === 1; }
    getDifficultyConfig() {
        return DIFFICULTY_LEVELS[this.selectedDifficultyId] || DIFFICULTY_LEVELS[DEFAULT_DIFFICULTY_ID];
    }
    setMultiplayerAdapter(adapter) { this.multiplayer = adapter || null; }
    isRoomActive() { return !!this.multiplayer?.isRoomActive?.(); }
    isCoopActive() { return !!this.multiplayer?.isCoopActive?.(); }
    isRemoteViewer() { return !!this.multiplayer?.isGuest?.(); }
    isHostPlayer() { return this.isRoomActive() && !this.isRemoteViewer(); }
    getLocalPlayerKey() { return this.multiplayer?.getLocalPlayerKey?.() || 'p1'; }
    getDisplayGold() { return this.isRoomActive() ? (this.playerGold[this.getLocalPlayerKey()] ?? 0) : this.gold; }
    syncVisibleGold() { this.ui.updateGold(this.getDisplayGold()); }
    canControlTower(tower, playerKey = this.getLocalPlayerKey()) {
        return !!tower && !tower.isDestroyed && (!this.isRoomActive() || (tower.ownerId || 'p1') === playerKey);
    }
    getFarmCountForPlayer(playerKey = this.getLocalPlayerKey()) {
        return this.towers.filter(t => t.isFarm && !t.isDestroyed && (t.ownerId || 'p1') === playerKey).length;
    }
    spendPlayerGold(playerKey, amount) {
        if (!this.isRoomActive()) {
            if (this.gold < amount) return false;
            this.gold -= amount;
            this.playerGold.p1 = this.gold;
            this.syncVisibleGold();
            return true;
        }
        const key = playerKey || this.getLocalPlayerKey();
        if ((this.playerGold[key] ?? 0) < amount) return false;
        this.playerGold[key] -= amount;
        this.syncVisibleGold();
        return true;
    }
    awardPlayerGold(playerKey, amount) {
        if (!this.isRoomActive()) {
            this.gold += amount;
            this.playerGold.p1 = this.gold;
        } else {
            const key = playerKey || this.getLocalPlayerKey();
            this.playerGold[key] = (this.playerGold[key] || 0) + amount;
        }
        this.syncVisibleGold();
    }
    selectDifficulty(difficultyId, options = {}) {
        if (this.isRemoteViewer() && !options.fromSnapshot) return this.getDifficultyConfig();
        if (!DIFFICULTY_LEVELS[difficultyId]) return this.getDifficultyConfig();
        this.selectedDifficultyId = difficultyId;
        return this.getDifficultyConfig();
    }
    getEnemyDifficultyOverrides(type, overrides = {}) {
        const diff = this.getDifficultyConfig();
        const cfg = ENEMY_TYPES[type] || {};
        let next = { ...overrides };
        if (diff && diff.id !== 'hard' && !overrides.isBoss) {
            next = {
                ...next,
                hp: Math.max(1, Math.round((overrides.hp ?? cfg.hp ?? 1) * diff.enemyHpScale)),
                speed: Math.max(1, Math.round((overrides.speed ?? cfg.speed ?? 1) * diff.enemySpeedScale)),
                reward: Math.max(1, Math.round((overrides.reward ?? cfg.reward ?? 1) * diff.rewardScale)),
            };
        }
        if (this.isCoopActive()) {
            next.hp = Math.max(1, Math.round((next.hp ?? overrides.hp ?? cfg.hp ?? 1) * 1.75));
        }
        return next;
    }
    selectMap(mapId, options = {}) {
        if (this.isRemoteViewer() && !options.fromSnapshot) return getMapPreset(this.selectedMapId);
        const preset = getMapPreset(mapId);
        this.selectedMapId = preset.id;
        this.map.setMap(preset.id);
        this.resetCameraToMap();
        this.syncMapOccupancy();
        return preset;
    }
    resetMatchState(startInMenu = false) {
        this.enemies = []; this.towers = []; this.projectiles = []; this.skyStrikes = []; this.effects = []; this.floatingTexts = [];
        this.gold = this.getDifficultyConfig().startGold || CONFIG.START_GOLD; this.playerGold = { p1: this.gold, p2: this.gold }; this.lives = CONFIG.START_LIVES; this.currentWave = 0; this.maxWaveReached = 0;
        this.gameState = startInMenu ? 'menu' : 'countdown';
        this.waveCountdown = CONFIG.FIRST_WAVE_TIMER; this.waveSpawningDone = false;
        this.selectedTowerType = null; this.selectedTower = null; this.selectedTowers = []; this.controlGroups = {}; this.selectedEnemy = null; this.hoveredEnemy = null; this.hoveredTower = null;
        this.isPaused = false; this.gameSpeed = 1; this.baseHitFlash = 0; this.bossIntroTimer = 0; this.bossIntroName = ''; this.bossIntroColor = '#ef4444'; this.activeBoss = null; this.manualStrikeRequest = null; this.largeMapOverlayOpen = false;
        this.isLeftMouseDown = false; this.isSelectionDragging = false; this.isMiniMapDragging = false;
        this.initAbilityStates();
        if (this.testModeEnabled) {
            this.gold = 1000000;
            this.playerGold = { p1: 1000000, p2: 1000000 };
            this.maxWaveReached = CONFIG.TOTAL_WAVES;
        }
        this.map.resetGrid(); this.resetCameraToMap(); this.waveManager.reset(); this.ui.reset(startInMenu); this.syncVisibleGold();
    }
    enableTestMode() {
        if (!this.devModeAvailable) return;
        this.testModeEnabled = true;
        this.gold = 1000000;
        this.playerGold = { p1: 1000000, p2: 1000000 };
        this.maxWaveReached = Math.max(this.maxWaveReached, CONFIG.TOTAL_WAVES);
        this.syncVisibleGold();
        this.ui.updateWave(this.currentWave);
        this.ui.updateTestAccessState?.();
        const center = this.getViewportCenterWorld();
        this.floatingTexts.push(new FloatingText(center.x, this.cameraY + 42, 'TEST MODE: 1 000 000', '#facc15'));
    }
    startMatch(mapId = this.selectedMapId, difficultyId = this.selectedDifficultyId) {
        if (this.isRemoteViewer()) {
            this.multiplayer?.setWaitingForHost?.();
            return false;
        }
        this.selectDifficulty(difficultyId);
        this.selectMap(mapId);
        this.resetMatchState(false);
        this.ui.hideStartScreen();
        return true;
    }
    getPlacementCells(type, col, row) {
        const cfg = TOWER_TYPES[type];
        const footprint = cfg?.footprint || [{ x: 0, y: 0 }];
        return footprint.map(cell => ({ col: col + cell.x, row: row + cell.y }));
    }
    syncMapOccupancy() {
        this.map.resetGrid();
        for (const tower of this.towers) {
            if (tower.isDestroyed || tower.isWall) continue;
            for (const cell of tower.getFootprintCells()) this.map.grid[cell.row][cell.col] = 2;
        }
    }
    restoreGridCell(col, row) { this.map.grid[row][col] = this.isPathCell(col, row) ? 1 : 0; }
    restoreTowerCells(tower) {
        for (const cell of tower.getFootprintCells()) this.restoreGridCell(cell.col, cell.row);
    }
    canPlaceTowerAt(type, col, row) {
        const cfg = TOWER_TYPES[type];
        if (!cfg || !this.isTowerUnlocked(type)) return false;
        for (const cell of this.getPlacementCells(type, col, row)) {
            if (cell.col < 0 || cell.col >= this.getGridCols() || cell.row < 0 || cell.row >= this.getGridRows()) return false;
            if (this.getTowerAt(cell.col, cell.row)) return false;
            if (cfg.canPlaceAnywhere) continue;
            if (cfg.isWall) {
                if (!this.isPathCell(cell.col, cell.row)) return false;
            } else if (this.isPathCell(cell.col, cell.row)) return false;
        }
        return true;
    }
    getPlacementBounds(type, col, row) {
        const cells = this.getPlacementCells(type, col, row);
        const cols = cells.map(cell => cell.col);
        const rows = cells.map(cell => cell.row);
        const minCol = Math.min(...cols), maxCol = Math.max(...cols);
        const minRow = Math.min(...rows), maxRow = Math.max(...rows);
        return {
            left: minCol * CONFIG.CELL_SIZE,
            top: minRow * CONFIG.CELL_SIZE,
            right: (maxCol + 1) * CONFIG.CELL_SIZE,
            bottom: (maxRow + 1) * CONFIG.CELL_SIZE,
        };
    }
    getDistanceToRect(x, y, rect) {
        const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
        const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
        return Math.hypot(dx, dy);
    }
    resolvePlacementAnchor(type, x, y, col, row) {
        if (this.canPlaceTowerAt(type, col, row)) return { col, row };
        let best = null;
        let bestDistance = Infinity;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nextCol = col + dc;
                const nextRow = row + dr;
                if (!this.canPlaceTowerAt(type, nextCol, nextRow)) continue;
                const bounds = this.getPlacementBounds(type, nextCol, nextRow);
                const distance = this.getDistanceToRect(x, y, bounds);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = { col: nextCol, row: nextRow };
                }
            }
        }
        return bestDistance <= 18 ? best : null;
    }
    tryPlaceTower(col, row, options = {}) {
        const towerType = options.towerType || this.selectedTowerType;
        if (this.isRemoteViewer() && !options.fromNetwork) {
            this.multiplayer?.sendCommand?.({ type: 'placeTower', towerType, col, row });
            return;
        }
        if (!this.canPlaceTowerAt(towerType, col, row)) return;
        const cfg = TOWER_TYPES[towerType];
        const ownerId = options.ownerId || this.getLocalPlayerKey();
        if (cfg.isFarm && this.getFarmCountForPlayer(ownerId) >= CONFIG.MAX_FARMS) return;
        if (!this.spendPlayerGold(ownerId, cfg.cost)) return;
        const tower = new Tower(col, row, towerType);
        tower.ownerId = ownerId;
        this.towers.push(tower);
        this.syncMapOccupancy();
        this.audio.playPlace();
        this.multiplayer?.notifyLocalAction?.({ type: 'placeTower', towerType, col, row, ownerId });
    }
    getTowerAt(col, row) { return this.towers.find(t => !t.isDestroyed && t.occupiesCell(col, row)); }
    getTowerById(id) { return this.towers.find(t => !t.isDestroyed && t.id === id); }
    findTowerForNetworkRef(ref = {}) {
        return this.getTowerById(ref.towerId || ref.id)
            || this.towers.find(t => !t.isDestroyed && t.col === ref.col && t.row === ref.row && (!(ref.type || ref.towerType) || t.type === (ref.type || ref.towerType)));
    }
    upgradeTower(tower, options = {}) {
        if (!tower || tower.isDestroyed || tower.isNukeSilo || tower.isBusy() || !tower.canUpgrade()) return false;
        const ownerId = options.ownerId || options.playerKey || this.getLocalPlayerKey();
        if (!this.canControlTower(tower, ownerId)) return false;
        if (this.isRemoteViewer() && !options.fromNetwork) {
            this.multiplayer?.sendCommand?.({ type: 'upgradeTower', towerId: tower.id, col: tower.col, row: tower.row, towerType: tower.type });
            return true;
        }
        const cost = tower.getUpgradeCost();
        if (!this.spendPlayerGold(ownerId, cost)) return false;
        const upgraded = tower.upgrade();
        if (upgraded) {
            this.syncVisibleGold();
            if (this.audio) this.audio.playUpgrade();
        }
        return upgraded;
    }
    sellTower(tower, options = {}) {
        if (!tower || tower.isDestroyed) return false;
        const ownerId = options.ownerId || options.playerKey || this.getLocalPlayerKey();
        if (!this.canControlTower(tower, ownerId)) return false;
        if (this.isRemoteViewer() && !options.fromNetwork) {
            this.multiplayer?.sendCommand?.({ type: 'sellTower', towerId: tower.id, col: tower.col, row: tower.row, towerType: tower.type });
            return true;
        }
        const sellValue = tower.getSellValue();
        if (this.isRoomActive()) this.playerGold[ownerId] = (this.playerGold[ownerId] || 0) + sellValue;
        else {
            this.gold += sellValue;
            this.playerGold.p1 = this.gold;
        }
        this.restoreTowerCells(tower);
        this.towers = this.towers.filter(t => t !== tower);
        this.syncMapOccupancy();
        this.removeTowerFromSelections(tower);
        this.syncVisibleGold();
        if (this.audio) this.audio.playSell();
        return true;
    }
    selectTowerPayload(tower, kind, options = {}) {
        if (!tower || tower.isDestroyed || !tower.isNukeSilo) return false;
        const ownerId = options.ownerId || options.playerKey || this.getLocalPlayerKey();
        if (!this.canControlTower(tower, ownerId)) return false;
        if (this.isRemoteViewer() && !options.fromNetwork) {
            this.multiplayer?.sendCommand?.({ type: 'selectPayload', towerId: tower.id, kind });
            return true;
        }
        return tower.selectPayload(kind);
    }
    buyTowerPayload(tower, kind, options = {}) {
        if (!tower || tower.isDestroyed || !tower.isNukeSilo) return false;
        const payload = NUCLEAR_PAYLOADS[kind];
        const ownerId = options.ownerId || options.playerKey || this.getLocalPlayerKey();
        if (!payload || !this.canControlTower(tower, ownerId)) return false;
        if (this.isRemoteViewer() && !options.fromNetwork) {
            this.multiplayer?.sendCommand?.({ type: 'buyPayload', towerId: tower.id, kind });
            return true;
        }
        if (!this.spendPlayerGold(ownerId, payload.cost)) return false;
        tower.addPayload(kind);
        if (this.audio) this.audio.playNukeLoad(kind);
        return true;
    }
    getTowerAtPoint(x, y) {
        let best = null;
        let bestDistance = Infinity;
        for (const tower of this.towers) {
            if (tower.isDestroyed) continue;
            if (tower.isAirfield) {
                const plane = tower.getPlanePosition();
                const planeDistance = Math.hypot(plane.x - x, plane.y - y);
                if (planeDistance <= tower.airAttackRadius + 12 && planeDistance < bestDistance) {
                    bestDistance = planeDistance;
                    best = tower;
                }
            }
            const bounds = tower.getBounds();
            const pad = tower.isAirfield ? 10 : 8;
            if (x < bounds.left - pad || x > bounds.left + bounds.width + pad || y < bounds.top - pad || y > bounds.top + bounds.height + pad) continue;
            const distance = Math.hypot(tower.x - x, tower.y - y);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = tower;
            }
        }
        return best;
    }
    getEnemyAt(x, y) {
        let best = null, bestDist = Infinity;
        for (const e of this.enemies) {
            if (e.isDead || e.reachedEnd) continue;
            const d = Math.hypot(e.x - x, e.y - y);
            if (d <= e.radius + 8 && d < bestDist) { best = e; bestDist = d; }
        }
        return best;
    }
    getLargeMapOverlayRect() {
        const maxWidth = CONFIG.CANVAS_WIDTH - 120;
        const maxHeight = CONFIG.CANVAS_HEIGHT - 110;
        const scale = Math.min(maxWidth / this.getWorldWidth(), maxHeight / this.getWorldHeight());
        const width = this.getWorldWidth() * scale;
        const height = this.getWorldHeight() * scale;
        return {
            x: (CONFIG.CANVAS_WIDTH - width) / 2,
            y: (CONFIG.CANVAS_HEIGHT - height) / 2,
            width,
            height,
            scale,
        };
    }
    handleLargeMapOverlayClick(screenX, screenY) {
        const rect = this.getLargeMapOverlayRect();
        if (screenX < rect.x || screenX > rect.x + rect.width || screenY < rect.y || screenY > rect.y + rect.height) {
            this.largeMapOverlayOpen = false;
            return;
        }
        const worldX = ((screenX - rect.x) / rect.width) * this.getWorldWidth();
        const worldY = ((screenY - rect.y) / rect.height) * this.getWorldHeight();
        this.centerCameraOnWorld(worldX, worldY);
        this.largeMapOverlayOpen = false;
    }
    initAbilityStates() {
        this.matchElapsed = 0;
        this.selectedAbilityKind = null;
        this.abilityStrikes = [];
        this.abilityStates = Object.fromEntries(Object.entries(ABILITY_TYPES).map(([kind, cfg]) => [kind, {
            charges: 0,
            nextChargeIn: cfg.unlockTime,
            unlocked: false,
        }]));
    }
    getAbilityState(kind) {
        return this.abilityStates?.[kind] || null;
    }
    canArmAbility(kind) {
        const state = this.getAbilityState(kind);
        return !!(state && state.charges > 0 && this.gameState !== 'menu' && this.gameState !== 'won' && this.gameState !== 'lost');
    }
    selectAbility(kind) {
        if (!this.canArmAbility(kind)) return false;
        this.selectedAbilityKind = this.selectedAbilityKind === kind ? null : kind;
        this.selectedTowerType = null;
        this.ui.deselectAllTowerButtons();
        this.clearManualStrikeRequest();
        this.ui.updateAbilityBar?.();
        return true;
    }
    clearSelectedAbility() {
        if (!this.selectedAbilityKind) return;
        this.selectedAbilityKind = null;
        this.ui.updateAbilityBar?.();
    }
    canFortifyTower(tower) {
        return !!(tower && !tower.isDestroyed && !tower.isScanner && !tower.isWall);
    }
    spendAbilityCharge(kind) {
        const state = this.getAbilityState(kind);
        if (!state || state.charges <= 0) return false;
        state.charges--;
        this.ui.updateAbilityBar?.();
        return true;
    }
    updateAbilityCharges(dt) {
        if (this.gameState === 'menu' || this.gameState === 'won' || this.gameState === 'lost') return;
        this.matchElapsed += dt;
        for (const [kind, cfg] of Object.entries(ABILITY_TYPES)) {
            const state = this.getAbilityState(kind);
            if (!state) continue;
            state.nextChargeIn -= dt;
            let gained = 0;
            while (state.nextChargeIn <= 0) {
                state.charges++;
                state.unlocked = true;
                state.nextChargeIn += cfg.recharge;
                gained++;
            }
            if (gained > 0) {
                const center = this.getViewportCenterWorld();
                this.floatingTexts.push(new FloatingText(center.x, this.cameraY + 54, `${cfg.short} ГОТОВО x${state.charges}`, '#facc15'));
            }
        }
    }
    castFortress(tower) {
        if (!this.canFortifyTower(tower) || !this.spendAbilityCharge('fortress')) return false;
        tower.applyFortress(ABILITY_TYPES.fortress.duration);
        this.effects.push(new Effect(tower.x, tower.y, 'explosion', null, 34));
        this.floatingTexts.push(new FloatingText(tower.x, tower.y - 26, 'БАСТИОН', '#93c5fd'));
        this.audio.playUpgrade();
        this.clearSelectedAbility();
        return true;
    }
    castFreeze(x, y) {
        const cfg = ABILITY_TYPES.freeze;
        if (!this.spendAbilityCharge('freeze')) return false;
        let affected = 0;
        for (const enemy of this.enemies) {
            if (enemy.isDead || enemy.reachedEnd) continue;
            if (Math.hypot(enemy.x - x, enemy.y - y) > cfg.radius) continue;
            enemy.takeDamage(cfg.damage);
            if (!enemy.isDead) enemy.applyStun(cfg.stunDuration);
            affected++;
        }
        this.effects.push(new Effect(x, y, 'explosion', null, cfg.radius));
        this.floatingTexts.push(new FloatingText(x, y - 24, affected ? `ЗАМОРОЗКА x${affected}` : 'ПУСТО', '#7dd3fc'));
        this.audio.playShot('cryo');
        this.clearSelectedAbility();
        return true;
    }
    castSunfall(x, y) {
        const cfg = ABILITY_TYPES.sunfall;
        if (!this.spendAbilityCharge('sunfall')) return false;
        this.abilityStrikes.push({
            kind: 'sunfall',
            x,
            y,
            radius: cfg.radius,
            centerRadius: cfg.centerRadius,
            damage: cfg.damage,
            midMultiplier: cfg.midMultiplier,
            outerMultiplier: cfg.outerMultiplier,
            burnDps: cfg.burnDps,
            burnDuration: cfg.burnDuration,
            delay: cfg.strikeDelay,
            timeRemaining: cfg.strikeDelay,
            beamDuration: cfg.beamDuration,
            beamTimer: 0,
            exploded: false,
        });
        this.floatingTexts.push(new FloatingText(x, y - 24, 'ВЫЖИГАТЕЛЬ', '#fbbf24'));
        this.audio.playWaveStart();
        this.clearSelectedAbility();
        return true;
    }
    handleAbilityClick(x, y, clickedTower) {
        if (!this.selectedAbilityKind) return false;
        if (this.selectedAbilityKind === 'fortress') {
            if (!clickedTower || !this.canFortifyTower(clickedTower)) return true;
            return this.castFortress(clickedTower);
        }
        if (this.selectedAbilityKind === 'freeze') return this.castFreeze(x, y);
        if (this.selectedAbilityKind === 'sunfall') return this.castSunfall(x, y);
        return false;
    }
    updateAbilityStrikes(dt) {
        for (let i = this.abilityStrikes.length - 1; i >= 0; i--) {
            const strike = this.abilityStrikes[i];
            strike.timeRemaining -= dt;
            if (!strike.exploded && strike.timeRemaining <= 0) {
                strike.exploded = true;
                strike.beamTimer = strike.beamDuration;
                for (const enemy of this.enemies) {
                    if (enemy.isDead || enemy.reachedEnd) continue;
                    const distance = Math.hypot(enemy.x - strike.x, enemy.y - strike.y);
                    if (distance > strike.radius) continue;
                    const multiplier = distance <= strike.centerRadius ? 1 : distance <= strike.radius * 0.6 ? strike.midMultiplier : strike.outerMultiplier;
                    const damage = Math.round(strike.damage * multiplier);
                    enemy.takeDamage(damage);
                    if (!enemy.isDead && strike.burnDps > 0) enemy.applyBurn(strike.burnDps, strike.burnDuration);
                }
                this.effects.push(new Effect(strike.x, strike.y, 'nukeExplosion', null, strike.radius));
                this.audio.playNukeImpact('tsar');
            }
            if (strike.exploded) {
                strike.beamTimer = Math.max(0, strike.beamTimer - dt);
                if (strike.beamTimer <= 0) this.abilityStrikes.splice(i, 1);
            }
        }
    }
    clearManualStrikeRequest() { this.manualStrikeRequest = null; }
    handleManualStrikeContext(targetX, targetY, enemy = null) {
        const tower = this.selectedTower;
        if (!tower || !tower.isNukeSilo || tower.isDestroyed) return false;
        if (tower.isBusy() || tower.isDisabled()) {
            this.floatingTexts.push(new FloatingText(tower.x, tower.y - 28, 'ШАХТА НЕДОСТУПНА', '#f59e0b'));
            return true;
        }
        if (!tower.canLaunchSelectedPayload()) {
            this.floatingTexts.push(new FloatingText(tower.x, tower.y - 28, 'НЕТ ГОТОВЫХ РАКЕТ', '#ef4444'));
            return true;
        }
        const payloadKind = tower.selectedPayload;
        const launchTarget = payloadKind === 'tactical'
            ? enemy
            : {
                x: Math.max(0, Math.min(this.getWorldWidth(), targetX)),
                y: Math.max(0, Math.min(this.getWorldHeight(), targetY)),
            };
        if (payloadKind === 'tactical' && !enemy) {
            this.floatingTexts.push(new FloatingText(tower.x, tower.y - 28, 'МАЛАЯ РАКЕТА: ТОЛЬКО ПО ВРАГУ', '#f59e0b'));
            return true;
        }
        const payload = tower.launchSelectedPayload(launchTarget, this.projectiles);
        if (!payload) return true;
        this.selectedEnemy = null;
        const markX = launchTarget.x;
        const markY = launchTarget.y;
        this.floatingTexts.push(new FloatingText(markX, markY - 24, `${payload.shortName} ЗАХОДИТ`, payload.inventoryColor));
        this.ui.showTowerInfo(tower);
        return true;
    }
    handleManualSniperContext(enemy) {
        const towers = this.getSelectedManualAimTowers();
        const tower = this.selectedTower;
        if (!tower || tower.isDestroyed || !towers.length) return false;
        if (!enemy) return true;
        let fired = 0;
        let blockedByCooldown = 0;
        let blockedByRange = 0;
        for (const manualTower of towers) {
            if (manualTower.canManualShootTarget(enemy)) {
                manualTower.manualShoot(this.projectiles, enemy);
                fired++;
            } else if (manualTower.cooldown > 0 || manualTower.isBusy() || manualTower.isDisabled()) {
                blockedByCooldown++;
            } else {
                blockedByRange++;
            }
        }
        if (fired <= 0) {
            const text = tower.cooldown > 0 ? `ПЕРЕЗАРЯДКА ${Math.ceil(tower.cooldown)}с` : 'ЦЕЛЬ ВНЕ ДАЛЬНОСТИ';
            const center = this.getSelectionCenterWorld(towers);
            this.floatingTexts.push(new FloatingText(center.x, center.y - 28, text, '#f59e0b'));
            return true;
        }
        this.selectedEnemy = enemy;
        const center = this.getSelectionCenterWorld(towers);
        const label = fired > 1 ? `ЗАЛП x${fired}` : 'ВЫСТРЕЛ';
        this.floatingTexts.push(new FloatingText(center.x, center.y - 28, label, '#ef4444'));
        if (blockedByCooldown > 0 || blockedByRange > 0) {
            const suffix = blockedByCooldown > 0 ? `ГОТОВЫ ${fired}/${towers.length}` : `В РАДИУСЕ ${fired}/${towers.length}`;
            this.floatingTexts.push(new FloatingText(center.x, center.y - 46, suffix, '#f59e0b'));
        }
        this.ui.showTowerInfo(tower);
        return true;
    }
    getWaveReward() { return CONFIG.WAVE_REWARD_BASE + this.currentWave * CONFIG.WAVE_REWARD_PER_WAVE; }
    getMaxSkipBonus() { return CONFIG.SKIP_BONUS_BASE + (this.currentWave + 1) * CONFIG.SKIP_BONUS_PER_WAVE; }
    getCurrentSkipBonus() {
        const max = this.currentWave === 0 ? CONFIG.FIRST_WAVE_TIMER : CONFIG.WAVE_TIMER;
        const ratio = Math.max(0, this.waveCountdown / max);
        return Math.round(this.getMaxSkipBonus() * ratio);
    }
    announceBoss(enemy) {
        this.bossIntroTimer = 2.4;
        this.bossIntroName = enemy.name;
        this.bossIntroColor = enemy.bossBannerColor || '#ef4444';
        this.activeBoss = enemy;
        this.audio.playBossIntro(enemy.bossStage || 1);
    }
    giveWaveRewards() {
        const center = this.getViewportCenterWorld();
        const reward = this.getWaveReward();
        if (this.isRoomActive()) {
            this.playerGold.p1 = (this.playerGold.p1 || 0) + reward;
            this.playerGold.p2 = (this.playerGold.p2 || 0) + reward;
        } else {
            this.gold += reward;
            this.playerGold.p1 = this.gold;
        }
        this.floatingTexts.push(new FloatingText(center.x, this.cameraY + 30, '+' + reward + ' РАУНД', '#22c55e'));
        const farmIncomeByPlayer = { p1: 0, p2: 0 };
        for (const t of this.towers) {
            if (t.isFarm && !t.isDestroyed && !t.isBusy() && !t.isDisabled()) farmIncomeByPlayer[t.ownerId || 'p1'] = (farmIncomeByPlayer[t.ownerId || 'p1'] || 0) + t.farmIncome;
        }
        const totalFarmIncome = Object.values(farmIncomeByPlayer).reduce((sum, value) => sum + value, 0);
        if (totalFarmIncome > 0) {
            if (this.isRoomActive()) {
                this.playerGold.p1 = (this.playerGold.p1 || 0) + (farmIncomeByPlayer.p1 || 0);
                this.playerGold.p2 = (this.playerGold.p2 || 0) + (farmIncomeByPlayer.p2 || 0);
            } else {
                this.gold += totalFarmIncome;
                this.playerGold.p1 = this.gold;
            }
            this.floatingTexts.push(new FloatingText(center.x, this.cameraY + 55, '🌾 +' + totalFarmIncome + ' ФЕРМА', '#fde047'));
        }
        this.syncVisibleGold();
    }
    startNextWave() {
        this.currentWave++;
        if (this.currentWave > CONFIG.TOTAL_WAVES) return;
        this.maxWaveReached = Math.max(this.maxWaveReached, this.currentWave);
        if (this.currentWave > 1) this.giveWaveRewards();
        this.gameState = 'playing'; this.waveSpawningDone = false;
        this.waveManager.startWave(this.currentWave);
        this.ui.updateWave(this.currentWave);
        this.ui.updateTowerButtons();
        this.ui.showWaveActive(this.currentWave);
        this.audio.playWaveStart();
    }
    skipCountdown() {
        if (this.gameState !== 'countdown') return;
        if (this.isRemoteViewer()) {
            this.multiplayer?.setStatus?.('Только главный игрок может запускать волну.', 'error');
            return false;
        }
        const bonus = this.getCurrentSkipBonus();
        if (bonus > 0) {
            this.awardPlayerGold(this.getLocalPlayerKey(), bonus);
            const center = this.getViewportCenterWorld();
            this.floatingTexts.push(new FloatingText(center.x, this.cameraY + 7, '+' + bonus + ' БОНУС', '#a78bfa'));
        }
        this.startNextWave();
        return true;
    }
    update(dt) {
        if (this.isRemoteViewer()) {
            dt = Math.min(dt, 0.1);
            this.updateCamera(dt);
            this.updateRemotePresentation(dt);
            this.ui.tick(dt);
            return;
        }
        if (this.isPaused || this.gameState === 'won' || this.gameState === 'lost' || this.gameState === 'ended') return;
        dt = Math.min(dt * this.gameSpeed, 0.1);
        this.updateCamera(dt);
        this.baseHitFlash = Math.max(0, this.baseHitFlash - dt * 2.8);
        this.bossIntroTimer = Math.max(0, this.bossIntroTimer - dt);
        this.updateAbilityCharges(dt);
        if (this.manualStrikeRequest) {
            this.manualStrikeRequest.timer -= dt;
            if (this.manualStrikeRequest.timer <= 0 || this.manualStrikeRequest.enemy.isDead || this.manualStrikeRequest.enemy.reachedEnd || this.manualStrikeRequest.tower.isDestroyed) {
                this.clearManualStrikeRequest();
            }
        }
        if (this.gameState === 'countdown') {
            this.waveCountdown -= dt;
            this.ui.updateCountdown(Math.max(0, this.waveCountdown), this.getCurrentSkipBonus());
            if (this.waveCountdown <= 0) {
                this.startNextWave();
            }
        }
        if (this.gameState === 'playing') {
            this.waveManager.update(dt);
            if (this.waveManager.isDoneSpawning() && !this.waveSpawningDone) {
                this.waveSpawningDone = true;
                if (this.currentWave >= CONFIG.TOTAL_WAVES) { }
                else { this.gameState = 'countdown'; this.waveCountdown = CONFIG.WAVE_TIMER; }
            }
        }
        for (const t of this.towers) {
            if (t.isDestroyed) { t.canSeeInvisible = false; t.invisibleDetectionLevel = 0; continue; }
            if (t.isScanner && !t.isBusy() && !t.isDisabled()) {
                const ownLevel = t.getConfig().upgrades?.[t.level - 2]?.detectionLevel;
                t.invisibleDetectionLevel = Math.max(1, ownLevel ?? t.invisibleDetectionLevel ?? t.getConfig().detectionLevel ?? 1);
                t.canSeeInvisible = t.invisibleDetectionLevel > 0;
                continue;
            }
            t.invisibleDetectionLevel = 0;
            t.canSeeInvisible = false;
            for (const sc of this.towers) {
                if (!sc.isScanner || sc.isDestroyed || sc.isBusy() || sc.isDisabled()) continue;
                if (Math.hypot(t.x - sc.x, t.y - sc.y) > sc.scanRadius) continue;
                t.invisibleDetectionLevel = Math.max(t.invisibleDetectionLevel, sc.invisibleDetectionLevel || 0);
            }
            t.canSeeInvisible = t.invisibleDetectionLevel > 0;
        }
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt, this.towers);
            if (e.didLaunchSkyStrikeThisFrame && e.skyStrikeThisFrame) {
                this.skyStrikes.push({ ...e.skyStrikeThisFrame, timeRemaining: e.skyStrikeThisFrame.fallTime });
                this.floatingTexts.push(new FloatingText(e.skyStrikeThisFrame.x, e.skyStrikeThisFrame.y - 22, '☄ БОСС', '#fb7185'));
            }
            if (e.didDisablePulseThisFrame && e.disabledTowersThisFrame.length) {
                this.effects.push(new Effect(e.x, e.y, 'bossBombExplosion', null, e.disablePulseRadius * 0.7));
                for (const tower of e.disabledTowersThisFrame) {
                    tower.applyDisable(e.disablePulseDuration);
                    this.floatingTexts.push(new FloatingText(tower.x, tower.y - 24, 'СТАН', '#7dd3fc'));
                }
            }
            if (e.didAttackThisFrame && e.attackingTower) {
                this.effects.push(new Effect(e.attackingTower.x, e.attackingTower.y, 'towerHit'));
                this.floatingTexts.push(new FloatingText(e.attackingTower.x, e.attackingTower.y - 20, '-' + e.towerAttackDamage, '#ef4444'));
                this.audio.playTowerDamage();
            }
            if (e.didHitWallThisFrame && e.impactedWall) {
                this.effects.push(new Effect(e.impactedWall.x, e.impactedWall.y, 'towerHit'));
                this.floatingTexts.push(new FloatingText(e.impactedWall.x, e.impactedWall.y - 20, '-' + Math.round(e.wallDamageThisFrame), '#f59e0b'));
                this.audio.playTowerDamage();
            }
            if (e.reachedEnd) {
                const baseDamage = getEnemyBaseDamage(e);
                const legacyEquivalentDamage = baseDamage / Math.max(1, CONFIG.BASE_HP_PER_LEGACY_LIFE);
                this.lives -= baseDamage; this.effects.push(new Effect(e.x, e.y, 'hit'));
                this.baseHitFlash = Math.min(1, this.baseHitFlash + 0.25 + legacyEquivalentDamage * 0.02);
                this.audio.playBaseHit();
                if (this.activeBoss === e) this.activeBoss = null;
                if (this.selectedEnemy === e) { this.selectedEnemy = null; this.ui.hideTowerInfo(); }
                this.enemies.splice(i, 1); this.ui.updateLives(this.lives);
                if (this.lives <= 0) { this.lives = 0; this.ui.updateLives(0); this.gameState = 'lost'; this.ui.showGameOver(false); this.audio.playGameOver(false); }
                continue;
            }
            if (e.isDead) {
                this.awardPlayerGold(e.lastHitOwnerId || this.getLocalPlayerKey(), e.reward);
                this.floatingTexts.push(new FloatingText(e.x, e.y - 15, '+' + e.reward, '#d4a017'));
                this.effects.push(new Effect(e.x, e.y, 'death', e.type));
                this.audio.playEnemyDeath();
                if (this.activeBoss === e) this.activeBoss = null;
                if (this.selectedEnemy === e) { this.selectedEnemy = null; this.ui.hideTowerInfo(); }
                this.enemies.splice(i, 1); this.syncVisibleGold(); continue;
            }
        }
        for (let i = this.skyStrikes.length - 1; i >= 0; i--) {
            const strike = this.skyStrikes[i];
            strike.timeRemaining -= dt;
            if (strike.timeRemaining > 0) continue;
            for (const tower of this.towers) {
                if (tower.isDestroyed) continue;
                const distance = Math.hypot(tower.x - strike.x, tower.y - strike.y);
                if (distance > strike.radius) continue;
                const multiplier = distance <= strike.radius * 0.35 ? 1 : distance <= strike.radius * 0.72 ? 0.72 : 0.48;
                const damage = Math.round(strike.damage * multiplier);
                if (damage <= 0) continue;
                tower.takeTowerDamage(damage);
                this.effects.push(new Effect(tower.x, tower.y, 'towerHit'));
                this.floatingTexts.push(new FloatingText(tower.x, tower.y - 22, '-' + damage, '#fb7185'));
            }
            this.effects.push(new Effect(strike.x, strike.y, 'bossBombExplosion', null, strike.radius));
            this.audio.playExplosion();
            this.skyStrikes.splice(i, 1);
        }
        this.updateAbilityStrikes(dt);
        for (const t of this.towers) t.update(dt, this.enemies, this.projectiles);
        for (const t of this.towers) {
            if (t.isHealer || t.isDestroyed || t.hp >= t.maxHp) continue;
            let activeHealer = null;
            for (const h of this.towers) {
                if (!h.isHealer || h.isDestroyed || h.isBusy() || h.isDisabled()) continue;
                if (Math.hypot(t.x - h.x, t.y - h.y) > h.healRadius) continue;
                if (!activeHealer || h.healRate > activeHealer.healRate) activeHealer = h;
            }
            if (activeHealer) { t.hp = Math.min(t.maxHp, t.hp + activeHealer.healRate * dt); }
        }
        for (let i = this.towers.length - 1; i >= 0; i--) {
            if (this.towers[i].isDestroyed) {
                const t = this.towers[i]; this.restoreTowerCells(t);
                this.effects.push(new Effect(t.x, t.y, 'towerDestroyed'));
                this.floatingTexts.push(new FloatingText(t.x, t.y - 20, '💥', '#ef4444'));
                this.audio.playTowerDestroyed();
                this.removeTowerFromSelections(t);
                this.towers.splice(i, 1);
                this.syncMapOccupancy();
            }
        }
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i]; p.update(dt);
            if (p.hit) {
                if (p.aoeRadius > 0) {
                    for (const e of this.enemies) {
                        const distance = Math.hypot(e.x - p.x, e.y - p.y);
                        if (distance > p.aoeRadius) continue;
                        const isDirectImpact = p.directHitRadius > 0 ? distance <= p.directHitRadius : e === p.target;
                        const damage = isDirectImpact ? p.getDirectDamageAgainst(e) : p.getSplashDamageAgainst(e, distance);
                        e.takeDamage(damage);
                        if (damage > 0 && p.sourceTower?.ownerId) e.lastHitOwnerId = p.sourceTower.ownerId;
                        if (p.burnDps > 0 && p.burnDuration > 0 && !e.isDead) e.applyBurn(p.burnDps, p.burnDuration);
                        if (p.sourceTower?.slowFactor < 1) e.applySlow(p.sourceTower.slowFactor, p.sourceTower.slowDuration || 0);
                    }
                    this.effects.push(new Effect(p.x, p.y, p.impactEffect || (p.renderStyle === 'bomb' ? 'bombExplosion' : 'explosion'), null, p.aoeRadius));
                    if (p.impactSound) this.audio.playNukeImpact(p.impactSound);
                    else this.audio.playExplosion();
                }
                else {
                    if (p.pointTarget) {
                        let directTarget = null;
                        let directDistance = p.directHitRadius > 0 ? p.directHitRadius : 22;
                        for (const e of this.enemies) {
                            if (e.isDead || e.reachedEnd) continue;
                            const distance = Math.hypot(e.x - p.x, e.y - p.y);
                            if (distance > directDistance) continue;
                            directTarget = e;
                            directDistance = distance;
                        }
                        if (directTarget) {
                            directTarget.takeDamage(p.getDirectDamageAgainst(directTarget));
                            if (p.sourceTower?.ownerId) directTarget.lastHitOwnerId = p.sourceTower.ownerId;
                            if (p.burnDps > 0 && p.burnDuration > 0 && !directTarget.isDead) directTarget.applyBurn(p.burnDps, p.burnDuration);
                            if (p.sourceTower?.slowFactor < 1) directTarget.applySlow(p.sourceTower.slowFactor, p.sourceTower.slowDuration || 0);
                        }
                    }
                    else if (p.target && !p.target.isDead) {
                        p.target.takeDamage(p.getDirectDamageAgainst(p.target));
                        if (p.sourceTower?.ownerId) p.target.lastHitOwnerId = p.sourceTower.ownerId;
                        if (p.burnDps > 0 && p.burnDuration > 0 && !p.target.isDead) p.target.applyBurn(p.burnDps, p.burnDuration);
                        if (p.sourceTower?.slowFactor < 1) p.target.applySlow(p.sourceTower.slowFactor, p.sourceTower.slowDuration || 0);
                    }
                    this.effects.push(new Effect(p.x, p.y, p.impactEffect || 'hit'));
                    if (p.impactSound) this.audio.playNukeImpact(p.impactSound);
                }
                if (p.chainTargets > 0 && p.target) {
                    let src = { x: p.x, y: p.y }; const hit = new Set([p.target]);
                    for (let c = 0; c < p.chainTargets; c++) {
                        let nr = null, nd = 100;
                        for (const e of this.enemies) { if (hit.has(e) || e.isDead) continue; const d = Math.hypot(e.x - src.x, e.y - src.y); if (d < nd) { nr = e; nd = d; } }
                        if (nr) { nr.takeDamage(p.getDamageAgainst(nr) * 0.55 * Math.pow(0.6, c)); if (p.sourceTower?.ownerId) nr.lastHitOwnerId = p.sourceTower.ownerId; this.effects.push(new Effect(src.x, src.y, 'lightning', null, 0, nr.x, nr.y)); src = { x: nr.x, y: nr.y }; hit.add(nr); } else break;
                    }
                }
                this.projectiles.splice(i, 1); continue;
            }
            if (p.expired) this.projectiles.splice(i, 1);
        }
        for (let i = this.effects.length - 1; i >= 0; i--) { this.effects[i].update(dt); if (this.effects[i].done) this.effects.splice(i, 1); }
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) { this.floatingTexts[i].update(dt); if (this.floatingTexts[i].done) this.floatingTexts.splice(i, 1); }
        if (this.hoveredEnemy && (this.hoveredEnemy.isDead || this.hoveredEnemy.reachedEnd)) this.hoveredEnemy = null;
        this.ui.tick(dt);
        if (this.gameState === 'playing' && this.currentWave >= CONFIG.TOTAL_WAVES && this.waveSpawningDone && this.enemies.length === 0) {
            this.gameState = 'won'; this.ui.showGameOver(true); this.audio.playGameOver(true);
        }
    }
    updateRemotePresentation(dt) {
        this.baseHitFlash = Math.max(0, this.baseHitFlash - dt * 2.8);
        this.bossIntroTimer = Math.max(0, this.bossIntroTimer - dt);
        if (this.gameState === 'countdown') {
            this.waveCountdown = Math.max(0, this.waveCountdown - dt);
            this.ui.updateCountdown(Math.max(0, this.waveCountdown), this.getCurrentSkipBonus());
        }
        for (const enemy of this.enemies) enemy.updateRemotePresentation?.(dt);
        for (const tower of this.towers) tower.updateRemotePresentation?.(dt);
        for (let i = this.effects.length - 1; i >= 0; i--) { this.effects[i].update(dt); if (this.effects[i].done) this.effects.splice(i, 1); }
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) { this.floatingTexts[i].update(dt); if (this.floatingTexts[i].done) this.floatingTexts.splice(i, 1); }
    }
    render() {
        const ctx = this.ctx; ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        const showHoverInfo = !this.selectedTowerType && !this.selectedAbilityKind;
        ctx.save();
        ctx.translate(-this.cameraX, -this.cameraY);
        this.map.render(ctx);
        if (this.selectedTowerType && this.hoveredCell) this.drawPlacementPreview(ctx);
        const selectedGroup = this.getSelectedTowerGroup();
        if (this.selectedTower && !this.selectedTower.isDestroyed && !this.selectedTower.isAirfield) this.selectedTower.drawRange(ctx);
        if (showHoverInfo && this.hoveredTower && this.hoveredTower.isAirfield && !this.hoveredTower.isDestroyed) this.hoveredTower.drawRange(ctx);
        for (const t of this.towers) t.render(ctx);
        for (const tower of selectedGroup) this.drawTowerSelection(ctx, tower, tower === this.selectedTower);
        for (const e of this.enemies) e.render(ctx);
        for (const strike of this.skyStrikes) this.drawSkyStrike(ctx, strike);
        for (const strike of this.abilityStrikes) this.drawAbilityStrike(ctx, strike);
        if (this.selectedAbilityKind) this.drawAbilityPreview(ctx);
        if (this.selectedEnemy && !this.selectedEnemy.isDead && !this.selectedEnemy.reachedEnd) this.drawEnemyFocus(ctx, this.selectedEnemy, true);
        if (this.hoveredEnemy && this.hoveredEnemy !== this.selectedEnemy && !this.hoveredEnemy.isDead && !this.hoveredEnemy.reachedEnd) this.drawEnemyFocus(ctx, this.hoveredEnemy, false);
        for (const p of this.projectiles) p.render(ctx);
        for (const t of this.towers) t.renderAirUnit?.(ctx);
        for (const ef of this.effects) ef.render(ctx);
        for (const ft of this.floatingTexts) ft.render(ctx);
        if (this.manualStrikeRequest && !this.manualStrikeRequest.enemy.isDead && !this.manualStrikeRequest.enemy.reachedEnd) this.drawManualStrikeMarker(ctx, this.manualStrikeRequest);
        ctx.restore();
        if (this.isSelectionDragging) this.drawSelectionDragOverlay(ctx);
        if (showHoverInfo && this.hoveredTower && !this.hoveredEnemy && this.hoveredTower !== this.selectedTower && !this.hoveredTower.isDestroyed) this.drawTowerHoverInfo(ctx, this.hoveredTower);
        if (showHoverInfo && this.hoveredEnemy && !this.hoveredEnemy.isDead && !this.hoveredEnemy.reachedEnd) this.drawEnemyHoverInfo(ctx, this.hoveredEnemy);
        if (this.baseHitFlash > 0) this.drawBaseHitOverlay(ctx);
        if (this.activeBoss && !this.activeBoss.isDead && !this.activeBoss.reachedEnd) this.drawBossIntro(ctx);
        this.drawMiniMap(ctx);
        this.drawLargeMapOverlay(ctx);
        if (this.isPaused && this.gameState !== 'won' && this.gameState !== 'lost' && this.gameState !== 'ended') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.font = 'bold 42px monospace'; ctx.fillStyle = '#dc2626'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('▮▮ ПАУЗА', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
        }
    }
    drawSkyStrike(ctx, strike) {
        const fallTime = Math.max(0.001, strike.fallTime || 1);
        const progress = 1 - Math.max(0, strike.timeRemaining) / fallTime;
        const impactPulse = 0.35 + Math.sin(Date.now() * 0.01 + strike.x * 0.02) * 0.12;
        const groundRadius = strike.radius * (0.72 + impactPulse);
        const orbY = strike.y - (1 - progress) * 190;
        const orbSize = 10 + (strike.bossStage || 1) * 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(strike.x, strike.y, groundRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(251,113,133,${0.5 + progress * 0.25})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(strike.x, strike.y, strike.radius * (0.28 + progress * 0.15), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,68,68,${0.12 + progress * 0.08})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(251,146,60,${0.45 + progress * 0.25})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(strike.x, orbY + orbSize);
        ctx.lineTo(strike.x, strike.y - 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(strike.x, orbY, orbSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251,146,60,${0.62 + progress * 0.2})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(254,215,170,0.9)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
    }
    drawAbilityStrike(ctx, strike) {
        if (strike.kind !== 'sunfall') return;
        ctx.save();
        if (!strike.exploded) {
            const prep = 1 - Math.max(0, strike.timeRemaining) / Math.max(0.001, strike.delay);
            const pulse = 0.4 + Math.sin(Date.now() * 0.012 + strike.x * 0.01) * 0.14;
            ctx.beginPath();
            ctx.arc(strike.x, strike.y, strike.radius * (0.84 + pulse * 0.12), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(250,204,21,${0.45 + prep * 0.28})`;
            ctx.lineWidth = 2.2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(strike.x, strike.y, strike.centerRadius * (0.86 + pulse * 0.18), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(250,204,21,${0.1 + prep * 0.08})`;
            ctx.fill();
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(strike.x, strike.y - strike.radius - 18);
            ctx.lineTo(strike.x, strike.y + strike.radius + 18);
            ctx.moveTo(strike.x - strike.radius - 18, strike.y);
            ctx.lineTo(strike.x + strike.radius + 18, strike.y);
            ctx.strokeStyle = `rgba(253,224,71,${0.38 + prep * 0.22})`;
            ctx.lineWidth = 1.4;
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            const beamProgress = strike.beamTimer / Math.max(0.001, strike.beamDuration);
            const beamAlpha = 0.25 + beamProgress * 0.55;
            const beamWidth = strike.centerRadius * (0.65 + beamProgress * 0.55);
            const beamTop = strike.y - 280;
            const grad = ctx.createLinearGradient(strike.x, beamTop, strike.x, strike.y + strike.radius);
            grad.addColorStop(0, `rgba(254,240,138,${beamAlpha * 0.2})`);
            grad.addColorStop(0.25, `rgba(250,204,21,${beamAlpha * 0.72})`);
            grad.addColorStop(0.75, `rgba(249,115,22,${beamAlpha * 0.68})`);
            grad.addColorStop(1, 'rgba(239,68,68,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(strike.x - beamWidth / 2, beamTop, beamWidth, strike.y + strike.radius - beamTop);
            ctx.beginPath();
            ctx.arc(strike.x, strike.y, strike.radius * (0.42 + beamProgress * 0.68), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(250,204,21,${0.16 + beamProgress * 0.12})`;
            ctx.fill();
        }
        ctx.restore();
    }
    drawAbilityPreview(ctx) {
        if (!this.pointerInsideCanvas) return;
        const world = this.screenToWorld(this.mouseScreenX, this.mouseScreenY);
        const cfg = ABILITY_TYPES[this.selectedAbilityKind];
        if (!cfg) return;
        ctx.save();
        if (this.selectedAbilityKind === 'fortress') {
            const tower = this.hoveredTower;
            if (tower && this.canFortifyTower(tower)) {
                const bounds = tower.getBounds();
                ctx.strokeStyle = 'rgba(125,211,252,0.95)';
                ctx.lineWidth = 3;
                ctx.strokeRect(bounds.left - 8, bounds.top - 8, bounds.width + 16, bounds.height + 16);
                ctx.fillStyle = 'rgba(96,165,250,0.12)';
                ctx.fillRect(bounds.left - 6, bounds.top - 6, bounds.width + 12, bounds.height + 12);
            }
        } else {
            ctx.beginPath();
            ctx.arc(world.x, world.y, cfg.radius, 0, Math.PI * 2);
            ctx.strokeStyle = this.selectedAbilityKind === 'freeze' ? 'rgba(125,211,252,0.78)' : 'rgba(250,204,21,0.82)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = this.selectedAbilityKind === 'freeze' ? 'rgba(125,211,252,0.08)' : 'rgba(250,204,21,0.08)';
            ctx.fill();
            if (cfg.centerRadius) {
                ctx.beginPath();
                ctx.arc(world.x, world.y, cfg.centerRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(254,240,138,0.6)';
                ctx.lineWidth = 1.4;
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    drawManualStrikeMarker(ctx, request) {
        const enemy = request.enemy;
        const tower = request.tower;
        const pulse = 0.62 + Math.sin(Date.now() * 0.014) * 0.18;
        ctx.save();
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 16, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(250,204,21,${0.45 + pulse * 0.35})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(enemy.x - enemy.radius - 22, enemy.y);
        ctx.lineTo(enemy.x + enemy.radius + 22, enemy.y);
        ctx.moveTo(enemy.x, enemy.y - enemy.radius - 22);
        ctx.lineTo(enemy.x, enemy.y + enemy.radius + 22);
        ctx.strokeStyle = `rgba(248,250,252,${0.42 + pulse * 0.25})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(tower.x, tower.y);
        ctx.lineTo(enemy.x, enemy.y);
        ctx.strokeStyle = `rgba(250,204,21,${0.24 + pulse * 0.2})`;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#facc15';
        ctx.fillText('ПОДТВЕРДИ ПКМ', enemy.x, enemy.y - enemy.radius - 24);
        ctx.restore();
    }
    drawBossIntro(ctx) {
        const accent = this.activeBoss?.bossBannerColor || this.bossIntroColor || '#ef4444';
        const name = this.activeBoss?.name || this.bossIntroName;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (this.bossIntroTimer > 0) {
            const introProgress = 1 - this.bossIntroTimer / 2.4;
            const alpha = Math.min(1, 0.35 + introProgress * 1.4);
            const pulse = 0.92 + Math.sin(Date.now() * 0.013) * 0.1;
            const bigScale = 1 + Math.sin(Date.now() * 0.012) * 0.045;
            ctx.fillStyle = `rgba(4,8,12,${0.64 * alpha})`;
            ctx.fillRect(0, 20, CONFIG.CANVAS_WIDTH, 74);
            const grad = ctx.createLinearGradient(0, 20, CONFIG.CANVAS_WIDTH, 20);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.18, accent);
            grad.addColorStop(0.82, accent);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 20, CONFIG.CANVAS_WIDTH, 4);
            ctx.fillRect(0, 90, CONFIG.CANVAS_WIDTH, 2);
            ctx.font = 'bold 15px monospace';
            ctx.fillStyle = `rgba(248,250,252,${alpha})`;
            ctx.fillText('БОСС ВЫШЕЛ НА ПОЛЕ', CONFIG.CANVAS_WIDTH / 2, 42);
            ctx.save();
            ctx.translate(CONFIG.CANVAS_WIDTH / 2, 68);
            ctx.scale(bigScale, bigScale);
            ctx.font = 'bold 28px monospace';
            ctx.fillStyle = accent;
            ctx.fillText(name, 0, 0);
            ctx.restore();
            ctx.strokeStyle = `rgba(255,255,255,${0.2 * pulse})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(28, 30, CONFIG.CANVAS_WIDTH - 56, 50);
        } else {
            ctx.fillStyle = 'rgba(4,8,12,0.38)';
            ctx.fillRect(0, 6, CONFIG.CANVAS_WIDTH, 28);
            ctx.font = 'bold 15px monospace';
            ctx.fillStyle = accent;
            ctx.fillText('БОСС', CONFIG.CANVAS_WIDTH / 2, 20);
            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = 'rgba(248,250,252,0.82)';
            ctx.fillText(name, CONFIG.CANVAS_WIDTH / 2, 32);
        }
        ctx.restore();
    }
    drawEnemyFocus(ctx, enemy, selected) {
        const pulse = 0.55 + Math.sin(Date.now() * 0.008) * 0.2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + (selected ? 10 : 7), 0, Math.PI * 2);
        ctx.strokeStyle = selected ? `rgba(248,250,252,${0.55 + pulse * 0.3})` : `rgba(56,189,248,${0.45 + pulse * 0.25})`;
        ctx.lineWidth = selected ? 3 : 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + (selected ? 15 : 11), 0, Math.PI * 2);
        ctx.strokeStyle = selected ? `rgba(239,68,68,${0.28 + pulse * 0.18})` : `rgba(59,130,246,${0.2 + pulse * 0.15})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
    drawTowerSelection(ctx, tower, primary = false) {
        if (!tower || tower.isDestroyed) return;
        const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.18;
        const bounds = tower.getBounds();
        ctx.save();
        ctx.strokeStyle = primary ? `rgba(250,204,21,${0.7 + pulse * 0.2})` : `rgba(56,189,248,${0.45 + pulse * 0.2})`;
        ctx.lineWidth = primary ? 3 : 2;
        ctx.strokeRect(bounds.left - 4, bounds.top - 4, bounds.width + 8, bounds.height + 8);
        ctx.strokeStyle = primary ? `rgba(255,255,255,${0.28 + pulse * 0.14})` : `rgba(125,211,252,${0.2 + pulse * 0.1})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bounds.left - 8, bounds.top - 8, bounds.width + 16, bounds.height + 16);
        ctx.restore();
    }
    drawSelectionDragOverlay(ctx) {
        const rect = this.getSelectionDragRect();
        if (!rect) return;
        ctx.save();
        ctx.fillStyle = 'rgba(59,130,246,0.12)';
        ctx.strokeStyle = 'rgba(96,165,250,0.85)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
        ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
        ctx.restore();
    }
    drawEnemyHoverInfo(ctx, enemy) {
        const classNames = { light: 'Лёгкий', medium: 'Средний', heavy: 'Тяжёлый' };
        const hp = Math.max(0, Math.round(enemy.hp));
        const screen = this.worldToScreen(enemy.x, enemy.y);
        const lines = [
            enemy.name,
            `HP: ${hp}/${enemy.maxHp}`,
            `Класс: ${classNames[enemy.unitClass] || enemy.unitClass}`
        ];
        const paddingX = 10;
        const paddingTop = 8;
        const lineYs = [paddingTop, paddingTop + 17, paddingTop + 31];
        ctx.save();
        ctx.font = 'bold 12px monospace';
        let width = 0;
        for (const line of lines) width = Math.max(width, ctx.measureText(line).width);
        const boxW = width + paddingX * 2, boxH = 56;
        let x = screen.x + enemy.radius + 14, y = screen.y - boxH - 10;
        if (x + boxW > CONFIG.CANVAS_WIDTH - 6) x = screen.x - boxW - enemy.radius - 14;
        if (y < 6) y = screen.y + enemy.radius + 10;
        x = Math.max(6, Math.min(x, CONFIG.CANVAS_WIDTH - boxW - 6));
        y = Math.max(6, Math.min(y, CONFIG.CANVAS_HEIGHT - boxH - 6));
        ctx.fillStyle = 'rgba(7,10,18,0.92)';
        ctx.strokeStyle = 'rgba(59,130,246,0.45)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y, boxW, boxH);
        ctx.strokeRect(x, y, boxW, boxH);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(lines[0], x + paddingX, y + lineYs[0]);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px monospace';
        ctx.fillText(lines[1], x + paddingX, y + lineYs[1]);
        ctx.fillText(lines[2], x + paddingX, y + lineYs[2]);
        ctx.restore();
    }
    drawTowerHoverInfo(ctx, tower) {
        const cfg = tower.getConfig();
        const screen = this.worldToScreen(tower.x, tower.y);
        const modifiers = cfg.damageModifiers || {};
        const classNames = { light: 'Л', medium: 'С', heavy: 'Т' };
        const hasCombatProfile = !!cfg.damage;
        const format = (cls) => {
            const diff = Math.round(((modifiers[cls] ?? 1) - 1) * 100);
            return `${classNames[cls]}:${diff > 0 ? '+' : ''}${diff}%`;
        };
        const supportLabel = tower.isWall ? 'Барьер на дороге' : tower.isHealer ? 'Поддержка: ремонт' : tower.isFarm ? 'Поддержка: ферма' : tower.isScanner ? 'Поддержка: сканер' : tower.isNukeSilo ? 'Ручной пуск' : tower.isManualAim ? 'Ручной выстрел' : 'Поддержка';
        const supportInfo = tower.isWall
            ? `Прочность ${Math.round(tower.hp)} HP`
            : tower.isHealer ? `Хил ${tower.healRate} HP/с` : tower.isFarm ? `Доход ${tower.farmIncome}💰/раунд` : tower.isScanner ? `Вижен ${tower.invisibleDetectionLevel} · ${tower.scanRadius}px` : tower.isNukeSilo ? `Ракет ${tower.getTotalPayloadCount()} · ${tower.getSelectedPayloadConfig().shortName}` : tower.isManualAim ? `ПКМ · ${tower.fireRate}с` : 'Без урона';
        const lines = hasCombatProfile
            ? [
                cfg.name,
                tower.isBusy() ? tower.getWorkLabel() : 'Классы урона',
                `${format('light')}  ${format('medium')}  ${format('heavy')}`
            ]
            : [
                cfg.name,
                tower.isBusy() ? tower.getWorkLabel() : supportLabel,
                tower.isBusy() ? `Осталось: ${Math.ceil(tower.getRemainingWorkTime())}с` : supportInfo
            ];
        const paddingX = 10;
        const paddingTop = 8;
        const lineYs = [paddingTop, paddingTop + 17, paddingTop + 31];
        ctx.save();
        ctx.font = 'bold 12px monospace';
        let width = 0;
        for (const line of lines) width = Math.max(width, ctx.measureText(line).width);
        const boxW = width + paddingX * 2, boxH = 56;
        let x = screen.x + 18, y = screen.y - boxH - 14;
        if (x + boxW > CONFIG.CANVAS_WIDTH - 6) x = screen.x - boxW - 18;
        if (y < 6) y = screen.y + 18;
        x = Math.max(6, Math.min(x, CONFIG.CANVAS_WIDTH - boxW - 6));
        y = Math.max(6, Math.min(y, CONFIG.CANVAS_HEIGHT - boxH - 6));
        ctx.fillStyle = 'rgba(7,10,18,0.92)';
        ctx.strokeStyle = 'rgba(250,204,21,0.4)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y, boxW, boxH);
        ctx.strokeRect(x, y, boxW, boxH);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(lines[0], x + paddingX, y + lineYs[0]);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px monospace';
        ctx.fillText(lines[1], x + paddingX, y + lineYs[1]);
        ctx.fillText(lines[2], x + paddingX, y + lineYs[2]);
        ctx.restore();
    }
    drawBaseHitOverlay(ctx) {
        const a = this.baseHitFlash;
        ctx.save();
        ctx.fillStyle = 'rgba(180,0,0,' + (0.08 + a * 0.18) + ')';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        const edge = Math.max(90, 150 * a);
        const top = ctx.createLinearGradient(0, 0, 0, edge);
        top.addColorStop(0, 'rgba(140,0,0,' + (0.5 * a) + ')'); top.addColorStop(1, 'rgba(140,0,0,0)');
        ctx.fillStyle = top; ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, edge);
        const bottom = ctx.createLinearGradient(0, CONFIG.CANVAS_HEIGHT, 0, CONFIG.CANVAS_HEIGHT - edge);
        bottom.addColorStop(0, 'rgba(140,0,0,' + (0.55 * a) + ')'); bottom.addColorStop(1, 'rgba(140,0,0,0)');
        ctx.fillStyle = bottom; ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - edge, CONFIG.CANVAS_WIDTH, edge);
        const left = ctx.createLinearGradient(0, 0, edge, 0);
        left.addColorStop(0, 'rgba(120,0,0,' + (0.35 * a) + ')'); left.addColorStop(1, 'rgba(120,0,0,0)');
        ctx.fillStyle = left; ctx.fillRect(0, 0, edge, CONFIG.CANVAS_HEIGHT);
        const right = ctx.createLinearGradient(CONFIG.CANVAS_WIDTH, 0, CONFIG.CANVAS_WIDTH - edge, 0);
        right.addColorStop(0, 'rgba(120,0,0,' + (0.35 * a) + ')'); right.addColorStop(1, 'rgba(120,0,0,0)');
        ctx.fillStyle = right; ctx.fillRect(CONFIG.CANVAS_WIDTH - edge, 0, edge, CONFIG.CANVAS_HEIGHT);
        ctx.strokeStyle = 'rgba(255,80,80,' + (0.15 + a * 0.25) + ')'; ctx.lineWidth = 6 + a * 10;
        ctx.strokeRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.restore();
    }
    drawMiniMap(ctx) {
        if (!this.hasScrollableMap()) return;
        const width = 192;
        const height = 116;
        const x = 14;
        const y = CONFIG.CANVAS_HEIGHT - height - 14;
        ctx.save();
        ctx.fillStyle = 'rgba(6,10,18,0.84)';
        ctx.fillRect(x - 4, y - 4, width + 8, height + 8);
        this.map.renderMiniMap(ctx, x, y, width, height, this.getViewportWorldRect(), this.towers, this.enemies);
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('МИНИКАРТА', x + 8, y + 6);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('ЛКМ - прыжок · тащи рамку · M', x + 8, y + height - 18);
        ctx.restore();
    }
    drawLargeMapOverlay(ctx) {
        if (!this.largeMapOverlayOpen || !this.hasScrollableMap()) return;
        const rect = this.getLargeMapOverlayRect();
        ctx.save();
        ctx.fillStyle = 'rgba(2,6,12,0.82)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        this.map.renderMiniMap(ctx, rect.x, rect.y, rect.width, rect.height, this.getViewportWorldRect(), this.towers, this.enemies);
        ctx.strokeStyle = 'rgba(248,250,252,0.18)';
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x - 10, rect.y - 10, rect.width + 20, rect.height + 20);
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('ПОЛНАЯ КАРТА', CONFIG.CANVAS_WIDTH / 2, rect.y - 34);
        ctx.font = '12px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('Клик по карте мгновенно переносит экран в выбранный участок', CONFIG.CANVAS_WIDTH / 2, rect.y - 14);
        ctx.restore();
    }
    drawPlacementPreview(ctx) {
        const { col, row } = this.hoveredCell;
        const cfg = TOWER_TYPES[this.selectedTowerType];
        const cells = this.getPlacementCells(this.selectedTowerType, col, row);
        const ok = this.canPlaceTowerAt(this.selectedTowerType, col, row) && this.getDisplayGold() >= cfg.cost;
        let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
        for (const cell of cells) {
            if (cell.col < 0 || cell.col >= this.getGridCols() || cell.row < 0 || cell.row >= this.getGridRows()) continue;
            const x = cell.col * CONFIG.CELL_SIZE, y = cell.row * CONFIG.CELL_SIZE;
            ctx.fillStyle = ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)';
            ctx.fillRect(x, y, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
            ctx.strokeStyle = ok ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)';
            ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, CONFIG.CELL_SIZE - 2, CONFIG.CELL_SIZE - 2);
            minCol = Math.min(minCol, cell.col); maxCol = Math.max(maxCol, cell.col);
            minRow = Math.min(minRow, cell.row); maxRow = Math.max(maxRow, cell.row);
        }
        if (!ok || minCol === Infinity) return;
        const centerX = (minCol + maxCol + 1) * CONFIG.CELL_SIZE / 2;
        const centerY = (minRow + maxRow + 1) * CONFIG.CELL_SIZE / 2;
        const rng = cfg.range || cfg.scanRadius || cfg.healRadius || 0;
        if (cfg.isAirfield) {
            ctx.beginPath(); ctx.arc(centerX, centerY, cfg.orbitRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(148,163,184,0.28)'; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.beginPath(); ctx.arc(centerX + cfg.orbitRadius, centerY, cfg.airAttackRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(96,165,250,0.28)'; ctx.lineWidth = 1.2; ctx.stroke();
            return;
        }
        if (rng) {
            ctx.beginPath(); ctx.arc(centerX, centerY, rng, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(200,200,200,0.2)'; ctx.lineWidth = 1; ctx.stroke();
        }
    }
    applyRemoteCommand(command) {
        if (!command || this.isRemoteViewer()) return;
        if (command.type === 'placeTower') {
            this.tryPlaceTower(command.col, command.row, {
                towerType: command.towerType,
                ownerId: command.playerKey || command.ownerId || 'p2',
                fromNetwork: true,
            });
            return;
        }
        if (command.type === 'upgradeTower') {
            this.upgradeTower(this.findTowerForNetworkRef(command), {
                ownerId: command.playerKey || command.ownerId || 'p2',
                fromNetwork: true,
            });
            return;
        }
        if (command.type === 'sellTower') {
            this.sellTower(this.findTowerForNetworkRef(command), {
                ownerId: command.playerKey || command.ownerId || 'p2',
                fromNetwork: true,
            });
            return;
        }
        if (command.type === 'selectPayload') {
            this.selectTowerPayload(this.findTowerForNetworkRef(command), command.kind, {
                ownerId: command.playerKey || command.ownerId || 'p2',
                fromNetwork: true,
            });
            return;
        }
        if (command.type === 'buyPayload') {
            this.buyTowerPayload(this.findTowerForNetworkRef(command), command.kind, {
                ownerId: command.playerKey || command.ownerId || 'p2',
                fromNetwork: true,
            });
            return;
        }
        if (command.type === 'playerLeft') {
            this.endCoopSession('Игрок вышел, поэтому игра закончена');
            return;
        }
        if (command.type === 'skipCountdown' && (command.playerKey || command.ownerId) === 'p1') {
            this.skipCountdown();
        }
    }
    createSnapshot() {
        return {
            version: 1,
            active: this.gameState !== 'menu',
            mapId: this.selectedMapId,
            difficultyId: this.selectedDifficultyId,
            gameState: this.gameState,
            isPaused: this.isPaused,
            gameSpeed: this.gameSpeed,
            lives: this.lives,
            currentWave: this.currentWave,
            maxWaveReached: this.maxWaveReached,
            waveCountdown: this.waveCountdown,
            waveSpawningDone: this.waveSpawningDone,
            playerGold: { ...this.playerGold },
            towers: this.towers.filter(t => !t.isDestroyed).map(t => t.toSnapshot()),
            enemies: this.enemies.filter(e => !e.isDead && !e.reachedEnd).map(e => e.toSnapshot()),
        };
    }
    applySnapshot(snapshot) {
        if (!snapshot || !this.isRemoteViewer()) return;
        if (snapshot.mapId && snapshot.mapId !== this.selectedMapId) this.selectMap(snapshot.mapId, { fromSnapshot: true });
        this.selectedDifficultyId = snapshot.difficultyId || this.selectedDifficultyId;
        this.gameState = snapshot.gameState || this.gameState;
        this.isPaused = !!snapshot.isPaused;
        this.gameSpeed = snapshot.gameSpeed || this.gameSpeed;
        this.lives = snapshot.lives ?? this.lives;
        this.currentWave = snapshot.currentWave ?? this.currentWave;
        this.maxWaveReached = snapshot.maxWaveReached ?? this.maxWaveReached;
        this.waveCountdown = snapshot.waveCountdown ?? this.waveCountdown;
        this.waveSpawningDone = !!snapshot.waveSpawningDone;
        this.playerGold = { p1: 0, p2: 0, ...(snapshot.playerGold || {}) };
        this.syncTowerSnapshots(snapshot.towers || []);
        this.syncEnemySnapshots(snapshot.enemies || []);
        this.projectiles = [];
        this.syncMapOccupancy();
        this.ui.updateLives(this.lives);
        this.ui.updateWave(this.currentWave);
        this.syncVisibleGold();
        this.ui.updateTowerButtons();
        if (this.gameState === 'menu' || this.ui.startScreen?.style.display !== 'none') {
            this.ui.refreshMapSelection?.();
            this.ui.refreshDifficultySelection?.();
        }
        if (this.gameState === 'countdown') this.ui.updateCountdown(Math.max(0, this.waveCountdown), this.getCurrentSkipBonus());
        else if (this.gameState === 'playing') this.ui.showWaveActive(this.currentWave);
        this.ui.applyMultiplayerRoleState?.();
        if (snapshot.active) this.ui.hideStartScreen();
    }
    syncTowerSnapshots(towerSnapshots) {
        const selectedId = this.selectedTower?.id || null;
        const selectedIds = new Set((this.selectedTowers || []).map(t => t.id));
        const byId = new Map(this.towers.map(t => [t.id, t]));
        const next = [];
        for (const data of towerSnapshots) {
            let tower = (data.id && byId.get(data.id))
                || this.towers.find(t => !next.includes(t) && !t.isDestroyed && t.col === data.col && t.row === data.row && t.type === data.type);
            if (!tower) tower = new Tower(data.col, data.row, data.type);
            tower.applySnapshot(data);
            next.push(tower);
        }
        this.towers = next;
        this.selectedTower = selectedId ? (this.towers.find(t => t.id === selectedId) || null) : null;
        this.selectedTowers = this.towers.filter(t => selectedIds.has(t.id));
        if (this.selectedTower && !this.selectedTowers.includes(this.selectedTower)) this.selectedTowers.unshift(this.selectedTower);
        if (!this.selectedTower && this.selectedTowers.length) this.selectedTower = this.selectedTowers[0];
    }
    syncEnemySnapshots(enemySnapshots) {
        const selectedId = this.selectedEnemy?.id || null;
        const byId = new Map(this.enemies.map(e => [e.id, e]));
        const next = [];
        for (const data of enemySnapshots) {
            let enemy = data.id ? byId.get(data.id) : null;
            if (!enemy) {
                enemy = new Enemy(data.type, this.map, {
                    id: data.id,
                    hp: data.maxHp,
                    speed: data.baseSpeed,
                    reward: data.reward,
                    isBoss: data.isBoss,
                    bossStage: data.bossStage,
                    bossPersona: data.bossPersona,
                });
                enemy.applySnapshot(data, false);
            } else {
                enemy.applySnapshot(data, true);
            }
            next.push(enemy);
        }
        this.enemies = next;
        this.selectedEnemy = selectedId ? (this.enemies.find(e => e.id === selectedId) || null) : null;
    }
    applyCoopHpBoostToAliveEnemies() {
        for (const enemy of this.enemies) {
            if (enemy.isDead || enemy.reachedEnd || enemy.coopBoosted) continue;
            enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * 1.75));
            enemy.hp = Math.max(1, Math.round(enemy.hp * 1.75));
            enemy.coopBoosted = true;
        }
    }
    endCoopSession(message = 'Игрок вышел, поэтому игра закончена') {
        this.gameState = 'ended';
        this.isPaused = true;
        this.selectedTowerType = null;
        this.clearTowerSelection(true);
        this.clearSelectedAbility?.();
        this.multiplayer?.disconnectLocally?.();
        this.ui.showSessionEnded?.(message);
        this.ui.applyMultiplayerRoleState?.();
    }
    gameLoop(ts) { const dt = Math.min((ts - this.lastTime) / 1000, 0.1); this.lastTime = ts; this.update(dt); this.render(); requestAnimationFrame((t) => this.gameLoop(t)); }
    restart() {
        if (this.isRoomActive()) {
            this.multiplayer?.leaveRoom?.();
            return;
        }
        if (this.gameState === 'ended') {
            this.resetMatchState(true);
            return;
        }
        this.resetMatchState(false);
    }
}
window.addEventListener('DOMContentLoaded', () => { window.game = new Game(); });
