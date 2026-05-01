class Tower {
    constructor(col, row, type) {
        Tower.nextId = Tower.nextId || 1;
        this.id = `tw${Tower.nextId++}`;
        this.col = col; this.row = row; this.type = type; this.level = 1;
        this.targetMode = 'first';
        const cfg = TOWER_TYPES[type];
        this.footprint = (cfg.footprint || [{ x: 0, y: 0 }]).map(cell => ({ x: cell.x, y: cell.y }));
        this.damage = cfg.damage; this.range = cfg.range; this.fireRate = cfg.fireRate;
        this.aoeRadius = cfg.aoeRadius || 0; this.chainTargets = cfg.chainTargets || 0;
        this.splashDamageMultiplier = cfg.splashDamageMultiplier || 1;
        this.splashDamageBands = cfg.splashDamageBands || null;
        this.projectileSpeedMultiplier = cfg.projectileSpeedMultiplier || 1;
        this.maxHp = cfg.hp || 200; this.hp = this.maxHp;
        this.isScanner = cfg.isScanner || false; this.scanRadius = cfg.scanRadius || 0;
        this.invisibleDetectionLevel = cfg.detectionLevel || 0;
        this.isHealer = cfg.isHealer || false; this.healRadius = cfg.healRadius || 0; this.healRate = cfg.healRate || 0;
        this.isFarm = cfg.isFarm || false; this.farmIncome = cfg.farmIncome || 0;
        this.isWall = cfg.isWall || false;
        this.isPulseTower = cfg.isPulseTower || false;
        this.isAirfield = cfg.isAirfield || false;
        this.isNukeSilo = cfg.isNukeSilo || false;
        this.isFactory = cfg.isFactory || false;
        this.vehicleCost = cfg.vehicleCost || 0;
        this.vehicleBuildTime = cfg.vehicleBuildTime || 0;
        this.vehicleHp = cfg.vehicleHp || 0;
        this.vehicleSpeed = cfg.vehicleSpeed || 0;
        this.vehicleBuildTimer = 0;
        this.vehicleBuildDuration = 0;
        this.isDjBooth = cfg.isDjBooth || false;
        this.buffPercent = cfg.buffPercent || 0;
        this.supportBuff = 0;
        this.lastSupportBuff = 0;
        this.isManualAim = cfg.isManualAim || false;
        this.slowFactor = cfg.slowFactor || 1;
        this.slowDuration = cfg.slowDuration || 0;
        this.orbitRadius = cfg.orbitRadius || 0;
        this.airAttackRadius = cfg.airAttackRadius || 0;
        this.orbitSpeed = cfg.orbitSpeed || 0;
        this.takeoffTime = cfg.takeoffTime || 1.5;
        this.rocketDamage = cfg.rocketDamage || 0;
        this.rocketAoeRadius = cfg.rocketAoeRadius || 0;
        this.rocketCooldownDuration = cfg.rocketCooldown || 999;
        this.rocketSplashBands = cfg.rocketSplashBands || null;
        this.airAngle = Math.random() * Math.PI * 2;
        this.airLaunchProgress = 0;
        this.rocketTimer = this.rocketCooldownDuration;
        const bounds = this.getBounds();
        this.x = bounds.centerX;
        this.y = bounds.centerY;
        this.cooldown = 0; this.target = null; this.turretAngle = 0;
        this.totalInvested = cfg.cost; this.isDestroyed = false; this.muzzleFlash = 0;
        this.ownerId = 'p1';
        this.canSeeInvisible = this.invisibleDetectionLevel > 0;
        this.buildDuration = cfg.buildTime || 0; this.buildTimer = this.buildDuration;
        this.upgradeDuration = 0; this.upgradeTimer = 0; this.pendingUpgrade = null;
        this.disabledTimer = 0;
        this.fortressTimer = 0;
        this.workSoundTimer = 0.18 + Math.random() * 0.2;
        this.payloadStock = { tactical: 0, strategic: 0, tsar: 0 };
        this.selectedPayload = 'tactical';
        this.launchFlash = 0;
    }
    getConfig() { return TOWER_TYPES[this.type]; }
    getBuffMultiplier() { return 1 + (this.supportBuff || 0); }
    getEffectiveDamage() { return this.damage * this.getBuffMultiplier(); }
    getEffectiveRange() { return this.range * this.getBuffMultiplier(); }
    getEffectiveAoeRadius() { return this.aoeRadius * this.getBuffMultiplier(); }
    getEffectiveMaxHp() { return Math.max(1, Math.round(this.maxHp * this.getBuffMultiplier())); }
    getEffectiveFarmIncome() { return Math.max(0, Math.round(this.farmIncome * this.getBuffMultiplier())); }
    getEffectiveHealRate() { return this.healRate * this.getBuffMultiplier(); }
    getEffectiveHealRadius() { return this.healRadius * this.getBuffMultiplier(); }
    getEffectiveAirAttackRadius() { return this.airAttackRadius * this.getBuffMultiplier(); }
    getEffectiveFireRate() {
        const fortressMultiplier = this.isFortified() ? (ABILITY_TYPES.fortress.fireRateMultiplier || 1) : 1;
        const supportMultiplier = this.getBuffMultiplier();
        return Math.max(0.05, this.fireRate / fortressMultiplier / supportMultiplier);
    }
    toSnapshot() {
        return {
            id: this.id,
            col: this.col, row: this.row, type: this.type, level: this.level, ownerId: this.ownerId || 'p1',
            hp: this.hp, maxHp: this.maxHp, damage: this.damage, range: this.range, fireRate: this.fireRate,
            aoeRadius: this.aoeRadius, chainTargets: this.chainTargets, farmIncome: this.farmIncome,
            scanRadius: this.scanRadius, healRadius: this.healRadius, healRate: this.healRate,
            totalInvested: this.totalInvested, isDestroyed: this.isDestroyed,
            buildTimer: this.buildTimer, buildDuration: this.buildDuration,
            upgradeTimer: this.upgradeTimer, upgradeDuration: this.upgradeDuration,
            cooldown: this.cooldown, turretAngle: this.turretAngle, muzzleFlash: this.muzzleFlash,
            selectedPayload: this.selectedPayload, payloadStock: { ...(this.payloadStock || {}) },
            airAngle: this.airAngle, airLaunchProgress: this.airLaunchProgress, rocketTimer: this.rocketTimer,
            disabledTimer: this.disabledTimer, fortressTimer: this.fortressTimer,
            vehicleCost: this.vehicleCost, vehicleBuildTime: this.vehicleBuildTime,
            vehicleHp: this.vehicleHp, vehicleSpeed: this.vehicleSpeed,
            vehicleBuildTimer: this.vehicleBuildTimer, vehicleBuildDuration: this.vehicleBuildDuration,
            vehicleBuildOwnerId: this.vehicleBuildOwnerId,
            buffPercent: this.buffPercent, supportBuff: this.supportBuff,
        };
    }
    applySnapshot(data) {
        if (!data) return this;
        if (data.id) this.id = data.id;
        this.level = data.level ?? this.level;
        this.ownerId = data.ownerId || this.ownerId || 'p1';
        this.hp = data.hp ?? this.hp;
        this.maxHp = data.maxHp ?? this.maxHp;
        this.damage = data.damage ?? this.damage;
        this.range = data.range ?? this.range;
        this.fireRate = data.fireRate ?? this.fireRate;
        this.aoeRadius = data.aoeRadius ?? this.aoeRadius;
        this.chainTargets = data.chainTargets ?? this.chainTargets;
        this.farmIncome = data.farmIncome ?? this.farmIncome;
        this.scanRadius = data.scanRadius ?? this.scanRadius;
        this.healRadius = data.healRadius ?? this.healRadius;
        this.healRate = data.healRate ?? this.healRate;
        this.totalInvested = data.totalInvested ?? this.totalInvested;
        this.isDestroyed = !!data.isDestroyed;
        this.buildTimer = data.buildTimer ?? this.buildTimer;
        this.buildDuration = data.buildDuration ?? this.buildDuration;
        this.upgradeTimer = data.upgradeTimer ?? this.upgradeTimer;
        this.upgradeDuration = data.upgradeDuration ?? this.upgradeDuration;
        this.cooldown = data.cooldown ?? this.cooldown;
        this.turretAngle = data.turretAngle ?? this.turretAngle;
        this.muzzleFlash = data.muzzleFlash ?? this.muzzleFlash;
        this.selectedPayload = data.selectedPayload || this.selectedPayload;
        this.payloadStock = data.payloadStock ? { ...data.payloadStock } : this.payloadStock;
        this.airAngle = data.airAngle ?? this.airAngle;
        this.airLaunchProgress = data.airLaunchProgress ?? this.airLaunchProgress;
        this.rocketTimer = data.rocketTimer ?? this.rocketTimer;
        this.disabledTimer = data.disabledTimer ?? this.disabledTimer;
        this.fortressTimer = data.fortressTimer ?? this.fortressTimer;
        this.vehicleCost = data.vehicleCost ?? this.vehicleCost;
        this.vehicleBuildTime = data.vehicleBuildTime ?? this.vehicleBuildTime;
        this.vehicleHp = data.vehicleHp ?? this.vehicleHp;
        this.vehicleSpeed = data.vehicleSpeed ?? this.vehicleSpeed;
        this.vehicleBuildTimer = data.vehicleBuildTimer ?? this.vehicleBuildTimer;
        this.vehicleBuildDuration = data.vehicleBuildDuration ?? this.vehicleBuildDuration;
        this.vehicleBuildOwnerId = data.vehicleBuildOwnerId || this.vehicleBuildOwnerId;
        this.buffPercent = data.buffPercent ?? this.buffPercent;
        this.supportBuff = data.supportBuff ?? this.supportBuff;
        return this;
    }
    updateRemotePresentation(dt) {
        this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
        this.launchFlash = Math.max(0, this.launchFlash - dt);
        this.disabledTimer = Math.max(0, this.disabledTimer - dt);
        this.fortressTimer = Math.max(0, this.fortressTimer - dt);
        if (this.buildTimer > 0) this.buildTimer = Math.max(0, this.buildTimer - dt);
        if (this.upgradeTimer > 0) this.upgradeTimer = Math.max(0, this.upgradeTimer - dt);
        if (this.vehicleBuildTimer > 0) this.vehicleBuildTimer = Math.max(0, this.vehicleBuildTimer - dt);
        if (this.isAirfield) {
            this.airLaunchProgress = Math.min(1, this.airLaunchProgress + dt / Math.max(0.1, this.takeoffTime || 1));
            this.airAngle += (this.orbitSpeed || 0) * dt;
            this.rocketTimer = Math.max(0, this.rocketTimer - dt);
        }
    }
    getFootprintCells(anchorCol = this.col, anchorRow = this.row) {
        return this.footprint.map(cell => ({ col: anchorCol + cell.x, row: anchorRow + cell.y }));
    }
    occupiesCell(col, row) {
        return this.getFootprintCells().some(cell => cell.col === col && cell.row === row);
    }
    getBounds() {
        const cells = this.getFootprintCells();
        const cols = cells.map(cell => cell.col);
        const rows = cells.map(cell => cell.row);
        const minCol = Math.min(...cols), maxCol = Math.max(...cols);
        const minRow = Math.min(...rows), maxRow = Math.max(...rows);
        const left = minCol * CONFIG.CELL_SIZE;
        const top = minRow * CONFIG.CELL_SIZE;
        const width = (maxCol - minCol + 1) * CONFIG.CELL_SIZE;
        const height = (maxRow - minRow + 1) * CONFIG.CELL_SIZE;
        return { left, top, width, height, centerX: left + width / 2, centerY: top + height / 2, minCol, maxCol, minRow, maxRow };
    }
    getPlanePosition() {
        const orbitRadius = this.orbitRadius * this.airLaunchProgress;
        const bob = Math.sin(Date.now() * 0.004 + this.airAngle) * 6;
        return {
            x: this.x + Math.cos(this.airAngle) * orbitRadius,
            y: this.y + Math.sin(this.airAngle) * orbitRadius * 0.72 - 10 - bob,
            radius: this.airAttackRadius || 0,
        };
    }
    pickTarget(candidates, originX = this.x, originY = this.y) {
        if (!candidates.length) return null;
        switch (this.targetMode) {
            case 'first': return candidates.reduce((a, b) => a.distance > b.distance ? a : b);
            case 'last': return candidates.reduce((a, b) => a.distance < b.distance ? a : b);
            case 'strong': return candidates.reduce((a, b) => a.hp > b.hp ? a : b);
            case 'close': return candidates.reduce((a, b) => Math.hypot(a.x - originX, a.y - originY) < Math.hypot(b.x - originX, b.y - originY) ? a : b);
            default: return candidates[0];
        }
    }
    getDamageAgainst(enemy) {
        const modifiers = this.getConfig().damageModifiers;
        const mult = modifiers && enemy ? (modifiers[enemy.unitClass] ?? 1) : 1;
        return this.getEffectiveDamage() * mult;
    }
    getPayloadStock(kind) { return this.payloadStock?.[kind] || 0; }
    getSelectedPayloadConfig() { return NUCLEAR_PAYLOADS[this.selectedPayload] || NUCLEAR_PAYLOADS.tactical; }
    getTotalPayloadCount() {
        return Object.values(this.payloadStock || {}).reduce((sum, value) => sum + value, 0);
    }
    selectPayload(kind) {
        if (!NUCLEAR_PAYLOADS[kind]) return false;
        this.selectedPayload = kind;
        return true;
    }
    cyclePayload(step = 1) {
        const kinds = Object.keys(NUCLEAR_PAYLOADS);
        const index = kinds.indexOf(this.selectedPayload);
        this.selectedPayload = kinds[(index + step + kinds.length) % kinds.length];
        return this.selectedPayload;
    }
    addPayload(kind) {
        if (!NUCLEAR_PAYLOADS[kind]) return false;
        this.payloadStock[kind] = (this.payloadStock[kind] || 0) + 1;
        this.selectedPayload = kind;
        return true;
    }
    canLaunchSelectedPayload() {
        return this.isNukeSilo && !this.isDestroyed && !this.isBusy() && !this.isDisabled() && this.getPayloadStock(this.selectedPayload) > 0;
    }
    launchSelectedPayload(target, projectiles) {
        const payloadKind = this.selectedPayload;
        const payload = NUCLEAR_PAYLOADS[payloadKind];
        if (!this.isNukeSilo || !payload || !target || !this.canLaunchSelectedPayload()) return null;
        const pointLockedPayload = payloadKind !== 'tactical';
        const projectileTarget = pointLockedPayload ? {
            x: target.x,
            y: target.y,
            isPointTarget: true,
        } : target;
        this.selectedPayload = payloadKind;
        this.payloadStock[payloadKind] = Math.max(0, (this.payloadStock[payloadKind] || 0) - 1);
        const startY = this.y - CONFIG.CELL_SIZE * 0.62;
        projectiles.push(new Projectile(
            this.x, startY, projectileTarget, payload.damage, payload.color, payload.size,
            this, payload.aoeRadius, 0, 1, payload.splashDamageBands, payload.speedMultiplier,
            {
                style: payload.renderStyle,
                altitude: payload.maxAltitude,
                directHitRadius: payload.directHitRadius,
                directHitMultiplier: payload.directHitMultiplier,
                impactEffect: payload.impactEffect,
                impactSound: payload.impactSound,
                burnDps: payload.burnDps,
                burnDuration: payload.burnDuration,
                payloadKind,
                lockTargetPoint: pointLockedPayload,
                targetTracks: !pointLockedPayload,
            }
        ));
        this.launchFlash = 0.32;
        if (window.audio) window.audio.playNukeLaunch(payload.launchSound);
        return payload;
    }
    canUpgrade() { return this.level <= this.getConfig().upgrades.length; }
    getUpgradeCost() { return this.canUpgrade() ? this.getConfig().upgrades[this.level - 1].cost : 0; }
    getUpgradeTime() { return this.canUpgrade() ? (this.getConfig().upgradeTimes?.[this.level - 1] || 0) : 0; }
    isConstructing() { return this.buildTimer > 0; }
    isUpgrading() { return this.upgradeTimer > 0; }
    isBusy() { return this.isConstructing() || this.isUpgrading(); }
    isDisabled() { return this.disabledTimer > 0; }
    isFortified() { return this.fortressTimer > 0; }
    getBusyProgress() {
        if (this.isConstructing()) return this.buildDuration > 0 ? 1 - this.buildTimer / this.buildDuration : 1;
        if (this.isUpgrading()) return this.upgradeDuration > 0 ? 1 - this.upgradeTimer / this.upgradeDuration : 1;
        return 1;
    }
    getRemainingWorkTime() { return this.isConstructing() ? this.buildTimer : (this.isUpgrading() ? this.upgradeTimer : 0); }
    getWorkLabel() { return this.isConstructing() ? 'СТРОЙКА' : (this.isUpgrading() ? 'АПГРЕЙД' : 'ГОТОВО'); }
    applyUpgradeData(u) {
        if (u.damage !== undefined) this.damage = u.damage;
        if (u.range !== undefined) this.range = u.range;
        if (u.aoeRadius !== undefined) this.aoeRadius = u.aoeRadius;
        if (u.chainTargets !== undefined) this.chainTargets = u.chainTargets;
        if (u.splashDamageMultiplier !== undefined) this.splashDamageMultiplier = u.splashDamageMultiplier;
        if (u.splashDamageBands !== undefined) this.splashDamageBands = u.splashDamageBands;
        if (u.projectileSpeedMultiplier !== undefined) this.projectileSpeedMultiplier = u.projectileSpeedMultiplier;
        if (u.scanRadius !== undefined) this.scanRadius = u.scanRadius;
        if (u.detectionLevel !== undefined) this.invisibleDetectionLevel = u.detectionLevel;
        if (u.healRadius !== undefined) this.healRadius = u.healRadius;
        if (u.healRate !== undefined) this.healRate = u.healRate;
        if (u.farmIncome !== undefined) this.farmIncome = u.farmIncome;
        if (u.fireRate !== undefined) this.fireRate = u.fireRate;
        if (u.slowFactor !== undefined) this.slowFactor = u.slowFactor;
        if (u.slowDuration !== undefined) this.slowDuration = u.slowDuration;
        if (u.rocketDamage !== undefined) this.rocketDamage = u.rocketDamage;
        if (u.rocketAoeRadius !== undefined) this.rocketAoeRadius = u.rocketAoeRadius;
        if (u.rocketCooldown !== undefined) { this.rocketCooldownDuration = u.rocketCooldown; this.rocketTimer = Math.min(this.rocketTimer, this.rocketCooldownDuration); }
        if (u.rocketSplashBands !== undefined) this.rocketSplashBands = u.rocketSplashBands;
        if (u.vehicleCost !== undefined) this.vehicleCost = u.vehicleCost;
        if (u.vehicleBuildTime !== undefined) this.vehicleBuildTime = u.vehicleBuildTime;
        if (u.vehicleHp !== undefined) this.vehicleHp = u.vehicleHp;
        if (u.vehicleSpeed !== undefined) this.vehicleSpeed = u.vehicleSpeed;
        if (u.buffPercent !== undefined) this.buffPercent = u.buffPercent;
        if (u.hp !== undefined) { this.maxHp = u.hp; this.hp = Math.min(this.hp + 40, this.maxHp); }
        this.canSeeInvisible = this.invisibleDetectionLevel > 0;
    }
    upgrade() {
        if (!this.canUpgrade() || this.isBusy()) return false;
        const u = this.getConfig().upgrades[this.level - 1];
        this.totalInvested += u.cost;
        const duration = this.getUpgradeTime();
        if (duration <= 0) { this.applyUpgradeData(u); this.level++; return true; }
        this.pendingUpgrade = u;
        this.upgradeDuration = duration;
        this.upgradeTimer = duration;
        this.workSoundTimer = 0.12;
        this.target = null;
        this.muzzleFlash = 0;
        return true;
    }
    getSellValue() { return Math.floor(this.totalInvested * CONFIG.SELL_RATIO); }
    applyFortress(duration) {
        this.fortressTimer = Math.max(this.fortressTimer, duration || 0);
    }
    takeTowerDamage(amount) {
        if (this.isFortified()) return;
        this.hp -= amount;
        if (this.hp <= 0) { this.hp = 0; this.isDestroyed = true; }
    }
    applyDisable(duration) { this.disabledTimer = Math.max(this.disabledTimer, duration); this.target = null; this.muzzleFlash = 0; }
    findTarget(enemies) {
        const inRange = enemies.filter(e => {
            if (e.isDead || e.reachedEnd) return false;
            if (e.isInvisible && this.invisibleDetectionLevel < (e.invisibilityLevel || 1)) return false;
            return Math.hypot(e.x - this.x, e.y - this.y) <= this.getEffectiveRange();
        });
        this.target = this.pickTarget(inRange, this.x, this.y);
    }
    canManualShootTarget(enemy) {
        if (!this.isManualAim || this.isDestroyed || this.isBusy() || this.isDisabled() || this.cooldown > 0) return false;
        if (!enemy || enemy.isDead || enemy.reachedEnd) return false;
        if (enemy.isInvisible && this.invisibleDetectionLevel < (enemy.invisibilityLevel || 1)) return false;
        return Math.hypot(enemy.x - this.x, enemy.y - this.y) <= this.getEffectiveRange();
    }
    manualShoot(projectiles, enemy) {
        if (!this.canManualShootTarget(enemy)) return false;
        this.target = enemy;
        this.turretAngle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        this.shoot(projectiles, enemy);
        this.cooldown = this.getEffectiveFireRate();
        this.muzzleFlash = 0.12;
        return true;
    }
    update(dt, enemies, projectiles) {
        if (this.isDestroyed) return;
        this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
        this.disabledTimer = Math.max(0, this.disabledTimer - dt);
        this.fortressTimer = Math.max(0, this.fortressTimer - dt);
        this.launchFlash = Math.max(0, this.launchFlash - dt);
        if (this.isConstructing()) {
            this.buildTimer = Math.max(0, this.buildTimer - dt);
            this.workSoundTimer -= dt;
            if (this.workSoundTimer <= 0) {
                if (window.audio) window.audio.playConstruction();
                this.workSoundTimer = 0.42 + Math.random() * 0.28;
            }
            if (!this.isConstructing() && window.audio) window.audio.playPlace();
            this.target = null;
            return;
        }
        if (this.isUpgrading()) {
            this.upgradeTimer = Math.max(0, this.upgradeTimer - dt);
            this.workSoundTimer -= dt;
            if (this.workSoundTimer <= 0) {
                if (window.audio) window.audio.playConstruction();
                this.workSoundTimer = 0.38 + Math.random() * 0.24;
            }
            if (!this.isUpgrading() && this.pendingUpgrade) {
                this.applyUpgradeData(this.pendingUpgrade);
                this.pendingUpgrade = null;
                this.upgradeDuration = 0;
                this.level++;
                if (window.audio) window.audio.playUpgrade();
            }
            this.target = null;
            return;
        }
        if (this.isDisabled()) {
            this.target = null;
            return;
        }
        if (this.isAirfield) { this.updateAirfield(dt, enemies, projectiles); return; }
        if (this.isNukeSilo) return;
        if (this.isPulseTower) { this.updatePulseTower(dt, enemies); return; }
        if (this.isScanner || this.isHealer || this.isFarm || this.isWall || this.isFactory || this.isDjBooth) return;
        this.cooldown -= dt;
        if (this.isManualAim) {
            this.target = null;
            return;
        }
        this.findTarget(enemies);
        if (this.target) {
            this.turretAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            if (this.cooldown <= 0) { this.shoot(projectiles); this.cooldown = this.getEffectiveFireRate(); this.muzzleFlash = 0.08; }
        }
    }
    updatePulseTower(dt, enemies) {
        this.cooldown -= dt;
        const effectiveRange = this.getEffectiveRange();
        const visibleEnemies = enemies.filter(e => !e.isDead && !e.reachedEnd && (!e.isInvisible || this.invisibleDetectionLevel >= (e.invisibilityLevel || 1)) && Math.hypot(e.x - this.x, e.y - this.y) <= effectiveRange);
        if (!visibleEnemies.length || this.cooldown > 0) return;
        for (const enemy of visibleEnemies) enemy.takeDamage(this.getDamageAgainst(enemy));
        this.cooldown = this.getEffectiveFireRate();
        this.muzzleFlash = 0.24;
        if (window.game) {
            window.game.effects.push(new Effect(this.x, this.y, 'explosion', null, effectiveRange));
            window.game.floatingTexts.push(new FloatingText(this.x, this.y - effectiveRange * 0.25, 'ИМПУЛЬС', '#818cf8'));
        }
        if (window.audio) window.audio.playShot(this.type);
    }
    updateAirfield(dt, enemies, projectiles) {
        this.cooldown -= dt;
        this.rocketTimer = Math.max(0, this.rocketTimer - dt);
        this.airLaunchProgress = Math.min(1, this.airLaunchProgress + dt / this.takeoffTime);
        this.airAngle += this.orbitSpeed * dt;
        const plane = this.getPlanePosition();
        const attackRadius = this.getEffectiveAirAttackRadius();
        const inZone = enemies.filter(e => {
            if (e.isDead || e.reachedEnd) return false;
            if (e.isInvisible && this.invisibleDetectionLevel < (e.invisibilityLevel || 1)) return false;
            return Math.hypot(e.x - plane.x, e.y - plane.y) <= attackRadius;
        });
        const planeTarget = this.pickTarget(inZone, plane.x, plane.y);
        if (planeTarget && this.cooldown <= 0) {
            this.shoot(projectiles, planeTarget, plane.x, plane.y);
            this.cooldown = this.getEffectiveFireRate();
            this.muzzleFlash = 0.12;
        }
        if (this.rocketDamage > 0 && this.rocketAoeRadius > 0 && this.rocketTimer <= 0) {
            const rocketTarget = this.pickTarget(enemies.filter(e => {
                if (e.isDead || e.reachedEnd) return false;
                if (e.isInvisible && this.invisibleDetectionLevel < (e.invisibilityLevel || 1)) return false;
                return Math.hypot(e.x - plane.x, e.y - plane.y) <= attackRadius * 1.35;
            }), plane.x, plane.y);
            if (rocketTarget) {
                projectiles.push(new Projectile(
                    plane.x, plane.y - 12, rocketTarget, this.rocketDamage * this.getBuffMultiplier(), '#f59e0b', 8,
                    this, this.rocketAoeRadius * this.getBuffMultiplier(), 0, 1, this.rocketSplashBands, 0.54, { style: 'bomb', altitude: 56, lockTargetPoint: true, directHitRadius: 14 }
                ));
                this.rocketTimer = this.rocketCooldownDuration;
                if (window.audio) window.audio.playShot('grenade');
            }
        }
    }
    getBarrelProfile() {
        const profiles = {
            pistol: { length: 34, width: 11, color: '#cbd5e1', glow: '#facc15', kind: 'compact', artWidth: 54, pivot: 0.24, muzzle: 31 },
            machinegun: { length: 43, width: 16, color: '#9ca3af', glow: '#fde047', kind: 'shroud', artWidth: 68, pivot: 0.22, muzzle: 42 },
            rifle: { length: 42, width: 10, color: '#d6b28b', glow: '#fb923c', kind: 'rifle', artWidth: 70, pivot: 0.22, muzzle: 42 },
            flamethrower: { length: 34, width: 13, color: '#b45309', glow: '#fb923c', cone: true, artWidth: 62, pivot: 0.22, muzzle: 35 },
            sniper: { length: 50, width: 7, color: '#94a3b8', glow: '#ef4444', artWidth: 74, pivot: 0.23, muzzle: 49 },
            grenade: { length: 36, width: 15, color: '#6b7f45', glow: '#ff5722', artWidth: 60, pivot: 0.24, muzzle: 35 },
            cryo: { length: 41, width: 12, color: '#67e8f9', glow: '#67e8f9', artWidth: 64, pivot: 0.23, muzzle: 40 },
            rocket: { length: 38, width: 17, color: '#9ca3af', glow: '#ef4444', pods: true, artWidth: 62, pivot: 0.24, muzzle: 37 },
            tesla: { length: 34, width: 12, color: '#60a5fa', glow: '#60a5fa', orb: true, artWidth: 58, pivot: 0.22, muzzle: 35 },
            railgun: { length: 54, width: 10, color: '#93c5fd', glow: '#60a5fa', rail: true, artWidth: 78, pivot: 0.22, muzzle: 53 },
        };
        return profiles[this.type] || null;
    }
    getMuzzlePoint(originX = this.x, originY = this.y) {
        const profile = this.getBarrelProfile();
        const length = profile ? (profile.muzzle || profile.length) : 22;
        return {
            x: originX + Math.cos(this.turretAngle) * length,
            y: originY + Math.sin(this.turretAngle) * length,
        };
    }
    shoot(projectiles, forcedTarget = null, originX = null, originY = null) {
        const target = forcedTarget || this.target;
        if (!target) return;
        const cfg = this.getConfig();
        const muzzle = originX === null || originY === null ? this.getMuzzlePoint() : { x: originX, y: originY };
        projectiles.push(new Projectile(
            muzzle.x, muzzle.y,
            target, this.getEffectiveDamage(), cfg.projectileColor, cfg.projectileSize,
            this,
            cfg.isAoe ? this.getEffectiveAoeRadius() : 0, this.chainTargets, this.splashDamageMultiplier, this.splashDamageBands, this.projectileSpeedMultiplier
        ));
        if (window.audio) window.audio.playShot(this.type);
    }
    drawRange(ctx) {
        if (this.isNukeSilo) return;
        if (this.isAirfield) {
            const plane = this.getPlanePosition();
            ctx.beginPath(); ctx.arc(this.x, this.y, this.orbitRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(148,163,184,0.24)'; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.beginPath(); ctx.arc(plane.x, plane.y, this.airAttackRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(96,165,250,0.45)'; ctx.lineWidth = 1.4; ctx.stroke();
            ctx.fillStyle = 'rgba(96,165,250,0.06)'; ctx.fill();
            return;
        }
        ctx.beginPath(); ctx.arc(this.x, this.y, this.getEffectiveRange(), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200,200,200,0.25)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(200,200,200,0.04)'; ctx.fill();
    }
    drawWorkOverlay(ctx, x, y, s, label, progress, showBlueprint) {
        const pulse = 0.3 + Math.sin(Date.now() * 0.008) * 0.12;
        ctx.save();
        if (showBlueprint) {
            ctx.strokeStyle = 'rgba(147,197,253,0.75)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(this.col * s + 8, this.row * s + 8, s - 16, s - 16);
            ctx.beginPath();
            ctx.arc(x, y, s * 0.18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.strokeStyle = `rgba(250,204,21,${0.45 + pulse})`;
        ctx.lineWidth = 4;
        for (let i = -2; i < 4; i++) {
            const off = ((Date.now() * 0.05) + i * 16) % (s + 24);
            ctx.beginPath();
            ctx.moveTo(this.col * s - 8 + off, this.row * s + s + 4);
            ctx.lineTo(this.col * s + 8 + off, this.row * s - 4);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(226,232,240,0.65)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.col * s + 10, this.row * s + 10, s - 20, s - 20);
        ctx.beginPath();
        ctx.moveTo(this.col * s + 15, this.row * s + 10);
        ctx.lineTo(this.col * s + 15, this.row * s + s - 10);
        ctx.moveTo(this.col * s + s - 15, this.row * s + 10);
        ctx.lineTo(this.col * s + s - 15, this.row * s + s - 10);
        ctx.stroke();
        ctx.fillStyle = `rgba(250,204,21,${0.35 + pulse * 0.7})`;
        for (let i = 0; i < 3; i++) {
            const a = Date.now() * 0.004 + i * 2.09;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        const barW = s - 12, barH = 6, bx = this.col * s + 6, by = this.row * s + 5;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = label === 'СТРОЙКА' ? '#60a5fa' : '#f59e0b';
        ctx.fillRect(bx, by, barW * Math.max(0, Math.min(1, progress)), barH);
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(label, x, y + s * 0.34);
        ctx.restore();
    }
    drawBusyTimer(ctx, x, y) {
        const rem = Math.max(0, this.getRemainingWorkTime());
        const rounded = Math.round(rem * 10) / 10;
        const text = (Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)) + 'с';
        ctx.save();
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(x - 20, y - 31, 40, 14);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(text, x, y - 24);
        ctx.restore();
    }
    drawDynamicBarrel(ctx, x, y) {
        const profile = this.getBarrelProfile();
        if (!profile || this.isBusy()) return;
        const recoil = Math.max(0, this.muzzleFlash) * 18;
        const art = typeof GameSprites !== 'undefined' ? GameSprites.barrel(this.type) : null;
        if (art) {
            this.drawArtBarrel(ctx, x, y, profile, art, recoil);
            return;
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.turretAngle);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const roundedBox = (rx, ry, rw, rh, rr) => {
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, rr);
            else ctx.rect(rx, ry, rw, rh);
        };
        const drawMount = (radius = 11) => {
            ctx.beginPath();
            ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(4, 8, 15, 0.68)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#1f2937';
            ctx.fill();
            ctx.strokeStyle = 'rgba(226,232,240,0.24)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        };

        if (profile.orb) {
            drawMount(10);
            const pulse = 0.45 + Math.sin(Date.now() * 0.012) * 0.2;
            ctx.beginPath();
            ctx.arc(profile.length * 0.62, 0, 10, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(96,165,250,${0.42 + pulse * 0.26})`;
            ctx.fill();
            ctx.strokeStyle = profile.glow;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (profile.pods) {
            drawMount(12);
            roundedBox(2 - recoil * 0.2, -11, profile.length - 2, 22, 7);
            ctx.fillStyle = '#111827';
            ctx.fill();
            ctx.strokeStyle = 'rgba(248,250,252,0.20)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            for (let i = -1; i <= 1; i++) {
                roundedBox(8 - recoil * 0.35, i * 6 - 2.5, profile.length - 12, 5, 2);
                ctx.fillStyle = i === 0 ? profile.color : '#7f1d1d';
                ctx.fill();
            }
        } else if (profile.rail) {
            drawMount(12);
            roundedBox(4 - recoil * 0.18, -9, profile.length - 2, 18, 5);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = profile.width;
            ctx.beginPath();
            ctx.moveTo(5 - recoil * 0.2, -4);
            ctx.lineTo(profile.length - recoil * 0.4, -4);
            ctx.moveTo(5 - recoil * 0.2, 4);
            ctx.lineTo(profile.length - recoil * 0.4, 4);
            ctx.stroke();
            ctx.strokeStyle = profile.color;
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (profile.kind === 'shroud') {
            drawMount(12);
            roundedBox(1 - recoil * 0.25, -profile.width / 2, profile.length - 2, profile.width, 7);
            ctx.fillStyle = '#111827';
            ctx.fill();
            ctx.strokeStyle = 'rgba(226,232,240,0.22)';
            ctx.lineWidth = 1.6;
            ctx.stroke();
            roundedBox(8 - recoil * 0.35, -profile.width / 2 + 3, profile.length - 15, profile.width - 6, 4);
            ctx.fillStyle = profile.color;
            ctx.fill();
            ctx.fillStyle = 'rgba(15,23,42,0.52)';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(13 + i * 5 - recoil * 0.35, -profile.width / 2 + 4, 2, profile.width - 8);
            }
            roundedBox(profile.length - 7 - recoil * 0.4, -profile.width / 2 - 2, 10, profile.width + 4, 4);
            ctx.fillStyle = '#020617';
            ctx.fill();
        } else if (profile.kind === 'compact') {
            drawMount(10);
            roundedBox(2 - recoil * 0.25, -profile.width / 2, profile.length - 2, profile.width, 5);
            ctx.fillStyle = '#111827';
            ctx.fill();
            roundedBox(7 - recoil * 0.4, -profile.width / 2 + 2, profile.length - 12, profile.width - 4, 4);
            ctx.fillStyle = profile.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.24)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            roundedBox(profile.length - 5 - recoil * 0.45, -profile.width / 2 - 1, 8, profile.width + 2, 3);
            ctx.fillStyle = '#020617';
            ctx.fill();
        } else if (profile.kind === 'rifle') {
            drawMount(10);
            roundedBox(3 - recoil * 0.22, -profile.width / 2, profile.length - 5, profile.width, 5);
            ctx.fillStyle = '#3b2f26';
            ctx.fill();
            roundedBox(12 - recoil * 0.35, -profile.width / 2 + 2, profile.length - 16, profile.width - 4, 3);
            ctx.fillStyle = profile.color;
            ctx.fill();
            roundedBox(profile.length - 6 - recoil * 0.4, -profile.width / 2 - 1, 9, profile.width + 2, 3);
            ctx.fillStyle = '#111827';
            ctx.fill();
        } else {
            drawMount(Math.max(10, profile.width * 0.75));
            roundedBox(3 - recoil * 0.25, -profile.width / 2 - 2, profile.length - 4, profile.width + 4, Math.max(4, profile.width * 0.32));
            ctx.fillStyle = '#0f172a';
            ctx.fill();
            roundedBox(8 - recoil * 0.4, -profile.width / 2, profile.length - 12, profile.width, Math.max(3, profile.width * 0.26));
            ctx.fillStyle = profile.color;
            ctx.fill();
        }

        const muzzleX = profile.length + 2;
        if (this.muzzleFlash > 0) {
            if (profile.cone) {
                ctx.beginPath();
                ctx.moveTo(muzzleX, 0);
                ctx.lineTo(muzzleX + 28, -12);
                ctx.lineTo(muzzleX + 28, 12);
                ctx.closePath();
                ctx.fillStyle = `rgba(249,115,22,${Math.min(0.75, this.muzzleFlash * 8)})`;
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(muzzleX, 0, 7 + this.muzzleFlash * 22, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,215,80,${Math.min(0.8, this.muzzleFlash * 8)})`;
                ctx.fill();
                ctx.strokeStyle = profile.glow;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    drawArtBarrel(ctx, x, y, profile, art, recoil) {
        const flash = Math.max(0, this.muzzleFlash);
        const w = profile.artWidth || Math.max(48, profile.length + 20);
        const h = w * (art.naturalHeight / art.naturalWidth);
        const pivotX = w * (profile.pivot ?? 0.22);
        const recoilShift = Math.min(7, recoil * 0.26);
        const muzzleX = Math.max(profile.length, w - pivotX - 3) - recoilShift;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.turretAngle);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(art, -pivotX - recoilShift, -h / 2, w, h);
        if (flash > 0) {
            if (profile.cone) {
                ctx.beginPath();
                ctx.moveTo(muzzleX, 0);
                ctx.lineTo(muzzleX + 30, -11);
                ctx.lineTo(muzzleX + 30, 11);
                ctx.closePath();
                ctx.fillStyle = `rgba(249,115,22,${Math.min(0.82, flash * 8)})`;
                ctx.fill();
            } else if (profile.orb || profile.rail) {
                ctx.beginPath();
                ctx.arc(muzzleX, 0, 7 + flash * 18, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(96,165,250,${Math.min(0.78, flash * 7)})`;
                ctx.fill();
                ctx.strokeStyle = profile.glow;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(muzzleX, 0, 6 + flash * 20, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,215,80,${Math.min(0.78, flash * 8)})`;
                ctx.fill();
                ctx.strokeStyle = profile.glow;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    renderSpriteBody(ctx, x, y, s, bounds) {
        const sprite = typeof GameSprites !== 'undefined' ? GameSprites.tower(this.type) : null;
        if (!sprite) return false;

        if (this.isScanner) {
            const sweep = (Date.now() * 0.002) % (Math.PI * 2);
            const pulse = 0.12 + Math.sin(Date.now() * 0.003) * 0.05;
            ctx.beginPath();
            ctx.arc(x, y, this.scanRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(96,165,250,${pulse})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = `rgba(96,165,250,${pulse * 0.08})`;
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, this.scanRadius, sweep, sweep + 0.5);
            ctx.closePath();
            ctx.fillStyle = `rgba(96,165,250,${pulse * 0.4})`;
            ctx.fill();
        }
        if (this.isHealer) {
            const pulse = 0.1 + Math.sin(Date.now() * 0.003) * 0.04;
            ctx.beginPath();
            ctx.arc(x, y, this.healRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(52,211,153,${pulse})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = `rgba(52,211,153,${pulse * 0.06})`;
            ctx.fill();
        }

        ctx.save();
        const supportScale = this.isAirfield || this.isNukeSilo ? 1.12 : this.isWall ? 0.96 : this.isFarm || this.isHealer ? 1.24 : 1;
        const targetHeight = Math.max(bounds.height * supportScale, s * (this.isWall ? 0.92 : 1.48));
        const targetWidth = targetHeight * (sprite.naturalWidth / sprite.naturalHeight);
        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        ctx.beginPath();
        ctx.ellipse(x + 3, y + s * 0.28, targetWidth * 0.34, s * 0.20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(sprite, x - targetWidth / 2, y - targetHeight * 0.68, targetWidth, targetHeight);

        if (this.isPulseTower || this.type === 'tesla') {
            const pulseGlow = 0.14 + Math.max(0, this.muzzleFlash) * 1.4 + Math.sin(Date.now() * 0.006) * 0.04;
            ctx.beginPath();
            ctx.arc(x, y, s * 0.58, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(96,165,250,${pulseGlow})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
        this.drawDynamicBarrel(ctx, x, y);
        return true;
    }
    render(ctx) {
        if (this.isDestroyed) return;
        const cfg = this.getConfig(), x = this.x, y = this.y, s = CONFIG.CELL_SIZE, bounds = this.getBounds();
        const effectiveMaxHp = this.getEffectiveMaxHp();
        const hpR = this.hp / effectiveMaxHp;
        const constructing = this.isConstructing(), upgrading = this.isUpgrading();
        ctx.fillStyle = hpR > 0.5 ? 'rgba(50,50,50,0.4)' : 'rgba(80,20,20,0.4)';
        ctx.fillRect(bounds.left + 2, bounds.top + 2, bounds.width - 4, bounds.height - 4);
        if (hpR < 0.4) { const sa = 0.15 + Math.sin(Date.now() * 0.003) * 0.08; ctx.fillStyle = `rgba(60,60,60,${sa})`; ctx.beginPath(); ctx.arc(x + Math.sin(Date.now() * 0.002) * 5, y - 15 - Math.sin(Date.now() * 0.003) * 5, 8, 0, Math.PI * 2); ctx.fill(); }
        if (this.isFortified()) {
            const shieldPulse = 0.45 + Math.sin(Date.now() * 0.009) * 0.18;
            ctx.save();
            ctx.strokeStyle = `rgba(96,165,250,${0.55 + shieldPulse * 0.25})`;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(bounds.left - 6, bounds.top - 6, bounds.width + 12, bounds.height + 12);
            ctx.fillStyle = `rgba(96,165,250,${0.06 + shieldPulse * 0.04})`;
            ctx.fillRect(bounds.left - 4, bounds.top - 4, bounds.width + 8, bounds.height + 8);
            ctx.beginPath();
            ctx.arc(x, y, Math.max(bounds.width, bounds.height) * 0.52 + 10, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(125,211,252,${0.34 + shieldPulse * 0.22})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        if (constructing) {
            if (this.footprint.length > 1) {
                ctx.save();
                ctx.setLineDash([6, 4]);
                ctx.strokeStyle = 'rgba(96,165,250,0.75)';
                ctx.lineWidth = 2;
                ctx.strokeRect(bounds.left + 6, bounds.top + 6, bounds.width - 12, bounds.height - 12);
                ctx.setLineDash([]);
                ctx.restore();
            } else {
                this.drawWorkOverlay(ctx, x, y, s, 'СТРОЙКА', this.getBusyProgress(), true);
            }
        } else if (this.renderSpriteBody(ctx, x, y, s, bounds)) {
        } else if (this.isAirfield) {
            const runwayX = bounds.left + 4;
            const runwayY = bounds.top + 10;
            const runwayW = bounds.width - 8;
            const runwayH = bounds.height - 20;
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(runwayX, runwayY, runwayW, runwayH);
            ctx.strokeStyle = 'rgba(148,163,184,0.65)';
            ctx.lineWidth = 2;
            ctx.strokeRect(runwayX, runwayY, runwayW, runwayH);
            ctx.fillStyle = '#e2e8f0';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(runwayX + 12 + i * 21, runwayY + runwayH / 2 - 2, 10, 4);
            }
            ctx.fillStyle = '#475569';
            ctx.fillRect(bounds.left + 8, bounds.top + 8, 16, bounds.height - 16);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(bounds.left + 11, bounds.top + 12, 10, 10);
        } else if (this.isPulseTower) {
            const pulseGlow = 0.18 + Math.max(0, this.muzzleFlash) * 2;
            ctx.beginPath(); ctx.arc(x, y, s * 0.32, 0, Math.PI * 2); ctx.fillStyle = cfg.baseColor; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.arc(x, y, s * 0.17, 0, Math.PI * 2); ctx.fillStyle = '#a5b4fc'; ctx.fill();
            ctx.beginPath(); ctx.arc(x, y, s * 0.44, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(129,140,248,${pulseGlow})`; ctx.lineWidth = 2; ctx.stroke();
        } else if (this.isWall) {
            const wallPulse = 0.16 + Math.sin(Date.now() * 0.004) * 0.04;
            const wallX = this.col * s + 7;
            const wallY = this.row * s + 9;
            const wallW = s - 14;
            const wallH = s - 18;
            ctx.fillStyle = cfg.baseColor;
            ctx.fillRect(wallX, wallY, wallW, wallH);
            ctx.strokeStyle = 'rgba(0,0,0,0.45)';
            ctx.lineWidth = 2;
            ctx.strokeRect(wallX, wallY, wallW, wallH);
            ctx.fillStyle = cfg.turretColor;
            for (let i = 0; i < 4; i++) {
                const plankX = wallX + 3 + i * ((wallW - 10) / 3);
                ctx.fillRect(plankX, wallY + 3, 6, wallH - 6);
            }
            ctx.fillStyle = cfg.barrelColor;
            ctx.fillRect(wallX - 3, y - 4, wallW + 6, 8);
            ctx.fillRect(wallX + 4, wallY - 2, wallW - 8, 4);
            ctx.fillRect(wallX + 4, wallY + wallH - 2, wallW - 8, 4);
            ctx.strokeStyle = `rgba(251,191,36,${wallPulse})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wallX - 2, wallY - 2, wallW + 4, wallH + 4);
        } else if (this.isNukeSilo) {
            const siloPulse = 0.22 + Math.sin(Date.now() * 0.005) * 0.08 + this.launchFlash * 1.6;
            const readyPayload = this.getSelectedPayloadConfig();
            ctx.fillStyle = '#111827';
            ctx.fillRect(bounds.left + 7, bounds.top + 6, bounds.width - 14, bounds.height - 12);
            ctx.strokeStyle = 'rgba(148,163,184,0.55)';
            ctx.lineWidth = 2;
            ctx.strokeRect(bounds.left + 7, bounds.top + 6, bounds.width - 14, bounds.height - 12);
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(bounds.left + 12, bounds.top + 10, bounds.width - 24, bounds.height - 20);
            ctx.fillStyle = '#334155';
            ctx.fillRect(x - 8, bounds.top + 8, 16, bounds.height - 16);
            ctx.fillStyle = 'rgba(15,23,42,0.94)';
            ctx.fillRect(x - 14, bounds.top + 10, 28, 16);
            ctx.fillStyle = readyPayload && this.getPayloadStock(this.selectedPayload) > 0 ? readyPayload.inventoryColor : '#475569';
            ctx.beginPath();
            ctx.moveTo(x, bounds.top + 10);
            ctx.lineTo(x + 7, bounds.top + 22);
            ctx.lineTo(x - 7, bounds.top + 22);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x - 6, bounds.top + 22, 12, 18);
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☢', x, y + 2);
            ctx.font = 'bold 8px monospace';
            ctx.fillStyle = readyPayload && this.getPayloadStock(this.selectedPayload) > 0 ? readyPayload.inventoryColor : '#94a3b8';
            ctx.fillText(String(this.getPayloadStock(this.selectedPayload)), x, bounds.top + bounds.height - 10);
            ctx.strokeStyle = `rgba(250,204,21,${siloPulse})`;
            ctx.lineWidth = 1.6;
            ctx.strokeRect(bounds.left + 4, bounds.top + 4, bounds.width - 8, bounds.height - 8);
        } else if (this.isFactory) {
            const buildRatio = this.vehicleBuildDuration > 0 ? 1 - this.vehicleBuildTimer / this.vehicleBuildDuration : 0;
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(bounds.left + 6, bounds.top + 10, bounds.width - 12, bounds.height - 16);
            ctx.strokeStyle = 'rgba(248,250,252,0.22)';
            ctx.lineWidth = 2;
            ctx.strokeRect(bounds.left + 6, bounds.top + 10, bounds.width - 12, bounds.height - 16);
            ctx.fillStyle = cfg.baseColor;
            ctx.fillRect(x - 18, y - 9, 36, 24);
            ctx.fillStyle = cfg.turretColor;
            ctx.fillRect(x - 24, y + 5, 48, 10);
            ctx.fillStyle = cfg.barrelColor;
            ctx.fillRect(x + 8, y - 24, 7, 18);
            ctx.fillRect(x + 17, y - 18, 6, 12);
            ctx.fillStyle = `rgba(250,204,21,${0.32 + Math.sin(Date.now() * 0.008) * 0.16})`;
            ctx.fillRect(x - 11, y - 4, 7, 7);
            ctx.fillRect(x + 4, y - 4, 7, 7);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x - 20, y + 11, 40, 4);
            if (this.vehicleBuildTimer > 0) {
                ctx.fillStyle = 'rgba(15,23,42,0.78)';
                ctx.fillRect(bounds.left + 10, bounds.top + bounds.height - 12, bounds.width - 20, 5);
                ctx.fillStyle = '#facc15';
                ctx.fillRect(bounds.left + 10, bounds.top + bounds.height - 12, (bounds.width - 20) * Math.max(0, Math.min(1, buildRatio)), 5);
            }
        } else if (this.isDjBooth) {
            const pulse = 0.14 + Math.sin(Date.now() * 0.006) * 0.06;
            ctx.fillStyle = '#111827';
            ctx.fillRect(bounds.left + 8, bounds.top + 12, bounds.width - 16, bounds.height - 24);
            ctx.strokeStyle = 'rgba(192,132,252,0.55)';
            ctx.lineWidth = 2;
            ctx.strokeRect(bounds.left + 8, bounds.top + 12, bounds.width - 16, bounds.height - 24);
            ctx.beginPath();
            ctx.arc(x - 18, y, 12, 0, Math.PI * 2);
            ctx.arc(x + 18, y, 12, 0, Math.PI * 2);
            ctx.fillStyle = cfg.baseColor;
            ctx.fill();
            ctx.strokeStyle = '#22d3ee';
            ctx.stroke();
            ctx.fillStyle = '#22d3ee';
            for (let i = -1; i <= 1; i++) ctx.fillRect(x - 4 + i * 8, y - 19, 3, 13);
            ctx.beginPath(); ctx.arc(x, y, this.getEffectiveRange(), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(34,211,238,${pulse})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.fillStyle = `rgba(34,211,238,${pulse * 0.08})`;
            ctx.fill();
        } else if (this.isScanner) {
            ctx.beginPath(); ctx.arc(x, y, s * 0.33, 0, Math.PI * 2); ctx.fillStyle = cfg.baseColor; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
            const sweep = (Date.now() * 0.002) % (Math.PI * 2);
            const pulse = 0.12 + Math.sin(Date.now() * 0.003) * 0.05;
            ctx.beginPath(); ctx.arc(x, y, this.scanRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(96,165,250,${pulse})`; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = `rgba(96,165,250,${pulse * 0.08})`; ctx.fill();
            ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, this.scanRadius, sweep, sweep + 0.5); ctx.closePath();
            ctx.fillStyle = `rgba(96,165,250,${pulse * 0.4})`; ctx.fill();
            ctx.save(); ctx.translate(x, y); ctx.rotate(sweep);
            ctx.fillStyle = '#60a5fa'; ctx.fillRect(-2, -s * 0.32, 4, s * 0.32);
            ctx.beginPath(); ctx.arc(0, -s * 0.32, 5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (this.isHealer) {
            ctx.beginPath(); ctx.arc(x, y, s * 0.33, 0, Math.PI * 2); ctx.fillStyle = cfg.baseColor; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#34d399';
            ctx.fillRect(x - 3, y - 10, 6, 20); ctx.fillRect(x - 10, y - 3, 20, 6);
            const hp2 = 0.1 + Math.sin(Date.now() * 0.003) * 0.04;
            ctx.beginPath(); ctx.arc(x, y, this.healRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(52,211,153,${hp2})`; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = `rgba(52,211,153,${hp2 * 0.06})`; ctx.fill();
            for (let i = 0; i < 4; i++) { const pa = Date.now() * 0.002 + i * 1.57; const pr = this.healRadius * 0.6; ctx.fillStyle = `rgba(52,211,153,${0.4 + Math.sin(Date.now() * 0.005 + i) * 0.3})`; ctx.beginPath(); ctx.arc(x + Math.cos(pa) * pr, y + Math.sin(pa) * pr, 3, 0, Math.PI * 2); ctx.fill(); }
        } else if (this.isFarm) {
            ctx.beginPath(); ctx.arc(x, y, s * 0.35, 0, Math.PI * 2); ctx.fillStyle = cfg.baseColor; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fde047';
            ctx.fillRect(x - 2, y - 11, 4, 14);
            ctx.beginPath(); ctx.arc(x - 5, y - 11, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 5, y - 11, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x, y - 14, 3, 0, Math.PI * 2); ctx.fill();
            ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#fde047'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('+' + this.getEffectiveFarmIncome(), x, y + 12);
            const coinPulse = 0.4 + Math.sin(Date.now() * 0.004) * 0.3;
            ctx.fillStyle = `rgba(253,224,71,${coinPulse})`;
            for (let i = 0; i < 3; i++) { const ca = Date.now() * 0.0015 + i * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(ca) * 16, y + Math.sin(ca) * 16, 2.5, 0, Math.PI * 2); ctx.fill(); }
        } else {
            ctx.beginPath(); ctx.arc(x, y, s * 0.33, 0, Math.PI * 2); ctx.fillStyle = cfg.baseColor; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.save(); ctx.translate(x, y); ctx.rotate(this.turretAngle);
            ctx.beginPath(); ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2); ctx.fillStyle = cfg.turretColor; ctx.fill();
            const bLen = this.type === 'sniper' || this.type === 'railgun' ? s * 0.55 : (this.type === 'flamethrower' ? s * 0.3 : s * 0.42);
            const bW = this.type === 'grenade' || this.type === 'rocket' ? 7 : (this.type === 'machinegun' ? 3 : (this.type === 'tesla' ? 0 : (this.type === 'pistol' ? 2.5 : 4)));
            if (this.type === 'tesla') { ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2); ctx.fillStyle = `rgba(96,165,250,${0.5 + Math.sin(Date.now() * 0.008) * 0.3})`; ctx.fill(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.stroke(); for (let i = 0; i < 3; i++) { const a = Date.now() * 0.005 + i * 2.1; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.12, Math.sin(a) * s * 0.12); ctx.lineTo(Math.cos(a + 0.3) * s * 0.25, Math.sin(a + 0.3) * s * 0.25); ctx.strokeStyle = `rgba(96,165,250,${0.4 + Math.sin(Date.now() * 0.01 + i) * 0.3})`; ctx.lineWidth = 1.5; ctx.stroke(); } }
            else if (this.type === 'rocket') { ctx.fillStyle = cfg.barrelColor; ctx.fillRect(4, -5, bLen - 4, 3); ctx.fillRect(4, 2, bLen - 4, 3); ctx.fillStyle = '#444'; ctx.fillRect(bLen - 4, -6, 5, 12); }
            else { ctx.fillStyle = cfg.barrelColor; ctx.fillRect(4, -bW / 2, bLen - 4, bW); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bLen - 3, -bW / 2 - 1, 4, bW + 2); }
            if (this.muzzleFlash > 0) { const fs = 6 + (this.type === 'sniper' ? 4 : 0); ctx.fillStyle = `rgba(255,200,50,${this.muzzleFlash * 10})`; ctx.beginPath(); ctx.arc(bLen + 2, 0, fs, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
        }
        if (upgrading) {
            if (this.footprint.length === 1) this.drawWorkOverlay(ctx, x, y, s, 'АПГРЕЙД', this.getBusyProgress(), false);
        }
        if (!constructing && this.level > 1) { for (let i = 0; i < this.level - 1; i++) { ctx.fillStyle = '#d4a017'; ctx.beginPath(); ctx.arc(x - 5 + i * 8, y + s * 0.3, 2.5, 0, Math.PI * 2); ctx.fill(); } }
        if (this.hp < effectiveMaxHp) { const bW2 = bounds.width - 10, bH2 = 3, bx2 = bounds.left + 5, by2 = bounds.top + bounds.height - 6; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx2 - 1, by2 - 1, bW2 + 2, bH2 + 2); ctx.fillStyle = hpR > 0.5 ? '#3b82f6' : hpR > 0.25 ? '#f59e0b' : '#ef4444'; ctx.fillRect(bx2, by2, bW2 * Math.max(0, Math.min(1, hpR)), bH2); }
        if (this.isBusy()) this.drawBusyTimer(ctx, x, y);
        if (this.isDisabled()) {
            const disablePulse = 0.35 + Math.sin(Date.now() * 0.01 + this.x * 0.03) * 0.1;
            ctx.save();
            ctx.strokeStyle = `rgba(56,189,248,${0.42 + disablePulse})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x, y, Math.min(bounds.width, bounds.height) * 0.4 + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(15,23,42,0.38)';
            ctx.fillRect(bounds.left + 4, bounds.top + 4, bounds.width - 8, bounds.height - 8);
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#7dd3fc';
            ctx.fillText('СТАН', x, y);
            ctx.restore();
        }
    }
    renderAirUnit(ctx) {
        if (!this.isAirfield || this.isDestroyed || this.isBusy()) return;
        const plane = this.getPlanePosition();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.ellipse(plane.x + 4, plane.y + 18, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.translate(plane.x, plane.y);
        ctx.rotate(this.airAngle + Math.PI / 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(7, -15);
        ctx.lineTo(7, 14);
        ctx.lineTo(3, 24);
        ctx.lineTo(-3, 24);
        ctx.lineTo(-7, 14);
        ctx.lineTo(-7, -15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(-24, -1);
        ctx.lineTo(-7, -8);
        ctx.lineTo(-4, -1);
        ctx.lineTo(-7, 6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(24, -1);
        ctx.lineTo(7, -8);
        ctx.lineTo(4, -1);
        ctx.lineTo(7, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(-11, 12);
        ctx.lineTo(-4, 8);
        ctx.lineTo(-2, 18);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(11, 12);
        ctx.lineTo(4, 8);
        ctx.lineTo(2, 18);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 24);
        ctx.lineTo(6, 18);
        ctx.lineTo(0, 10);
        ctx.lineTo(-6, 18);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-2.5, -20, 5, 30);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(4, -18);
        ctx.lineTo(-4, -18);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(-1.5, -14, 3, 6);
        ctx.fillRect(-1.5, -5, 3, 5);
        ctx.strokeStyle = 'rgba(15,23,42,0.6)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-21, 0);
        ctx.lineTo(21, 0);
        ctx.moveTo(-7, -7);
        ctx.lineTo(-18, -1);
        ctx.moveTo(7, -7);
        ctx.lineTo(18, -1);
        ctx.moveTo(-4, 9);
        ctx.lineTo(-9, 14);
        ctx.moveTo(4, 9);
        ctx.lineTo(9, 14);
        ctx.stroke();
        if (this.level >= 3 && this.rocketDamage > 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-12, 6, 3, 9);
            ctx.fillRect(9, 6, 3, 9);
        }
        ctx.restore();
    }
}
