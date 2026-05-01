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
