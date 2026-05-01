// ============================================
// МЕНЕДЖЕР ВОЛН
// ============================================

class WaveManager {
    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset() {
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.spawningDone = false;
    }

    startWave(waveNumber) {
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.spawningDone = false;

        const waveIndex = waveNumber - 1;
        if (waveIndex >= WAVE_DATA.length) return;

        const waveGroups = this.getWaveGroups(waveNumber);
        // Интерливим группы: для каждой группы создаём спавн-записи
        let groupQueues = [];
        const difficulty = this.game.getDifficultyConfig();
        for (const group of waveGroups) {
            let q = [];
            const count = difficulty.id === 'hard'
                ? group.count
                : Math.max(1, Math.round(group.count * difficulty.countScale));
            const interval = group.interval * (difficulty.intervalScale || 1);
            for (let i = 0; i < count; i++) {
                q.push({ type: group.type, delay: interval });
            }
            groupQueues.push(q);
        }

        // Мержим группы: берём поочерёдно из каждой
        let merged = [];
        let any = true;
        while (any) {
            any = false;
            for (let g = 0; g < groupQueues.length; g++) {
                if (groupQueues[g].length > 0) {
                    merged.push(groupQueues[g].shift());
                    any = true;
                }
            }
        }

        const bossEntry = this.getBossEntry(waveNumber);
        if (bossEntry) merged.push(bossEntry);

        this.spawnQueue = merged;
        // Первый враг спавнится сразу
        if (this.spawnQueue.length > 0) {
            this.spawnTimer = 0;
        }
    }

    update(dt) {
        if (this.spawningDone) return;
        if (this.spawnQueue.length === 0) {
            this.spawningDone = true;
            return;
        }

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            const entry = this.spawnQueue.shift();
            const enemy = new Enemy(entry.type, this.game.map, this.game.getEnemyDifficultyOverrides(entry.type, entry.overrides || {}));
            this.game.enemies.push(enemy);
            if (enemy.isBoss) this.game.announceBoss(enemy);

            if (this.spawnQueue.length > 0) {
                this.spawnTimer = this.spawnQueue[0].delay;
            } else {
                this.spawningDone = true;
            }
        }
    }

    isDone() {
        return this.spawningDone;
    }

    isDoneSpawning() {
        return this.spawningDone;
    }

    getWaveGroups(waveNumber) {
        const waveIndex = waveNumber - 1;
        return (WAVE_DATA[waveIndex] || []).filter(group => group.type !== 'boss' && !THEMED_BOSS_TYPES.has(group.type));
    }

    getBossSkyRangeReductionCells(bossStage, difficultyId) {
        const reductions = {
            easy: { 2: 3, 3: 3 },
            medium: { 2: 2.5, 3: 3 },
            hard: { 2: 2, 3: 2.5 },
        };
        return reductions[difficultyId]?.[bossStage] || 0;
    }

    getAdjustedBossSkyAttackRange(stageProfile, bossStage, difficulty) {
        const baseRange = stageProfile.skyAttackRange || 0;
        if (!stageProfile.skyAttackEnabled || bossStage >= 4 || baseRange <= 0) return baseRange;

        const reductionCells = this.getBossSkyRangeReductionCells(bossStage, difficulty.id);
        const adjustedRange = baseRange - reductionCells * CONFIG.CELL_SIZE;
        return Math.max(CONFIG.CELL_SIZE * 2, Math.round(adjustedRange));
    }

    getBossEntry(waveNumber) {
        if (waveNumber % 5 !== 0) return null;
        const dominantType = this.getDominantEnemyType(waveNumber);
        const bossType = THEMED_BOSS_TYPE_BY_BASE[dominantType];
        if (!bossType) return null;
        const bossStage = Math.max(1, Math.floor(waveNumber / 5));
        const cfg = ENEMY_TYPES[bossType];
        const stageProfile = BOSS_STAGE_PROFILES[bossStage] || BOSS_STAGE_PROFILES[4];
        const difficulty = this.game.getDifficultyConfig();
        return {
            type: bossType,
            delay: Math.max(2.8, 4.9 - bossStage * 0.4) * (difficulty.intervalScale || 1),
            overrides: {
                damage: Math.max(1, Math.round(bossStage * 5 * (difficulty.bossDamageScale || 1))),
                bossStage,
                name: stageProfile.name,
                hp: Math.round(cfg.hp * stageProfile.hpScale * (difficulty.bossHpScale || 1)),
                speed: Math.max(stageProfile.minSpeed || 8, Math.round(cfg.speed * stageProfile.speedScale * (difficulty.bossSpeedScale || 1))),
                reward: Math.round(cfg.reward * stageProfile.rewardScale),
                radius: Math.min(48, cfg.radius + stageProfile.radiusBonus),
                bodyColor: stageProfile.bodyColor || cfg.bodyColor,
                outlineColor: stageProfile.outlineColor || cfg.outlineColor,
                eyeColor: stageProfile.eyeColor || cfg.eyeColor,
                canAttackTowers: stageProfile.canAttackTowers ?? cfg.canAttackTowers,
                towerAttackDamage: Math.round((cfg.towerAttackDamage || 22) * (stageProfile.towerAttackDamageScale || 1) * (difficulty.bossDamageScale || 1)),
                towerAttackRate: stageProfile.towerAttackRate ?? Math.max(0.7, cfg.towerAttackRate || 1),
                towerAttackRange: Math.max(cfg.towerAttackRange || 60, (cfg.towerAttackRange || 60) + (stageProfile.towerAttackRangeBonus || 0)),
                maxAttackTime: (cfg.maxAttackTime || 3) + (stageProfile.maxAttackTimeBonus || 0),
                meleeWhileMoving: !!stageProfile.meleeWhileMoving,
                skyAttackEnabled: !!stageProfile.skyAttackEnabled,
                skyAttackDamage: stageProfile.skyAttackDamage,
                skyAttackRadius: stageProfile.skyAttackRadius,
                skyAttackInterval: stageProfile.skyAttackInterval,
                skyAttackDelay: stageProfile.skyAttackDelay,
                skyAttackRange: this.getAdjustedBossSkyAttackRange(stageProfile, bossStage, difficulty),
                disablePulseEnabled: !!stageProfile.disablePulseEnabled,
                disablePulseRadius: stageProfile.disablePulseRadius || 0,
                disablePulseDuration: stageProfile.disablePulseDuration || 0,
                disablePulseInterval: stageProfile.disablePulseInterval || 99,
                bossPersona: stageProfile.persona,
                bossBannerColor: stageProfile.bannerColor,
                isBoss: true,
            }
        };
    }

    getDominantEnemyType(waveNumber) {
        const startWave = Math.max(1, waveNumber - 4);
        const counts = new Map();
        let bestType = null;
        let bestCount = -1;
        let bestReward = -1;
        for (let wave = startWave; wave <= waveNumber; wave++) {
            for (const group of this.getWaveGroups(wave)) {
                counts.set(group.type, (counts.get(group.type) || 0) + group.count);
            }
        }
        for (const [type, count] of counts.entries()) {
            const reward = ENEMY_TYPES[type]?.reward || 0;
            if (count > bestCount || (count === bestCount && reward > bestReward)) {
                bestType = type;
                bestCount = count;
                bestReward = reward;
            }
        }
        return bestType;
    }
}
