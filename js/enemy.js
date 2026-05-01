class Enemy {
    constructor(type, map, overrides = {}) {
        Enemy.nextId = Enemy.nextId || 1;
        this.id = overrides.id || `en${Enemy.nextId++}`;
        const cfg = ENEMY_TYPES[type];
        this.type = type; this.name = overrides.name ?? cfg.name;
        this.maxHp = overrides.hp ?? cfg.hp; this.hp = this.maxHp;
        this.baseSpeed = overrides.speed ?? cfg.speed; this.speed = this.baseSpeed;
        this.reward = overrides.reward ?? cfg.reward; this.bodyColor = overrides.bodyColor ?? cfg.bodyColor;
        this.outlineColor = overrides.outlineColor ?? cfg.outlineColor; this.eyeColor = overrides.eyeColor ?? cfg.eyeColor;
        this.radius = overrides.radius ?? cfg.radius; this.damage = overrides.damage ?? cfg.damage; this.unitClass = overrides.unitClass ?? cfg.unitClass ?? 'medium'; this.map = map;
        this.isInvisible = overrides.isInvisible ?? cfg.isInvisible ?? false;
        this.invisibilityLevel = overrides.invisibilityLevel ?? cfg.invisibilityLevel ?? (this.isInvisible ? 1 : 0);
        this.isBoss = overrides.isBoss ?? cfg.isBoss ?? false;
        this.visualType = overrides.visualType ?? cfg.visualType ?? type;
        this.profileType = overrides.profileType ?? cfg.profileType ?? type;
        this.distance = 0; this.x = map.preset.waypoints[0].x; this.y = map.preset.waypoints[0].y;
        this.angle = 0; this.isDead = false; this.reachedEnd = false;
        this.slowTimer = 0; this.slowFactor = 1; this.wobble = Math.random() * Math.PI * 2;
        this.burnTimer = 0; this.burnDps = 0;
        this.stunTimer = 0;
        this.canAttackTowers = overrides.canAttackTowers ?? cfg.canAttackTowers ?? false;
        this.towerAttackDamage = overrides.towerAttackDamage ?? cfg.towerAttackDamage ?? 0;
        this.towerAttackRate = overrides.towerAttackRate ?? cfg.towerAttackRate ?? 1.0;
        this.towerAttackRange = overrides.towerAttackRange ?? cfg.towerAttackRange ?? 60;
        this.maxAttackTime = overrides.maxAttackTime ?? cfg.maxAttackTime ?? 3;
        this.bossStage = overrides.bossStage ?? cfg.bossStage ?? 1;
        this.bossPersona = overrides.bossPersona ?? cfg.bossPersona ?? 'warhorn';
        this.bossBannerColor = overrides.bossBannerColor ?? cfg.bossBannerColor ?? '#ef4444';
        this.attackingTower = null; this.attackCooldown = 0;
        this.attackTimer = 0; this.didAttackThisFrame = false; this.attackAnimTimer = 0;
        this.meleeWhileMoving = overrides.meleeWhileMoving ?? cfg.meleeWhileMoving ?? false;
        this.skyAttackEnabled = overrides.skyAttackEnabled ?? cfg.skyAttackEnabled ?? false;
        this.skyAttackDamage = overrides.skyAttackDamage ?? cfg.skyAttackDamage ?? 0;
        this.skyAttackRadius = overrides.skyAttackRadius ?? cfg.skyAttackRadius ?? 0;
        this.skyAttackInterval = overrides.skyAttackInterval ?? cfg.skyAttackInterval ?? 0;
        this.skyAttackDelay = overrides.skyAttackDelay ?? cfg.skyAttackDelay ?? 0;
        this.skyAttackRange = overrides.skyAttackRange ?? cfg.skyAttackRange ?? 0;
        this.skyAttackTimer = this.skyAttackEnabled ? 1 + Math.random() * 0.8 : 0;
        this.skyAttackCharge = 0;
        this.skyAttackTarget = null;
        this.didLaunchSkyStrikeThisFrame = false;
        this.skyStrikeThisFrame = null;
        this.skyAttackAnimTimer = 0;
        this.disablePulseEnabled = overrides.disablePulseEnabled ?? cfg.disablePulseEnabled ?? false;
        this.disablePulseRadius = overrides.disablePulseRadius ?? cfg.disablePulseRadius ?? 0;
        this.disablePulseDuration = overrides.disablePulseDuration ?? cfg.disablePulseDuration ?? 0;
        this.disablePulseInterval = overrides.disablePulseInterval ?? cfg.disablePulseInterval ?? 99;
        this.disablePulseTimer = this.disablePulseEnabled ? 2.2 : 99;
        this.didDisablePulseThisFrame = false;
        this.disabledTowersThisFrame = [];
        this.wallBounceCooldown = 0;
        this.didHitWallThisFrame = false; this.impactedWall = null; this.wallDamageThisFrame = 0;
    }
    takeDamage(amount) { this.hp -= amount; if (this.hp <= 0) { this.hp = 0; this.isDead = true; } }
    toSnapshot() {
        return {
            id: this.id,
            type: this.type, hp: this.hp, maxHp: this.maxHp, baseSpeed: this.baseSpeed, speed: this.speed,
            reward: this.reward, distance: this.distance, x: this.x, y: this.y, angle: this.angle,
            pathIndex: this.pathIndex, isDead: this.isDead, reachedEnd: this.reachedEnd,
            isBoss: this.isBoss, bossStage: this.bossStage, bossPersona: this.bossPersona,
            attackingTower: !!this.attackingTower, slowTimer: this.slowTimer, burnTimer: this.burnTimer,
            coopBoosted: !!this.coopBoosted,
        };
    }
    applySnapshot(data, smooth = false) {
        if (!data) return this;
        if (data.id) this.id = data.id;
        this.hp = data.hp ?? this.hp;
        this.maxHp = data.maxHp ?? this.maxHp;
        this.baseSpeed = data.baseSpeed ?? this.baseSpeed;
        this.speed = data.speed ?? this.speed;
        this.reward = data.reward ?? this.reward;
        const nextDistance = data.distance ?? this.distance;
        const nextX = data.x ?? this.x;
        const nextY = data.y ?? this.y;
        const nextAngle = data.angle ?? this.angle;
        if (smooth && Number.isFinite(nextX) && Number.isFinite(nextY)) {
            const gap = Math.hypot(nextX - this.x, nextY - this.y);
            if (gap > 95 || this.remoteX === undefined) {
                this.x = nextX;
                this.y = nextY;
                this.distance = nextDistance;
                this.angle = nextAngle;
            }
            this.remoteX = nextX;
            this.remoteY = nextY;
            this.remoteDistance = nextDistance;
            this.remoteAngle = nextAngle;
        } else {
            this.distance = nextDistance;
            this.x = nextX;
            this.y = nextY;
            this.angle = nextAngle;
            this.remoteX = nextX;
            this.remoteY = nextY;
            this.remoteDistance = nextDistance;
            this.remoteAngle = nextAngle;
        }
        this.pathIndex = data.pathIndex ?? this.pathIndex;
        this.isDead = !!data.isDead;
        this.reachedEnd = !!data.reachedEnd;
        this.isBoss = !!data.isBoss;
        this.bossStage = data.bossStage ?? this.bossStage;
        this.bossPersona = data.bossPersona || this.bossPersona;
        this.slowTimer = data.slowTimer ?? this.slowTimer;
        this.burnTimer = data.burnTimer ?? this.burnTimer;
        this.coopBoosted = !!data.coopBoosted;
        return this;
    }
    updateRemotePresentation(dt) {
        if (this.remoteX !== undefined && this.remoteY !== undefined) {
            const blend = Math.min(1, dt * 12);
            this.x += (this.remoteX - this.x) * blend;
            this.y += (this.remoteY - this.y) * blend;
            this.distance += ((this.remoteDistance ?? this.distance) - this.distance) * blend;
            this.angle = this.remoteAngle ?? this.angle;
        }
        this.wobble += dt * Math.max(2.5, this.speed * 0.08);
        this.attackAnimTimer += dt * 9;
        this.skyAttackAnimTimer = Math.max(0, this.skyAttackAnimTimer - dt);
        this.slowTimer = Math.max(0, this.slowTimer - dt);
        this.burnTimer = Math.max(0, this.burnTimer - dt);
        this.stunTimer = Math.max(0, this.stunTimer - dt);
    }
    applySlow(factor, duration) { this.slowFactor = Math.min(this.slowFactor, factor); this.slowTimer = Math.max(this.slowTimer, duration); }
    applyBurn(dps, duration) {
        if (!dps || !duration || this.isDead) return;
        this.burnDps = Math.max(this.burnDps, dps);
        this.burnTimer = Math.max(this.burnTimer, duration);
    }
    applyStun(duration) {
        if (!duration || this.isDead) return;
        this.stunTimer = Math.max(this.stunTimer, duration);
        this.attackingTower = null;
        this.attackTimer = 0;
        this.attackCooldown = Math.max(this.attackCooldown, 0.12);
        this.skyAttackCharge = 0;
        this.skyAttackTarget = null;
        this.skyAttackAnimTimer = 0;
    }
    updatePositionFromDistance() {
        const pos = this.map.getPositionAtDistance(this.distance);
        this.x = pos.x; this.y = pos.y; this.angle = pos.angle;
    }
    tryImpactWall(towers) {
        if (!towers || this.wallBounceCooldown > 0) return false;
        let nearestWall = null;
        let nearestDistance = Infinity;
        for (const tower of towers) {
            if (!tower.isWall || tower.isDestroyed || tower.isBusy()) continue;
            const d = Math.hypot(tower.x - this.x, tower.y - this.y);
            const hitDistance = this.radius + CONFIG.CELL_SIZE * 0.28;
            if (d <= hitDistance && d < nearestDistance) {
                nearestWall = tower;
                nearestDistance = d;
            }
        }
        if (!nearestWall) return false;
        const wallHpBeforeHit = nearestWall.hp;
        const enemyHpBeforeHit = this.hp;
        const tradedDamage = Math.min(enemyHpBeforeHit, wallHpBeforeHit);
        nearestWall.takeTowerDamage(tradedDamage);
        this.takeDamage(tradedDamage);
        this.didHitWallThisFrame = true;
        this.impactedWall = nearestWall;
        this.wallDamageThisFrame = tradedDamage;
        this.attackingTower = null;
        this.attackTimer = 0;
        if (this.isDead) {
            return true;
        }
        return false;
    }
    findSkyAttackTarget(towers) {
        if (!towers) return null;
        let best = null;
        let bestDistance = Infinity;
        for (const tower of towers) {
            if (tower.isDestroyed || tower.isWall) continue;
            const distance = Math.hypot(tower.x - this.x, tower.y - this.y);
            if (distance > this.skyAttackRange || distance >= bestDistance) continue;
            bestDistance = distance;
            best = tower;
        }
        if (best) return best;
        for (const tower of towers) {
            if (tower.isDestroyed) continue;
            const distance = Math.hypot(tower.x - this.x, tower.y - this.y);
            if (distance > this.skyAttackRange || distance >= bestDistance) continue;
            bestDistance = distance;
            best = tower;
        }
        return best;
    }
    update(dt, towers) {
        if (this.isDead || this.reachedEnd) return;
        this.didAttackThisFrame = false;
        this.didLaunchSkyStrikeThisFrame = false;
        this.skyStrikeThisFrame = null;
        this.didHitWallThisFrame = false;
        this.impactedWall = null;
        this.wallDamageThisFrame = 0;
        this.didDisablePulseThisFrame = false;
        this.disabledTowersThisFrame = [];
        this.wallBounceCooldown = Math.max(0, this.wallBounceCooldown - dt);
        this.skyAttackAnimTimer = Math.max(0, this.skyAttackAnimTimer - dt);
        if (this.burnTimer > 0) {
            this.burnTimer = Math.max(0, this.burnTimer - dt);
            this.takeDamage(this.burnDps * dt);
            if (this.burnTimer <= 0) this.burnDps = 0;
            if (this.isDead) return;
        }
        if (this.slowTimer > 0) { this.slowTimer -= dt; this.speed = this.baseSpeed * this.slowFactor; }
        else { this.speed = this.baseSpeed; this.slowFactor = 1; }
        this.stunTimer = Math.max(0, this.stunTimer - dt);
        if (this.stunTimer > 0) {
            this.speed = 0;
            this.wobble += dt * 2.4;
            return;
        }
        if (this.disablePulseEnabled) {
            this.disablePulseTimer -= dt;
            if (this.disablePulseTimer <= 0 && towers) {
                this.disabledTowersThisFrame = towers.filter(tower => !tower.isDestroyed && !tower.isWall && Math.hypot(tower.x - this.x, tower.y - this.y) <= this.disablePulseRadius);
                if (this.disabledTowersThisFrame.length) this.didDisablePulseThisFrame = true;
                this.disablePulseTimer = this.disablePulseInterval;
            }
        }
        if (this.skyAttackEnabled) {
            if (this.skyAttackTarget?.isDestroyed) this.skyAttackTarget = null;
            if (this.skyAttackCharge > 0) {
                this.skyAttackCharge -= dt;
                this.skyAttackAnimTimer = Math.max(this.skyAttackAnimTimer, this.skyAttackCharge);
                if (this.skyAttackCharge <= 0) {
                    if (this.skyAttackTarget && !this.skyAttackTarget.isDestroyed) {
                        this.didLaunchSkyStrikeThisFrame = true;
                        this.skyStrikeThisFrame = {
                            x: this.skyAttackTarget.x,
                            y: this.skyAttackTarget.y,
                            damage: this.skyAttackDamage,
                            radius: this.skyAttackRadius,
                            fallTime: this.skyAttackDelay,
                            bossStage: this.bossStage,
                            sourceType: this.visualType,
                        };
                    }
                    this.skyAttackTarget = null;
                    this.skyAttackTimer = this.skyAttackInterval;
                }
            } else {
                this.skyAttackTimer -= dt;
                if (this.skyAttackTimer <= 0) {
                    const target = this.findSkyAttackTarget(towers);
                    if (target) {
                        this.skyAttackTarget = target;
                        this.skyAttackCharge = 0.38;
                        this.skyAttackAnimTimer = 0.45;
                    } else {
                        this.skyAttackTimer = 0.65;
                    }
                }
            }
        }
        if (this.canAttackTowers) {
            if (this.attackingTower) {
                if (this.attackingTower.isDestroyed) this.attackingTower = null;
                else { const d = Math.hypot(this.attackingTower.x - this.x, this.attackingTower.y - this.y); if (d > this.towerAttackRange + 20) this.attackingTower = null; }
            }
            if (!this.attackingTower && towers) {
                for (const t of towers) { if (t.isDestroyed) continue; const d = Math.hypot(t.x - this.x, t.y - this.y); if (d <= this.towerAttackRange) { this.attackingTower = t; this.attackCooldown = 0.3; this.attackTimer = 0; break; } }
            }
            if (this.attackingTower) {
                this.attackTimer += dt; this.attackAnimTimer += dt * 6; this.attackCooldown -= dt;
                this.angle = Math.atan2(this.attackingTower.y - this.y, this.attackingTower.x - this.x);
                if (this.attackCooldown <= 0) { this.attackingTower.takeTowerDamage(this.towerAttackDamage); this.attackCooldown = this.towerAttackRate; this.didAttackThisFrame = true; }
                if (this.attackTimer > this.maxAttackTime) this.attackingTower = null;
                this.wobble += dt * 12;
                if (!this.meleeWhileMoving) return;
            }
        }
        this.distance += this.speed * dt;
        this.updatePositionFromDistance();
        if (this.tryImpactWall(towers)) { this.wobble += dt * 8; return; }
        this.wobble += dt * 8;
        if (this.distance >= this.map.totalPathLength) this.reachedEnd = true;
    }
    renderSprite(ctx, x, y, r, wX, wY) {
        const sprite = typeof GameSprites !== 'undefined'
            ? (GameSprites.enemy(this.visualType) || GameSprites.enemy(this.profileType) || GameSprites.enemy(this.type))
            : null;
        if (!sprite) return false;

        const height = (this.isBoss ? r * 5.6 : r * 5.15) * (this.visualType === 'normal' ? 1.08 : 1);
        const width = height * (sprite.naturalWidth / sprite.naturalHeight);
        const flip = Math.cos(this.angle) < -0.1 ? -1 : 1;
        const alpha = this.isInvisible ? 0.52 + Math.sin(Date.now() * 0.005) * 0.12 : 1;
        const stride = this.isBoss ? 36 : this.unitClass === 'light' ? 20 : 26;
        const step = (this.distance / stride + this.wobble * 0.08) * Math.PI * 2;
        const bodyBob = Math.abs(Math.sin(step)) * r * 0.08;
        const bodyLean = Math.sin(step) * 0.045;

        ctx.save();
        ctx.translate(x + wX, y + wY);
        ctx.fillStyle = 'rgba(0,0,0,0.36)';
        ctx.beginPath();
        ctx.ellipse(4, r * 0.75, width * 0.28, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(this.angle);
        const legColor = this.isBoss ? '#564235' : this.bodyColor;
        const bootColor = this.isBoss ? '#1f2933' : '#1b1714';
        const hipX = -r * 0.1;
        const hipSpread = r * 0.38;
        const footBaseX = r * 0.18;
        const footSpread = r * 0.48;
        for (let side = -1; side <= 1; side += 2) {
            const phase = step + (side > 0 ? Math.PI : 0);
            const reach = Math.sin(phase) * r * 0.52;
            const lift = Math.max(0, Math.cos(phase)) * r * 0.16;
            const kneeX = hipX + reach * 0.45;
            const kneeY = side * hipSpread * 0.7 - lift;
            const footX = footBaseX + reach;
            const footY = side * footSpread;
            const contact = Math.max(0.18, 1 - lift / Math.max(1, r * 0.16));
            ctx.fillStyle = `rgba(0,0,0,${0.16 + contact * 0.18})`;
            ctx.beginPath();
            ctx.ellipse(footX + r * 0.14, footY + r * 0.16, r * (0.3 + contact * 0.08), r * 0.11, Math.sin(phase) * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = legColor;
            ctx.lineWidth = Math.max(3, r * 0.26);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(hipX - r * 0.18, side * hipSpread);
            ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
            ctx.stroke();
            ctx.fillStyle = bootColor;
            ctx.beginPath();
            ctx.ellipse(footX + r * 0.14, footY, r * 0.28, r * 0.16, Math.sin(phase) * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        if (this.isBoss) {
            const stagePulse = 0.45 + Math.sin(Date.now() * 0.004 + this.bossStage) * 0.2;
            ctx.beginPath();
            ctx.arc(0, -height * 0.28, Math.max(width, height) * 0.38, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(239,68,68,${0.28 + stagePulse * 0.3})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        if (this.stunTimer > 0) {
            ctx.beginPath();
            ctx.arc(0, -height * 0.28, Math.max(width, height) * 0.32, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(125,211,252,0.82)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        if (this.burnTimer > 0) {
            ctx.beginPath();
            ctx.arc(0, -height * 0.28, Math.max(width, height) * 0.34, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(249,115,22,0.16)';
            ctx.fill();
        }

        ctx.globalAlpha = alpha;
        ctx.translate(0, -bodyBob);
        ctx.rotate(bodyLean);
        ctx.scale(flip, 1);
        ctx.drawImage(sprite, -width / 2, -height * 0.82, width, height);
        ctx.restore();

        if (this.hp < this.maxHp) {
            const bW = Math.max(24, r * 2.6), bH = 4, bx = x - bW / 2 + wX, by = y - r - 18 + wY;
            const hpR = this.hp / this.maxHp;
            ctx.fillStyle = 'rgba(0,0,0,0.72)';
            ctx.fillRect(bx - 1, by - 1, bW + 2, bH + 2);
            ctx.fillStyle = hpR > 0.5 ? '#22c55e' : hpR > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(bx, by, bW * hpR, bH);
        }

        if (this.isInvisible) {
            ctx.strokeStyle = `rgba(167,139,250,${0.45 + Math.sin(Date.now() * 0.007) * 0.25})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + wX, y + wY, r + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.attackingTower) {
            ctx.font = '12px Arial';
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'center';
            ctx.fillText('⚔', x + wX, y - r - 22 + wY);
        }
        return true;
    }
    render(ctx) {
        if (this.isDead || this.reachedEnd) return;
        const x = this.x, y = this.y, r = this.radius;
        const wX = Math.sin(this.wobble) * 1.2, wY = Math.cos(this.wobble * 0.7) * 0.8;
        if (this.renderSprite(ctx, x, y, r, wX, wY)) return;
        ctx.save(); ctx.translate(x + wX, y + wY);
        if (this.isInvisible) { ctx.globalAlpha = 0.22 + Math.sin(Date.now() * 0.005) * 0.1; }
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2, r * 0.55, r * 0.7, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = this.bodyColor; ctx.fill();
        ctx.strokeStyle = this.outlineColor; ctx.lineWidth = 2.5; ctx.stroke();
        const isAtk = !!this.attackingTower; const sw = isAtk ? Math.sin(this.attackAnimTimer) * 0.8 : 0;
        ctx.strokeStyle = this.bodyColor; ctx.lineWidth = Math.max(2, r * 0.28); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(Math.cos(this.angle + 1.2) * r * 0.5, Math.sin(this.angle + 1.2) * r * 0.5);
        ctx.lineTo(Math.cos(this.angle + 0.4 + sw) * r * 1.7, Math.sin(this.angle + 0.4 + sw) * r * 1.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(Math.cos(this.angle - 1.2) * r * 0.5, Math.sin(this.angle - 1.2) * r * 0.5);
        ctx.lineTo(Math.cos(this.angle - 0.4 - sw) * r * 1.7, Math.sin(this.angle - 0.4 - sw) * r * 1.7); ctx.stroke();
        const ed = r * 0.32, es = Math.max(1.5, r * 0.18), ex = Math.cos(this.angle), ey = Math.sin(this.angle);
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(-ey * ed + ex * r * 0.25, ex * ed + ey * r * 0.25, es + 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ey * ed + ex * r * 0.25, -ex * ed + ey * r * 0.25, es + 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this.eyeColor;
        ctx.beginPath(); ctx.arc(-ey * ed + ex * r * 0.3, ex * ed + ey * r * 0.3, es, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ey * ed + ex * r * 0.3, -ex * ed + ey * r * 0.3, es, 0, Math.PI * 2); ctx.fill();
        if (this.isBoss) {
            const stagePulse = 0.35 + Math.sin(Date.now() * 0.004 + this.bossStage) * 0.2;
            const auraColor = this.bossStage >= 4 ? '#f97316' : this.bossStage >= 3 ? '#ef4444' : this.bossStage >= 2 ? '#fb7185' : '#dc2626';
            ctx.beginPath(); ctx.arc(0, 0, r + 8 + this.bossStage, 0, Math.PI * 2); ctx.strokeStyle = `rgba(220,38,38,${0.25 + stagePulse * 0.35})`; ctx.lineWidth = 3; ctx.stroke();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i + Date.now() * 0.001;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                ctx.lineTo(Math.cos(a) * (r + 8 + this.bossStage), Math.sin(a) * (r + 8 + this.bossStage));
                ctx.strokeStyle = auraColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(0, -r - 6, 4 + this.bossStage, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(250,204,21,${0.45 + stagePulse * 0.3})`;
            ctx.fill();
            if (this.disablePulseEnabled) {
                const pulseRadius = r + 14 + Math.sin(Date.now() * 0.006 + this.x * 0.01) * 3;
                ctx.beginPath();
                ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(56,189,248,0.55)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        if (this.skyAttackAnimTimer > 0) {
            const orbRise = 1 - this.skyAttackAnimTimer / 0.45;
            ctx.strokeStyle = `rgba(251,146,60,${0.4 + orbRise * 0.35})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.4);
            ctx.lineTo(0, -r - 26 - orbRise * 18);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, -r - 26 - orbRise * 18, 5 + this.bossStage, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(251,146,60,${0.45 + orbRise * 0.35})`;
            ctx.fill();
        }
        if (this.isBoss && this.visualType === 'runner') {
            ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.2); ctx.lineTo(-r * 1.45, -r * 0.7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.2); ctx.lineTo(r * 1.45, -r * 0.7); ctx.stroke();
        }
        if (this.isBoss && this.visualType === 'normal') {
            ctx.fillStyle = 'rgba(245,158,11,0.4)';
            ctx.fillRect(-r * 0.75, -r * 0.2, r * 1.5, r * 0.38);
        }
        if (this.isBoss && this.visualType === 'ghost') {
            ctx.strokeStyle = 'rgba(196,181,253,0.7)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, r + 11, -1.1, 1.1); ctx.stroke();
        }
        if (this.isBoss && this.visualType === 'shade') {
            ctx.strokeStyle = 'rgba(221,214,254,0.72)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, -r - 6); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r + 6); ctx.lineTo(-r * 0.7, 0); ctx.closePath(); ctx.stroke();
        }
        if (this.isBoss && this.visualType === 'stalker') {
            ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.2); ctx.lineTo(-r * 1.35, r * 0.8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(r * 0.9, r * 0.2); ctx.lineTo(r * 1.35, r * 0.8); ctx.stroke();
        }
        if (this.isBoss && this.bossPersona === 'warhorn') {
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 1.1); ctx.lineTo(-r * 1.15, -r * 1.55); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 1.1); ctx.lineTo(r * 1.15, -r * 1.55); ctx.stroke();
            ctx.fillStyle = 'rgba(249,115,22,0.34)';
            ctx.fillRect(-r * 0.25, -r * 1.55, r * 0.5, 8);
        }
        if (this.isBoss && this.bossPersona === 'juggernaut') {
            ctx.strokeStyle = '#fca5a5';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, r + 4, -2.6, -0.55); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, r + 4, 0.55, 2.6); ctx.stroke();
            ctx.fillStyle = 'rgba(127,29,29,0.45)';
            ctx.fillRect(-r * 1.15, -r * 0.32, r * 2.3, r * 0.64);
        }
        if (this.isBoss && this.bossPersona === 'nullifier') {
            ctx.strokeStyle = 'rgba(125,211,252,0.85)';
            ctx.lineWidth = 2.5;
            for (let i = 0; i < 4; i++) {
                const angle = Date.now() * 0.0015 + i * (Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * (r + 3), Math.sin(angle) * (r + 3));
                ctx.lineTo(Math.cos(angle) * (r + 14), Math.sin(angle) * (r + 14));
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(0, 0, r + 14, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(56,189,248,0.35)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        if (this.isBoss && this.bossPersona === 'cataclysm') {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 4;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 8, -r * 1.05);
                ctx.lineTo(i * 12, -r * 1.55);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(251,113,133,0.35)';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(-r * 0.75 + i * r * 0.55, -r * 0.18, 5, r * 0.95);
            }
        }
        if (this.stunTimer > 0) {
            const frostPulse = 0.38 + Math.sin(Date.now() * 0.012 + this.x * 0.02) * 0.14;
            ctx.beginPath();
            ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(125,211,252,${0.48 + frostPulse * 0.22})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            for (let i = 0; i < 4; i++) {
                const a = Date.now() * 0.0015 + i * (Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2));
                ctx.lineTo(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12));
                ctx.strokeStyle = 'rgba(191,219,254,0.72)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(0, -r - 6, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(224,242,254,0.88)';
            ctx.fill();
        }
        if (this.burnTimer > 0) {
            const t = Date.now() * 0.001;
            const burnStrength = Math.min(1, this.burnTimer / 5);
            const burnPulse = 0.58 + Math.sin(t * 11 + this.x * 0.03) * 0.18;
            const auraRadius = r + 6 + burnStrength * 6 + burnPulse * 3;
            ctx.beginPath();
            ctx.arc(0, -r * 0.05, auraRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(249,115,22,${0.12 + burnStrength * 0.08})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, -r * 0.18, r * 0.9 + burnPulse * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(251,191,36,${0.08 + burnStrength * 0.06})`;
            ctx.fill();
            for (let i = 0; i < 5; i++) {
                const flameAngle = t * 3.8 + i * 1.24;
                const baseX = Math.cos(flameAngle) * r * (0.18 + (i % 2) * 0.1);
                const baseY = Math.sin(flameAngle) * r * 0.2 + r * 0.2;
                const tipX = Math.cos(flameAngle * 0.92 + i) * r * (0.45 + burnPulse * 0.18);
                const tipY = -r * (0.95 + burnStrength * 0.35) - Math.sin(t * 8 + i) * 5 - i * 1.5;
                ctx.strokeStyle = `rgba(220,38,38,${0.34 + burnStrength * 0.2})`;
                ctx.lineWidth = Math.max(2, r * 0.18);
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                ctx.quadraticCurveTo(
                    baseX + Math.sin(flameAngle) * r * 0.35,
                    -r * 0.3 - burnPulse * 3,
                    tipX,
                    tipY
                );
                ctx.stroke();
                ctx.strokeStyle = `rgba(251,146,60,${0.52 + burnStrength * 0.24})`;
                ctx.lineWidth = Math.max(1.4, r * 0.12);
                ctx.beginPath();
                ctx.moveTo(baseX * 0.72, baseY * 0.7);
                ctx.quadraticCurveTo(
                    baseX * 0.4,
                    -r * 0.22 - burnPulse * 2,
                    tipX * 0.72,
                    tipY + 4
                );
                ctx.stroke();
                ctx.strokeStyle = `rgba(253,224,71,${0.46 + burnStrength * 0.2})`;
                ctx.lineWidth = Math.max(1, r * 0.075);
                ctx.beginPath();
                ctx.moveTo(baseX * 0.34, baseY * 0.42);
                ctx.lineTo(tipX * 0.46, tipY + 8);
                ctx.stroke();
            }
            for (let i = 0; i < 7; i++) {
                const emberAngle = t * 2.4 + i * 0.9 + this.wobble * 0.2;
                const emberRadius = r * (0.28 + (i % 3) * 0.12);
                const emberX = Math.cos(emberAngle) * emberRadius;
                const emberY = -r * 0.35 - i * 2.4 - Math.sin(t * 6 + i) * 3;
                ctx.beginPath();
                ctx.arc(emberX, emberY, 1.2 + (i % 2) * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = i % 2 === 0 ? 'rgba(251,191,36,0.85)' : 'rgba(249,115,22,0.8)';
                ctx.fill();
            }
        }
        if (this.visualType === 'tank') { ctx.beginPath(); ctx.arc(0, 0, r - 4, Math.PI * 0.7, Math.PI * 2.3); ctx.strokeStyle = 'rgba(80,60,100,0.5)'; ctx.lineWidth = 5; ctx.stroke(); }
        if (this.visualType === 'armored') { ctx.strokeStyle = 'rgba(160,160,170,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r - 2, -0.5, 0.5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r - 2, Math.PI - 0.5, Math.PI + 0.5); ctx.stroke(); }
        if (this.visualType === 'destroyer') { ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = r * 0.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(Math.cos(this.angle + 0.3) * r * 0.8, Math.sin(this.angle + 0.3) * r * 0.8); ctx.lineTo(Math.cos(this.angle + 0.15 + sw) * r * 1.5, Math.sin(this.angle + 0.15 + sw) * r * 1.5); ctx.stroke(); }
        if (this.visualType === 'necro') { ctx.fillStyle = `rgba(34,211,238,${0.3 + Math.sin(Date.now() * 0.006) * 0.2})`; ctx.beginPath(); ctx.arc(Math.cos(this.angle + 0.4) * r * 1.5, Math.sin(this.angle + 0.4) * r * 1.5, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(Math.cos(this.angle - 0.4) * r * 1.5, Math.sin(this.angle - 0.4) * r * 1.5, 5, 0, Math.PI * 2); ctx.fill(); }
        if (this.isInvisible) { ctx.strokeStyle = `rgba(167,139,250,${0.4 + Math.sin(Date.now() * 0.007) * 0.3})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.restore();
        if (this.hp < this.maxHp) { const bW = r * 2.4, bH = 4, bx = x - bW / 2 + wX, by = y - r - 12 + wY; const hpR = this.hp / this.maxHp; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, by - 1, bW + 2, bH + 2); ctx.fillStyle = hpR > 0.5 ? '#22c55e' : hpR > 0.25 ? '#eab308' : '#ef4444'; ctx.fillRect(bx, by, bW * hpR, bH); }
        if (this.attackingTower) { ctx.font = '12px Arial'; ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center'; ctx.fillText('⚔', x + wX, y - r - 16 + wY); }
    }
}
