// ============================================
// ЭФФЕКТЫ — улучшенные
// ============================================

class Effect {
    constructor(x, y, type, enemyType, radius, targetX, targetY) {
        this.x = x; this.y = y;
        this.type = type;
        this.enemyType = enemyType;
        this.radius = radius || 20;
        this.targetX = targetX || x;
        this.targetY = targetY || y;
        this.time = 0;
        this.done = false;
        this.particles = [];

        switch (type) {
            case 'death':
                this.maxTime = 0.7;
                const color = enemyType ? ENEMY_TYPES[enemyType].bodyColor : '#22c55e';
                for (let i = 0; i < 14; i++) {
                    const angle = (Math.PI * 2 / 14) * i + Math.random() * 0.3;
                    this.particles.push({
                        x, y, vx: Math.cos(angle) * (50 + Math.random() * 70),
                        vy: Math.sin(angle) * (50 + Math.random() * 70),
                        size: 2 + Math.random() * 4,
                        color: Math.random() > 0.3 ? color : '#450a0a', alpha: 1,
                    });
                }
                break;
            case 'explosion':
                this.maxTime = 0.55;
                for (let i = 0; i < 22; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 40 + Math.random() * 90;
                    this.particles.push({
                        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        size: 2 + Math.random() * 5,
                        color: ['#ef4444', '#f97316', '#eab308', '#dc2626'][Math.floor(Math.random() * 4)], alpha: 1,
                    });
                }
                break;
            case 'bombExplosion':
                this.maxTime = 0.8;
                for (let i = 0; i < 34; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 55 + Math.random() * 125;
                    this.particles.push({
                        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (20 + Math.random() * 35),
                        size: 3 + Math.random() * 7,
                        color: ['#f59e0b', '#f97316', '#ef4444', '#facc15', '#7f1d1d'][Math.floor(Math.random() * 5)], alpha: 1,
                    });
                }
                break;
            case 'bossBombExplosion':
                this.maxTime = 0.95;
                for (let i = 0; i < 46; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 75 + Math.random() * 150;
                    this.particles.push({
                        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (30 + Math.random() * 45),
                        size: 4 + Math.random() * 8,
                        color: ['#f97316', '#ef4444', '#facc15', '#7f1d1d', '#fb7185'][Math.floor(Math.random() * 5)], alpha: 1,
                    });
                }
                break;
            case 'nukeExplosion':
                this.maxTime = 1.35;
                for (let i = 0; i < 74; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 100 + Math.random() * 210;
                    this.particles.push({
                        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (45 + Math.random() * 55),
                        size: 4 + Math.random() * 10,
                        color: ['#facc15', '#f97316', '#fb7185', '#f8fafc', '#ef4444'][Math.floor(Math.random() * 5)], alpha: 1,
                    });
                }
                break;
            case 'towerHit':
                this.maxTime = 0.3;
                for (let i = 0; i < 8; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    this.particles.push({
                        x, y, vx: Math.cos(angle) * 30, vy: Math.sin(angle) * 30,
                        size: 1 + Math.random() * 2, color: '#f59e0b', alpha: 1,
                    });
                }
                break;
            case 'towerDestroyed':
                this.maxTime = 1.0;
                for (let i = 0; i < 30; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 30 + Math.random() * 100;
                    this.particles.push({
                        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 30,
                        size: 2 + Math.random() * 6,
                        color: ['#78716c', '#a8a29e', '#57534e', '#f97316', '#ef4444'][Math.floor(Math.random() * 5)], alpha: 1,
                    });
                }
                break;
            case 'lightning':
                this.maxTime = 0.25;
                break;
            case 'hit':
            default:
                this.maxTime = 0.25;
                break;
        }
    }

    update(dt) {
        this.time += dt;
        if (this.time >= this.maxTime) { this.done = true; return; }
        for (const p of this.particles) {
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vx *= 0.94; p.vy *= 0.94;
            p.alpha = 1 - this.time / this.maxTime;
        }
    }

    render(ctx) {
        const progress = this.time / this.maxTime;

        if (this.type === 'hit') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 5 + progress * 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,200,80,${0.5 * (1 - progress)})`;
            ctx.fill();
            return;
        }

        if (this.type === 'lightning') {
            // Зигзагообразная молния
            ctx.strokeStyle = `rgba(96,165,250,${0.8 * (1 - progress)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            const dx = this.targetX - this.x, dy = this.targetY - this.y;
            const steps = 5;
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const px = this.x + dx * t + (i < steps ? (Math.random() - 0.5) * 15 : 0);
                const py = this.y + dy * t + (i < steps ? (Math.random() - 0.5) * 15 : 0);
                ctx.lineTo(px, py);
            }
            ctx.stroke();
            // Свечение
            ctx.strokeStyle = `rgba(147,197,253,${0.3 * (1 - progress)})`;
            ctx.lineWidth = 5;
            ctx.stroke();
            return;
        }

        if (this.type === 'explosion') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * progress, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(239,68,68,${0.5 * (1 - progress)})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.fillStyle = `rgba(239,68,68,${0.1 * (1 - progress)})`;
            ctx.fill();
        } else if (this.type === 'bombExplosion') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (0.35 + progress * 0.9), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(249,115,22,${0.22 * (1 - progress)})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (0.18 + progress * 0.52), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(250,204,21,${0.28 * (1 - progress)})`;
            ctx.fill();
            for (let i = 0; i < 4; i++) {
                const flameAngle = progress * 3.2 + i * (Math.PI / 2);
                const flameLen = this.radius * (0.5 + Math.sin(progress * 8 + i) * 0.08);
                ctx.strokeStyle = `rgba(251,146,60,${0.55 * (1 - progress)})`;
                ctx.lineWidth = 6 - progress * 3;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.quadraticCurveTo(
                    this.x + Math.cos(flameAngle + 0.35) * flameLen * 0.55,
                    this.y + Math.sin(flameAngle + 0.35) * flameLen * 0.55,
                    this.x + Math.cos(flameAngle) * flameLen,
                    this.y + Math.sin(flameAngle) * flameLen
                );
                ctx.stroke();
            }
        } else if (this.type === 'bossBombExplosion') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (0.4 + progress * 1.05), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(239,68,68,${0.22 * (1 - progress)})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (0.22 + progress * 0.62), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(250,204,21,${0.26 * (1 - progress)})`;
            ctx.fill();
            for (let i = 0; i < 6; i++) {
                const flameAngle = progress * 3.8 + i * (Math.PI / 3);
                const flameLen = this.radius * (0.62 + Math.sin(progress * 9 + i) * 0.08);
                ctx.strokeStyle = `rgba(251,113,133,${0.58 * (1 - progress)})`;
                ctx.lineWidth = 7 - progress * 3.5;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.quadraticCurveTo(
                    this.x + Math.cos(flameAngle + 0.3) * flameLen * 0.55,
                    this.y + Math.sin(flameAngle + 0.3) * flameLen * 0.55,
                    this.x + Math.cos(flameAngle) * flameLen,
                    this.y + Math.sin(flameAngle) * flameLen
                );
                ctx.stroke();
            }
        } else if (this.type === 'nukeExplosion') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (0.42 + progress * 1.18), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(250,204,21,${0.26 * (1 - progress)})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (0.18 + progress * 0.66), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(249,115,22,${0.28 * (1 - progress)})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (0.08 + progress * 0.3), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(248,250,252,${0.24 * (1 - progress)})`;
            ctx.fill();
            for (let i = 0; i < 8; i++) {
                const flameAngle = progress * 4.2 + i * (Math.PI / 4);
                const flameLen = this.radius * (0.7 + Math.sin(progress * 11 + i) * 0.06);
                ctx.strokeStyle = `rgba(250,204,21,${0.62 * (1 - progress)})`;
                ctx.lineWidth = 8 - progress * 4;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.quadraticCurveTo(
                    this.x + Math.cos(flameAngle + 0.26) * flameLen * 0.55,
                    this.y + Math.sin(flameAngle + 0.26) * flameLen * 0.55,
                    this.x + Math.cos(flameAngle) * flameLen,
                    this.y + Math.sin(flameAngle) * flameLen
                );
                ctx.stroke();
            }
        }

        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y;
        this.text = text; this.color = color || '#d4a017';
        this.time = 0; this.maxTime = 1.0; this.done = false;
    }
    update(dt) {
        this.time += dt; this.y -= 28 * dt;
        if (this.time >= this.maxTime) this.done = true;
    }
    render(ctx) {
        ctx.globalAlpha = 1 - this.time / this.maxTime;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';
        ctx.fillText(this.text, this.x + 1, this.y + 1);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}
