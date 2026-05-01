// ============================================
// СНАРЯД — с цепной молнией
// ============================================

class Projectile {
    constructor(x, y, target, damage, color, size, sourceTower, aoeRadius, chainTargets, splashDamageMultiplier, splashDamageBands, speedMultiplier, renderOptions = null) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.targetX = target.x;
        this.targetY = target.y;
        this.pointTarget = !!target?.isPointTarget;
        this.damage = damage;
        this.color = color;
        this.size = size;
        this.sourceTower = sourceTower || null;
        this.aoeRadius = aoeRadius || 0;
        this.chainTargets = chainTargets || 0;
        this.splashDamageMultiplier = splashDamageMultiplier || 1;
        this.splashDamageBands = splashDamageBands || null;
        this.speed = CONFIG.PROJECTILE_SPEED * (speedMultiplier || 1);
        this.renderStyle = renderOptions?.style || 'default';
        this.altitude = renderOptions?.altitude || 0;
        this.maxAltitude = this.altitude;
        this.lockTargetPoint = !!renderOptions?.lockTargetPoint;
        this.targetTracks = renderOptions?.targetTracks !== false;
        this.directHitRadius = renderOptions?.directHitRadius || 0;
        this.directHitMultiplier = renderOptions?.directHitMultiplier || 1;
        this.impactEffect = renderOptions?.impactEffect || null;
        this.impactSound = renderOptions?.impactSound || null;
        this.burnDps = renderOptions?.burnDps || 0;
        this.burnDuration = renderOptions?.burnDuration || 0;
        this.payloadKind = renderOptions?.payloadKind || '';
        this.hit = false;
        this.expired = false;
        this.trail = [];
        this.initialDistance = Math.max(1, Math.hypot(this.targetX - this.x, this.targetY - this.y));
        const travelTime = this.initialDistance / Math.max(1, this.speed);
        this.lifetime = Math.max(6, travelTime + (this.targetTracks && !this.lockTargetPoint ? 8 : 3));
    }
    getDamageAgainst(enemy) {
        if (!this.sourceTower) return this.damage;
        const modifiers = this.sourceTower.getConfig().damageModifiers;
        const mult = modifiers && enemy ? (modifiers[enemy.unitClass] ?? 1) : 1;
        return this.damage * mult;
    }
    getDirectDamageAgainst(enemy) {
        return this.getDamageAgainst(enemy) * this.directHitMultiplier;
    }
    getSplashDamageAgainst(enemy, distance) {
        const baseDamage = this.getDamageAgainst(enemy);
        if (!this.splashDamageBands || !this.splashDamageBands.length || this.aoeRadius <= 0) {
            return baseDamage * this.splashDamageMultiplier;
        }
        for (const band of this.splashDamageBands) {
            if (distance <= this.aoeRadius * band.radiusRatio) return baseDamage * band.multiplier;
        }
        return baseDamage * this.splashDamageMultiplier;
    }

    update(dt) {
        this.lifetime -= dt;
        if (this.lifetime <= 0) { this.expired = true; return; }

        if (!this.lockTargetPoint && this.targetTracks && this.target && !this.target.isDead && !this.target.reachedEnd) {
            this.targetX = this.target.x;
            this.targetY = this.target.y;
        }

        const dx = this.targetX - this.x, dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10) { this.hit = true; return; }

        const move = this.speed * dt;
        if (move >= dist) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.altitude = 0;
            this.hit = true;
            return;
        }
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
        if (this.maxAltitude > 0 && this.renderStyle === 'bomb') {
            const nextDist = Math.max(0, dist - move);
            this.altitude = this.maxAltitude * Math.min(1, nextDist / this.initialDistance);
        } else if (this.maxAltitude > 0 && this.renderStyle !== 'default') {
            const progress = Math.max(0, Math.min(1, 1 - Math.max(0, dist - move) / this.initialDistance));
            this.altitude = Math.sin(progress * Math.PI) * this.maxAltitude;
        }

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) this.trail.shift();
    }

    render(ctx) {
        if (this.renderStyle === 'bomb') {
            const renderY = this.y - this.altitude;
            ctx.fillStyle = `rgba(0,0,0,${0.18 + (this.maxAltitude ? this.altitude / this.maxAltitude : 0) * 0.18})`;
            ctx.beginPath();
            ctx.ellipse(this.x + 3, this.y + 4, this.size + 4, Math.max(2, this.size * 0.6), 0, 0, Math.PI * 2);
            ctx.fill();
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i];
                const alpha = (i / this.trail.length) * 0.25;
                ctx.fillStyle = `rgba(245,158,11,${alpha})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y - this.altitude * (i / Math.max(1, this.trail.length)), this.size * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(this.x, renderY, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(this.x - 1, renderY - this.size - 3, 2, 5);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x, renderY - this.size - 1);
            ctx.lineTo(this.x + Math.sin(Date.now() * 0.02) * 4, renderY - this.size - 8);
            ctx.stroke();
            ctx.fillStyle = 'rgba(251,191,36,0.65)';
            ctx.beginPath();
            ctx.arc(this.x + Math.sin(Date.now() * 0.02) * 4, renderY - this.size - 8, 2.2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        if (this.renderStyle === 'missile' || this.renderStyle === 'strategicMissile' || this.renderStyle === 'nukeMissile') {
            const renderY = this.y - this.altitude;
            const angle = Math.atan2(this.targetY - this.y, this.targetX - this.x) + Math.PI / 2;
            const bodyColor = this.renderStyle === 'nukeMissile' ? '#facc15' : this.renderStyle === 'strategicMissile' ? '#fb7185' : '#e2e8f0';
            const finColor = this.renderStyle === 'nukeMissile' ? '#7f1d1d' : this.renderStyle === 'strategicMissile' ? '#7f1d1d' : '#64748b';
            const flameColor = this.renderStyle === 'nukeMissile' ? '#f97316' : this.renderStyle === 'strategicMissile' ? '#fb7185' : '#f59e0b';
            const scale = this.renderStyle === 'nukeMissile' ? 1.45 : this.renderStyle === 'strategicMissile' ? 1.18 : 1;
            ctx.fillStyle = `rgba(0,0,0,${0.12 + (this.maxAltitude ? this.altitude / this.maxAltitude : 0) * 0.18})`;
            ctx.beginPath();
            ctx.ellipse(this.x + 4, this.y + 6, this.size * (1.3 * scale), this.size * (0.46 * scale), 0, 0, Math.PI * 2);
            ctx.fill();
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i];
                const alpha = ((i + 1) / this.trail.length) * 0.18;
                ctx.fillStyle = `rgba(251,146,60,${alpha})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y - this.altitude * 0.35, this.size * 0.55, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.save();
            ctx.translate(this.x, renderY);
            ctx.rotate(angle);
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.moveTo(0, -this.size * 2.2 * scale);
            ctx.lineTo(this.size * 0.8 * scale, -this.size * 0.9 * scale);
            ctx.lineTo(this.size * 0.8 * scale, this.size * 2.2 * scale);
            ctx.lineTo(-this.size * 0.8 * scale, this.size * 2.2 * scale);
            ctx.lineTo(-this.size * 0.8 * scale, -this.size * 0.9 * scale);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = finColor;
            ctx.beginPath();
            ctx.moveTo(-this.size * 1.2 * scale, this.size * 1.6 * scale);
            ctx.lineTo(-this.size * 0.45 * scale, this.size * 0.7 * scale);
            ctx.lineTo(-this.size * 0.15 * scale, this.size * 1.9 * scale);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.size * 1.2 * scale, this.size * 1.6 * scale);
            ctx.lineTo(this.size * 0.45 * scale, this.size * 0.7 * scale);
            ctx.lineTo(this.size * 0.15 * scale, this.size * 1.9 * scale);
            ctx.closePath();
            ctx.fill();
            if (this.renderStyle !== 'missile') {
                ctx.fillStyle = this.renderStyle === 'nukeMissile' ? '#111827' : '#334155';
                ctx.fillRect(-this.size * 0.32 * scale, -this.size * 0.2 * scale, this.size * 0.64 * scale, this.size * 1.55 * scale);
            }
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.15;
            ctx.stroke();
            ctx.strokeStyle = flameColor;
            ctx.lineWidth = 2.4 * scale;
            ctx.beginPath();
            ctx.moveTo(0, this.size * 2.2 * scale);
            ctx.lineTo(Math.sin(Date.now() * 0.03 + this.x * 0.05) * this.size * 0.8 * scale, this.size * 3.5 * scale);
            ctx.stroke();
            ctx.fillStyle = flameColor;
            ctx.beginPath();
            ctx.arc(Math.sin(Date.now() * 0.03 + this.x * 0.05) * this.size * 0.8 * scale, this.size * 3.5 * scale, this.size * 0.42 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }
        // След
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            ctx.globalAlpha = (i / this.trail.length) * 0.35;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.size * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Снаряд
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Свечение
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,240,180,0.15)';
        ctx.fill();
    }
}
