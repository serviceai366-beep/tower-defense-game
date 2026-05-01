const CONFIG = {
    GRID_COLS: 20, GRID_ROWS: 12, CELL_SIZE: 50,
    CANVAS_WIDTH: 1000, CANVAS_HEIGHT: 600,
    START_GOLD: 170, START_LIVES: 500, LEGACY_START_LIVES: 25, BASE_HP_PER_LEGACY_LIFE: 20, TOTAL_WAVES: 20,
    PROJECTILE_SPEED: 420, SELL_RATIO: 0.5,
    WAVE_TIMER: 25, FIRST_WAVE_TIMER: 18,
    WAVE_REWARD_BASE: 30, WAVE_REWARD_PER_WAVE: 6,
    SKIP_BONUS_BASE: 15, SKIP_BONUS_PER_WAVE: 5,
    MAX_FARMS: 5,
};

const DIFFICULTY_LEVELS = {
    easy: {
        id: 'easy',
        name: 'Easy',
        badge: 'Лёгкий вход',
        description: 'Меньше врагов, медленнее темп, слабее боссы. Подходит для спокойного изучения карт и башен.',
        startGold: 272,
        countScale: 0.65,
        intervalScale: 1.18,
        enemyHpScale: 0.78,
        enemySpeedScale: 0.90,
        bossHpScale: 0.68,
        bossSpeedScale: 0.86,
        bossDamageScale: 0.72,
        rewardScale: 1.10,
    },
    medium: {
        id: 'medium',
        name: 'Medium',
        badge: 'Сбалансировано',
        description: 'Умеренный темп и чуть мягче волны. Ошибки всё ещё опасны, но игра даёт больше пространства.',
        startGold: 213,
        countScale: 0.84,
        intervalScale: 1.08,
        enemyHpScale: 0.90,
        enemySpeedScale: 0.95,
        bossHpScale: 0.84,
        bossSpeedScale: 0.94,
        bossDamageScale: 0.88,
        rewardScale: 1.04,
    },
    hard: {
        id: 'hard',
        name: 'Hard',
        badge: 'Оригинальный режим',
        description: 'Текущий полный баланс: максимальный темп, плотные волны и самые жёсткие боссы.',
        startGold: CONFIG.START_GOLD,
        countScale: 1,
        intervalScale: 1,
        enemyHpScale: 1,
        enemySpeedScale: 1,
        bossHpScale: 1,
        bossSpeedScale: 1,
        bossDamageScale: 1,
        rewardScale: 1,
    },
};

const DEFAULT_DIFFICULTY_ID = 'hard';

const ABILITY_TYPES = {
    fortress: {
        name: 'Бастион',
        icon: '🛡',
        short: 'ЩИТ',
        unlockTime: 60,
        recharge: 60,
        target: 'tower',
        duration: 18,
        fireRateMultiplier: 1.5,
        description: 'Делает турель неуязвимой и ускоряет её стрельбу на 50% на короткое время.',
    },
    freeze: {
        name: 'Крио-Стоп',
        icon: '❄',
        short: 'СТАН',
        unlockTime: 120,
        recharge: 120,
        target: 'point',
        radius: 88,
        damage: 55,
        stunDuration: 4,
        description: 'Бьёт по кругу, немного дамажит и полностью останавливает мобов на 4 секунды.',
    },
    sunfall: {
        name: 'Солнечный Выжигатель',
        icon: '☀',
        short: 'ЛУЧ',
        unlockTime: 180,
        recharge: 180,
        target: 'point',
        radius: 148,
        centerRadius: 58,
        damage: 320,
        midMultiplier: 0.62,
        outerMultiplier: 0.28,
        burnDps: 34,
        burnDuration: 5,
        strikeDelay: 0.7,
        beamDuration: 0.5,
        description: 'Орбитальный луч выжигает большую область: центр получает огромный урон, края поджигаются.',
    },
};

function expandRouteCells(route) {
    const cells = [];
    for (let i = 0; i < route.length - 1; i++) {
        const [startCol, startRow] = route[i];
        const [endCol, endRow] = route[i + 1];
        const dc = Math.sign(endCol - startCol);
        const dr = Math.sign(endRow - startRow);
        const steps = Math.max(Math.abs(endCol - startCol), Math.abs(endRow - startRow));
        for (let step = 0; step <= steps; step++) {
            const col = startCol + dc * step;
            const row = startRow + dr * step;
            const prev = cells[cells.length - 1];
            if (!prev || prev.col !== col || prev.row !== row) cells.push({ col, row });
        }
    }
    return cells;
}

function buildGridFromRoute(route, cols = CONFIG.GRID_COLS, rows = CONFIG.GRID_ROWS) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (const cell of expandRouteCells(route)) grid[cell.row][cell.col] = 1;
    return grid;
}

function buildWaypointsFromRoute(route) {
    const centers = route.map(([col, row]) => ({
        x: col * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
        y: row * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
    }));
    const first = centers[0];
    const second = centers[1];
    const dirX = Math.sign(second.x - first.x);
    const dirY = Math.sign(second.y - first.y);
    return [
        { x: first.x - dirX * CONFIG.CELL_SIZE, y: first.y - dirY * CONFIG.CELL_SIZE },
        ...centers,
    ];
}

function createMapPreset(def) {
    const cols = def.cols || CONFIG.GRID_COLS;
    const rows = def.rows || CONFIG.GRID_ROWS;
    const themeArt = {
        forest: 'assets/maps/ai-map-forest.png',
        frost: 'assets/maps/ai-map-frost.png',
        desert: 'assets/maps/ai-map-forest.png',
        swamp: 'assets/maps/ai-map-forest.png',
        volcanic: 'assets/maps/ai-map-volcanic.png',
    };
    const grid = buildGridFromRoute(def.route, cols, rows);
    const waypoints = buildWaypointsFromRoute(def.route);
    const [baseCol, baseRow] = def.route[def.route.length - 1];
    return {
        ...def,
        cols,
        rows,
        grid,
        waypoints,
        baseCell: { col: baseCol, row: baseRow },
        worldWidth: cols * CONFIG.CELL_SIZE,
        worldHeight: rows * CONFIG.CELL_SIZE,
        art: def.art || themeArt[def.theme] || themeArt.forest,
        isLarge: def.isLarge ?? (cols > CONFIG.GRID_COLS || rows > CONFIG.GRID_ROWS),
    };
}

const MAP_PRESETS = [
    createMapPreset({
        id: 'iron-crossroads',
        name: 'Железный Перекрёсток',
        theme: 'forest',
        badge: 'Военный лес',
        description: 'Старая военная трасса с грязевыми развязками и длинными прямыми для дальнобойных турелей.',
        route: [[0, 6], [5, 6], [5, 1], [10, 1], [10, 10], [14, 10], [14, 3], [19, 3], [19, 8]],
    }),
    createMapPreset({
        id: 'glacial-labyrinth',
        name: 'Ледяной Лабиринт',
        theme: 'frost',
        badge: 'Замёрзший фронт',
        description: 'Холодный серпантин среди льда. Узкие карманы хорошо подходят под контроль и замедление.',
        route: [[3, 0], [3, 4], [8, 4], [8, 1], [15, 1], [15, 8], [11, 8], [11, 10], [19, 10]],
    }),
    createMapPreset({
        id: 'dune-switchback',
        name: 'Песчаный Зигзаг',
        theme: 'desert',
        badge: 'Дюны и пыль',
        description: 'Длинные пустынные колена с хорошими позициями под splash и тяжёлую оборону.',
        route: [[0, 2], [4, 2], [4, 9], [7, 9], [7, 4], [12, 4], [12, 10], [16, 10], [16, 5], [19, 5]],
    }),
    createMapPreset({
        id: 'overgrowth-basin',
        name: 'Заросшая Чаша',
        theme: 'swamp',
        badge: 'Болото и руины',
        description: 'Маршрут через влажные заросли и руины. Много плотных зон для засад и лечения.',
        route: [[0, 8], [2, 8], [2, 2], [7, 2], [7, 6], [12, 6], [12, 1], [17, 1], [17, 9], [19, 9]],
    }),
    createMapPreset({
        id: 'ember-rift',
        name: 'Угольный Разлом',
        theme: 'volcanic',
        badge: 'Вулканический каньон',
        description: 'Тёмный базальт, трещины и лава. Опасная карта с резкими сменами вертикали и длинными линиями.',
        route: [[9, 11], [9, 8], [4, 8], [4, 3], [9, 3], [9, 6], [15, 6], [15, 1], [19, 1]],
    }),
    createMapPreset({
        id: 'frontier-convoy',
        name: 'Фронтир Конвоя',
        theme: 'forest',
        badge: 'Огромная карта',
        description: 'Экспедиционная мегакарта с очень длинной дорогой. Нужны камера, миникарта и контроль нескольких зон.',
        cols: 40,
        rows: 24,
        isLarge: true,
        route: [[0, 12], [7, 12], [7, 3], [16, 3], [16, 19], [24, 19], [24, 7], [32, 7], [32, 21], [39, 21]],
    }),
    createMapPreset({
        id: 'ashen-megaforge',
        name: 'Пепельная Магистраль',
        theme: 'volcanic',
        badge: 'Огромная карта',
        description: 'Широкий раскалённый маршрут через разломы и индустриальные зоны. Очень длинный путь и несколько глухих участков.',
        cols: 42,
        rows: 24,
        isLarge: true,
        route: [[2, 0], [2, 8], [10, 8], [10, 4], [18, 4], [18, 16], [27, 16], [27, 6], [35, 6], [35, 20], [41, 20]],
    }),
];

const DEFAULT_MAP_ID = MAP_PRESETS[0].id;

function getMapPreset(mapId) {
    return MAP_PRESETS.find(map => map.id === mapId) || MAP_PRESETS[0];
}

const PATH_WAYPOINTS = getMapPreset(DEFAULT_MAP_ID).waypoints;
const GRID_DATA = getMapPreset(DEFAULT_MAP_ID).grid;

const ENEMY_TYPES = {
    runner: { name: 'Бегун', hp: 35, speed: 120, reward: 3, bodyColor: '#4ade80', outlineColor: '#166534', eyeColor: '#ef4444', radius: 8, damage: 1, unitClass: 'light', canAttackTowers: false, isInvisible: false },
    normal: { name: 'Зомби', hp: 90, speed: 55, reward: 6, bodyColor: '#22703a', outlineColor: '#14532d', eyeColor: '#fbbf24', radius: 13, damage: 2, unitClass: 'medium', canAttackTowers: false, isInvisible: false },
    ghost: { name: 'Призрак', hp: 65, speed: 62, reward: 15, bodyColor: '#7c3aed', outlineColor: '#4c1d95', eyeColor: '#c4b5fd', radius: 11, damage: 3, unitClass: 'light', canAttackTowers: false, isInvisible: true, invisibilityLevel: 1 },
    shade: { name: 'Мираж', hp: 180, speed: 58, reward: 28, bodyColor: '#6d28d9', outlineColor: '#312e81', eyeColor: '#ddd6fe', radius: 12, damage: 8, unitClass: 'medium', canAttackTowers: false, isInvisible: true, invisibilityLevel: 2 },
    stalker: { name: 'Теневик', hp: 320, speed: 52, reward: 42, bodyColor: '#27272a', outlineColor: '#09090b', eyeColor: '#f472b6', radius: 14, damage: 14, unitClass: 'heavy', canAttackTowers: true, towerAttackDamage: 22, towerAttackRate: 1.0, towerAttackRange: 55, maxAttackTime: 3.2, isInvisible: true, invisibilityLevel: 3 },
    armored: { name: 'Бронированный', hp: 220, speed: 42, reward: 12, bodyColor: '#6b7280', outlineColor: '#374151', eyeColor: '#f87171', radius: 14, damage: 6, unitClass: 'heavy', canAttackTowers: false, isInvisible: false },
    tank: { name: 'Толстяк', hp: 400, speed: 28, reward: 18, bodyColor: '#6b21a8', outlineColor: '#3b0764', eyeColor: '#f87171', radius: 20, damage: 10, unitClass: 'heavy', canAttackTowers: false, isInvisible: false },
    destroyer: { name: 'Разрушитель', hp: 280, speed: 38, reward: 25, bodyColor: '#991b1b', outlineColor: '#450a0a', eyeColor: '#fde047', radius: 16, damage: 15, unitClass: 'heavy', canAttackTowers: true, towerAttackDamage: 30, towerAttackRate: 0.9, towerAttackRange: 65, maxAttackTime: 4, isInvisible: false },
    necro: { name: 'Некромант', hp: 160, speed: 48, reward: 22, bodyColor: '#0e7490', outlineColor: '#083344', eyeColor: '#a5f3fc', radius: 13, damage: 20, unitClass: 'medium', canAttackTowers: true, towerAttackDamage: 18, towerAttackRate: 1.2, towerAttackRange: 110, maxAttackTime: 3, isInvisible: false },
    boss: { name: 'Босс', hp: 2500, speed: 18, reward: 200, bodyColor: '#7f1d1d', outlineColor: '#3b0000', eyeColor: '#fde047', radius: 26, damage: 30, unitClass: 'heavy', canAttackTowers: true, towerAttackDamage: 50, towerAttackRate: 1.0, towerAttackRange: 80, maxAttackTime: 5, isInvisible: false },
};

const THEMED_BOSS_TYPE_BY_BASE = {
    runner: 'runnerBoss',
    normal: 'normalBoss',
    ghost: 'ghostBoss',
    shade: 'shadeBoss',
    stalker: 'stalkerBoss',
    armored: 'armoredBoss',
    tank: 'tankBoss',
    destroyer: 'destroyerBoss',
    necro: 'necroBoss',
};

const THEMED_BOSS_TYPES = new Set(Object.values(THEMED_BOSS_TYPE_BY_BASE));

const BOSS_NAME_BY_BASE = {
    runner: 'Альфа-Бегун',
    normal: 'Вожак Орды',
    ghost: 'Фантом-Лорд',
    shade: 'Повелитель Миражей',
    stalker: 'Теневой Палач',
    armored: 'Стальной Колосс',
    tank: 'Громила-Титан',
    destroyer: 'Осадный Титан',
    necro: 'Архи-Некромант',
};

const BOSS_SCALE_BY_CLASS = {
    light: { hp: 18, speed: 0.92, damage: 2.6, reward: 14, radius: 12, towerDamage: 1.45 },
    medium: { hp: 14, speed: 0.88, damage: 2.8, reward: 13, radius: 13, towerDamage: 1.55 },
    heavy: { hp: 9.5, speed: 0.94, damage: 2.4, reward: 12, radius: 14, towerDamage: 1.4 },
};

const BOSS_STAGE_SCALING = {
    1: { hp: 1, speed: 1, reward: 1, radius: 0, skyAttackEnabled: false, skyAttackDamage: 0, skyAttackRadius: 0, skyAttackInterval: 99, skyAttackDelay: 0, skyAttackRange: 0 },
    2: { hp: 2.05, speed: 1.22, reward: 1.35, radius: 2, skyAttackEnabled: true, skyAttackDamage: 72, skyAttackRadius: 52, skyAttackInterval: 5.4, skyAttackDelay: 1.05, skyAttackRange: 245 },
    3: { hp: 2.55, speed: 1.36, reward: 1.55, radius: 4, skyAttackEnabled: true, skyAttackDamage: 102, skyAttackRadius: 60, skyAttackInterval: 4.35, skyAttackDelay: 0.96, skyAttackRange: 270 },
    4: { hp: 3.05, speed: 1.52, reward: 1.8, radius: 6, skyAttackEnabled: true, skyAttackDamage: 138, skyAttackRadius: 68, skyAttackInterval: 3.45, skyAttackDelay: 0.88, skyAttackRange: 300 },
};

const BOSS_STAGE_PROFILES = {
    1: {
        name: 'Бешеный Глашатай',
        persona: 'warhorn',
        hpScale: 2.66,
        speedScale: 0.387,
        minSpeed: 18,
        rewardScale: 1.35,
        radiusBonus: 2,
        bannerColor: '#f97316',
        bodyColor: '#8b5cf6',
        outlineColor: '#4c1d95',
        eyeColor: '#fde047',
        canAttackTowers: false,
        towerAttackDamageScale: 1.5,
        towerAttackRate: 0.9,
        towerAttackRangeBonus: 10,
        maxAttackTimeBonus: 0.8,
        meleeWhileMoving: false,
        skyAttackEnabled: false,
        skyAttackDamage: 0,
        skyAttackRadius: 0,
        skyAttackInterval: 99,
        skyAttackDelay: 0,
        skyAttackRange: 0,
        disablePulseEnabled: false,
    },
    2: {
        name: 'Пожиратель Колонн',
        persona: 'juggernaut',
        hpScale: 5.2,
        speedScale: 0.34,
        minSpeed: 15,
        rewardScale: 1.7,
        radiusBonus: 4,
        bannerColor: '#ef4444',
        bodyColor: '#7f1d1d',
        outlineColor: '#450a0a',
        eyeColor: '#facc15',
        canAttackTowers: true,
        towerAttackDamageScale: 1.8,
        towerAttackRate: 0.78,
        towerAttackRangeBonus: 16,
        maxAttackTimeBonus: 1.4,
        meleeWhileMoving: false,
        skyAttackEnabled: true,
        skyAttackDamage: 120,
        skyAttackRadius: 68,
        skyAttackInterval: 4.8,
        skyAttackDelay: 0.98,
        skyAttackRange: 280,
        disablePulseEnabled: false,
    },
    3: {
        name: 'Костяной Глушитель',
        persona: 'nullifier',
        hpScale: 10.5,
        speedScale: 0.18,
        minSpeed: 11,
        rewardScale: 2.15,
        radiusBonus: 7,
        bannerColor: '#38bdf8',
        bodyColor: '#111827',
        outlineColor: '#1d4ed8',
        eyeColor: '#7dd3fc',
        canAttackTowers: true,
        towerAttackDamageScale: 2.15,
        towerAttackRate: 0.64,
        towerAttackRangeBonus: 22,
        maxAttackTimeBonus: 2.2,
        meleeWhileMoving: false,
        skyAttackEnabled: true,
        skyAttackDamage: 155,
        skyAttackRadius: 78,
        skyAttackInterval: 4.1,
        skyAttackDelay: 0.9,
        skyAttackRange: 310,
        disablePulseEnabled: true,
        disablePulseRadius: 115,
        disablePulseDuration: 2.4,
        disablePulseInterval: 5.5,
    },
    4: {
        name: 'Последний Титан',
        persona: 'cataclysm',
        hpScale: 15.5,
        speedScale: 0.1,
        minSpeed: 8,
        rewardScale: 2.8,
        radiusBonus: 10,
        bannerColor: '#facc15',
        bodyColor: '#3f0a0a',
        outlineColor: '#fb7185',
        eyeColor: '#fef08a',
        canAttackTowers: true,
        towerAttackDamageScale: 2.6,
        towerAttackRate: 0.5,
        towerAttackRangeBonus: 28,
        maxAttackTimeBonus: 3,
        meleeWhileMoving: false,
        skyAttackEnabled: true,
        skyAttackDamage: 220,
        skyAttackRadius: 96,
        skyAttackInterval: 3.35,
        skyAttackDelay: 0.82,
        skyAttackRange: 340,
        disablePulseEnabled: true,
        disablePulseRadius: 145,
        disablePulseDuration: 3.1,
        disablePulseInterval: 4.2,
    },
};

function buildBossVariant(baseType) {
    const base = ENEMY_TYPES[baseType];
    const scale = BOSS_SCALE_BY_CLASS[base.unitClass] || BOSS_SCALE_BY_CLASS.medium;
    return {
        name: BOSS_NAME_BY_BASE[baseType] || `Босс ${base.name}`,
        hp: Math.round(base.hp * scale.hp + 240),
        speed: Math.max(16, Math.round(base.speed * scale.speed)),
        reward: Math.round(base.reward * scale.reward + 40),
        bodyColor: base.bodyColor,
        outlineColor: base.outlineColor,
        eyeColor: '#fde047',
        radius: Math.min(30, base.radius + scale.radius),
        damage: Math.max(base.damage + 6, Math.round(base.damage * scale.damage)),
        unitClass: base.unitClass,
        canAttackTowers: !!base.canAttackTowers,
        towerAttackDamage: base.canAttackTowers ? Math.round((base.towerAttackDamage || 20) * scale.towerDamage + 8) : 0,
        towerAttackRate: base.canAttackTowers ? Math.max(0.7, (base.towerAttackRate || 1.0) * 0.9) : 0,
        towerAttackRange: base.canAttackTowers ? Math.max(base.towerAttackRange || 55, 55) : 60,
        maxAttackTime: base.canAttackTowers ? (base.maxAttackTime || 3) + 1 : 3,
        isInvisible: !!base.isInvisible,
        invisibilityLevel: base.invisibilityLevel || 0,
        isBoss: true,
        bossStage: 1,
        bossPersona: 'warhorn',
        bossBannerColor: '#ef4444',
        skyAttackEnabled: false,
        skyAttackDamage: 0,
        skyAttackRadius: 0,
        skyAttackInterval: 99,
        skyAttackDelay: 0,
        skyAttackRange: 0,
        disablePulseEnabled: false,
        disablePulseRadius: 0,
        disablePulseDuration: 0,
        disablePulseInterval: 99,
        meleeWhileMoving: false,
        visualType: baseType,
        profileType: baseType,
    };
}

for (const [baseType, bossType] of Object.entries(THEMED_BOSS_TYPE_BY_BASE)) {
    ENEMY_TYPES[bossType] = buildBossVariant(baseType);
}

const TOWER_TYPES = {
    lightWall: {
        name: 'Лёгкая стена', icon: '🧱', description: 'Дешёвый барьер на дороге, задерживает слабых врагов',
        cost: 75, damage: 0, range: 0, fireRate: 999, hp: 50, unlockWave: 0,
        isWall: true,
        baseColor: '#78716c', turretColor: '#57534e', barrelColor: '#44403c',
        projectileColor: '#000', projectileSize: 0, isAoe: false, chainTargets: 0,
        buildTime: 0, upgradeTimes: [], upgrades: [],
    },
    mediumWall: {
        name: 'Средняя стена', icon: '🧱', description: 'Надёжный барьер для средней волны давления',
        cost: 225, damage: 0, range: 0, fireRate: 999, hp: 100, unlockWave: 0,
        isWall: true,
        baseColor: '#71717a', turretColor: '#52525b', barrelColor: '#3f3f46',
        projectileColor: '#000', projectileSize: 0, isAoe: false, chainTargets: 0,
        buildTime: 0, upgradeTimes: [], upgrades: [],
    },
    heavyWall: {
        name: 'Тяжёлая стена', icon: '🧱', description: 'Толстый барьер для тяжёлых и поздних врагов',
        cost: 375, damage: 0, range: 0, fireRate: 999, hp: 200, unlockWave: 0,
        isWall: true,
        baseColor: '#52525b', turretColor: '#3f3f46', barrelColor: '#27272a',
        projectileColor: '#000', projectileSize: 0, isAoe: false, chainTargets: 0,
        buildTime: 0, upgradeTimes: [], upgrades: [],
    },
    pistol: {
        name: 'Пистолет', icon: '🔫', description: 'Дешёвый, медленный, слабый',
        cost: 35, damage: 10, range: 90, fireRate: 0.9, hp: 100, unlockWave: 0,
        baseColor: '#4b5563', turretColor: '#374151', barrelColor: '#1f2937',
        projectileColor: '#e5e7eb', projectileSize: 2, isAoe: false, chainTargets: 0,
        damageModifiers: { light: 1.08, heavy: 0.85 },
        buildTime: 3.0, upgradeTimes: [2.0, 3.0],
        upgrades: [{ cost: 26, damage: 16, range: 100, hp: 130 }, { cost: 48, damage: 24, range: 110, hp: 160 }],
    },
    machinegun: {
        name: 'Пулемёт', icon: '⚙', description: 'Стрельба очередями (ускоряется с ур.)',
        cost: 115, damage: 10, range: 115, fireRate: 0.45, hp: 170, unlockWave: 0,
        baseColor: '#64748b', turretColor: '#475569', barrelColor: '#334155',
        projectileColor: '#fde047', projectileSize: 3, isAoe: false, chainTargets: 0,
        damageModifiers: { light: 1.18, heavy: 0.75 },
        buildTime: 4.0, upgradeTimes: [3.0, 4.5],
        upgrades: [{ cost: 154, damage: 15, range: 125, hp: 210, fireRate: 0.28 }, { cost: 246, damage: 22, range: 140, hp: 260, fireRate: 0.14 }],
    },
    rifle: {
        name: 'Стрелковая', icon: '🎯', description: 'Сбалансированная, точная',
        cost: 200, damage: 41, range: 160, fireRate: 0.75, hp: 190, unlockWave: 2,
        baseColor: '#92400e', turretColor: '#78350f', barrelColor: '#451a03',
        projectileColor: '#fb923c', projectileSize: 4, isAoe: false, chainTargets: 0,
        damageModifiers: { medium: 1.1, light: 0.95 },
        buildTime: 4.5, upgradeTimes: [3.0, 5.0],
        upgrades: [{ cost: 130, damage: 65, range: 175, hp: 230 }, { cost: 200, damage: 97, range: 195, hp: 280 }],
    },
    scanner: {
        name: 'Сканер', icon: '📡', description: 'Базово видит скрытность ур.1, с апгрейдом открывает ур.2 и ур.3',
        cost: 175, damage: 0, range: 0, fireRate: 999, hp: 100, unlockWave: 3,
        isScanner: true, scanRadius: 150, detectionLevel: 1,
        baseColor: '#1e3a5f', turretColor: '#1e40af', barrelColor: '#1e3a8a',
        projectileColor: '#60a5fa', projectileSize: 0, isAoe: false, chainTargets: 0,
        buildTime: 3.5, upgradeTimes: [2.5, 4.0],
        upgrades: [{ cost: 120, scanRadius: 210, hp: 130, detectionLevel: 2 }, { cost: 200, scanRadius: 280, hp: 160, detectionLevel: 3 }],
    },
    flamethrower: {
        name: 'Огнемёт', icon: '🔥', description: 'Ближний бой, урон по области',
        cost: 300, damage: 11, range: 85, fireRate: 0.1, hp: 130, unlockWave: 4,
        baseColor: '#9a3412', turretColor: '#7c2d12', barrelColor: '#431407',
        projectileColor: '#f97316', projectileSize: 5, isAoe: true, aoeRadius: 35, chainTargets: 0,
        damageModifiers: { medium: 0.5, heavy: 0.5 },
        buildTime: 5.0, upgradeTimes: [3.5, 5.5],
        upgrades: [{ cost: 200, damage: 16, range: 95, hp: 170, aoeRadius: 42 }, { cost: 300, damage: 22, range: 105, hp: 210, aoeRadius: 50 }],
    },
    sniper: {
        name: 'Снайперская', icon: '🔭', description: 'Ручной выстрел по ПКМ, огромный урон, долгая перезарядка',
        cost: 350, damage: 280, range: 280, fireRate: 3.0, hp: 125, unlockWave: 6,
        isManualAim: true,
        baseColor: '#1e293b', turretColor: '#0f172a', barrelColor: '#020617',
        projectileColor: '#ef4444', projectileSize: 4, isAoe: false, chainTargets: 0,
        damageModifiers: { heavy: 1.25, light: 0.8 },
        buildTime: 6.0, upgradeTimes: [4.0, 6.5],
        upgrades: [{ cost: 230, damage: 320, range: 305, fireRate: 2.5 }, { cost: 350, damage: 370, range: 335, fireRate: 2.0 }],
    },
    grenade: {
        name: 'Гранатомёт', icon: '💣', description: 'Мощный урон по области',
        cost: 300, damage: 49, range: 155, fireRate: 1.8, hp: 170, unlockWave: 6,
        baseColor: '#3f6212', turretColor: '#365314', barrelColor: '#1a2e05',
        projectileColor: '#ff5722', projectileSize: 7, isAoe: true, aoeRadius: 57, splashDamageBands: [{ radiusRatio: 0.34, multiplier: 0.5 }, { radiusRatio: 0.68, multiplier: 0.15 }, { radiusRatio: 1, multiplier: 0.1 }], chainTargets: 0,
        damageModifiers: { medium: 1.4, light: 0.915 },
        buildTime: 5.5, upgradeTimes: [3.5, 5.5],
        upgrades: [{ cost: 200, damage: 74, range: 165, hp: 210, aoeRadius: 67 }, { cost: 320, damage: 108, range: 180, hp: 260, aoeRadius: 81 }],
    },
    cryo: {
        name: 'Крио-пушка', icon: '❄', description: 'Замедляет врагов и режет темп тяжёлых волн',
        cost: 275, damage: 18, range: 150, fireRate: 0.6, hp: 170, unlockWave: 7,
        baseColor: '#0f766e', turretColor: '#115e59', barrelColor: '#083344',
        projectileColor: '#67e8f9', projectileSize: 4, isAoe: false, chainTargets: 0,
        slowFactor: 0.72, slowDuration: 1.2,
        damageModifiers: { heavy: 1.12, light: 0.92 },
        buildTime: 5.0, upgradeTimes: [3.5, 5.5],
        upgrades: [{ cost: 180, damage: 27, hp: 210, slowFactor: 0.6, slowDuration: 1.45 }, { cost: 280, damage: 38, hp: 250, fireRate: 0.52, slowFactor: 0.48, slowDuration: 1.7 }],
    },
    rocket: {
        name: 'Ракетная', icon: '🚀', description: 'Тяжёлые ракеты, большой AoE',
        cost: 450, damage: 93, range: 185, fireRate: 2.8, hp: 210, unlockWave: 9,
        baseColor: '#57534e', turretColor: '#44403c', barrelColor: '#292524',
        projectileColor: '#ef4444', projectileSize: 8, isAoe: true, aoeRadius: 71, splashDamageBands: [{ radiusRatio: 0.34, multiplier: 0.5 }, { radiusRatio: 0.68, multiplier: 0.15 }, { radiusRatio: 1, multiplier: 0.1 }], chainTargets: 0,
        damageModifiers: { heavy: 1.47, light: 0.8725 },
        buildTime: 7.0, upgradeTimes: [5.0, 7.5],
        upgrades: [{ cost: 300, damage: 147, range: 200, hp: 260, aoeRadius: 81 }, { cost: 450, damage: 215, range: 215, hp: 320, aoeRadius: 95 }],
    },
    pulse: {
        name: 'Импульсная', icon: '📳', description: 'Бьёт круговой волной по всем врагам в зоне',
        cost: 430, damage: 36, range: 110, fireRate: 2.6, hp: 220, unlockWave: 10,
        isPulseTower: true,
        baseColor: '#312e81', turretColor: '#3730a3', barrelColor: '#1e1b4b',
        projectileColor: '#818cf8', projectileSize: 0, isAoe: false, chainTargets: 0,
        damageModifiers: { medium: 1.1, heavy: 0.9 },
        buildTime: 6.5, upgradeTimes: [4.5, 6.5],
        upgrades: [{ cost: 280, damage: 55, hp: 260, fireRate: 2.2 }, { cost: 420, damage: 78, hp: 320, fireRate: 1.85 }],
    },
    tesla: {
        name: 'Тесла', icon: '⚡', description: 'Электроцепь, бьёт нескольких',
        cost: 500, damage: 55, range: 130, fireRate: 0.7, hp: 145, unlockWave: 12,
        baseColor: '#1e40af', turretColor: '#1e3a8a', barrelColor: '#172554',
        projectileColor: '#60a5fa', projectileSize: 5, isAoe: false, chainTargets: 3,
        damageModifiers: { light: 1.15, heavy: 0.8 },
        buildTime: 8.0, upgradeTimes: [6.0, 10.0],
        upgrades: [{ cost: 320, damage: 80, range: 145, hp: 185, chainTargets: 4 }, { cost: 500, damage: 120, range: 160, hp: 225, chainTargets: 5 }],
    },
    airfield: {
        name: 'Аэродром', icon: '✈', description: 'Самолёт кружит над полосой и поливает трассу сверху',
        cost: 575, damage: 11, range: 0, fireRate: 0.2, hp: 240, unlockWave: 12,
        isAirfield: true,
        footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        orbitRadius: 115, airAttackRadius: 62, orbitSpeed: 0.78, takeoffTime: 2.1,
        projectileSpeedMultiplier: 1,
        rocketDamage: 0, rocketAoeRadius: 0, rocketCooldown: 999,
        rocketSplashBands: [{ radiusRatio: 0.35, multiplier: 0.5 }, { radiusRatio: 0.7, multiplier: 0.15 }, { radiusRatio: 1, multiplier: 0.1 }],
        baseColor: '#334155', turretColor: '#94a3b8', barrelColor: '#0f172a',
        projectileColor: '#f8fafc', projectileSize: 2.8, isAoe: false, chainTargets: 0,
        damageModifiers: { light: 1.08, heavy: 0.88 },
        buildTime: 8.5, upgradeTimes: [5.0, 7.5],
        upgrades: [{ cost: 360, damage: 15, hp: 290, fireRate: 0.17, projectileSpeedMultiplier: 1.35 }, { cost: 540, damage: 18, hp: 340, fireRate: 0.16, projectileSpeedMultiplier: 1.5, rocketDamage: 94, rocketAoeRadius: 48, rocketCooldown: 5.2 }],
    },
    nukeSilo: {
        name: 'Ядерная шахта', icon: '☢', description: 'Ручной пуск ракет по всей карте. Боеголовки покупаются отдельно и копятся в шахте.',
        cost: 800, damage: 0, range: 0, fireRate: 999, hp: 320, unlockWave: 10,
        isNukeSilo: true,
        canPlaceAnywhere: true,
        footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
        baseColor: '#0f172a', turretColor: '#1e293b', barrelColor: '#64748b',
        projectileColor: '#f8fafc', projectileSize: 0, isAoe: false, chainTargets: 0,
        buildTime: 9.5, upgradeTimes: [], upgrades: [],
    },
    railgun: {
        name: 'Рельсотрон', icon: '☄', description: 'Сверхурон, медленный, хрупкий',
        cost: 600, damage: 380, range: 350, fireRate: 3.8, hp: 105, unlockWave: 15,
        baseColor: '#18181b', turretColor: '#09090b', barrelColor: '#000',
        projectileColor: '#c084fc', projectileSize: 5, isAoe: false, chainTargets: 0,
        damageModifiers: { heavy: 1.3, light: 0.85 },
        buildTime: 9.0, upgradeTimes: [7.0, 11.0],
        upgrades: [{ cost: 400, damage: 600, range: 370, hp: 135, fireRate: 3.6 }, { cost: 600, damage: 900, range: 400, hp: 165, fireRate: 3.4 }],
    },
    healer: {
        name: 'Ремонтная', icon: '🔧', description: 'Восстанавливает HP башням в зоне',
        cost: 225, damage: 0, range: 0, fireRate: 999, hp: 130, unlockWave: 5,
        isHealer: true, healRadius: 120, healRate: 5,
        baseColor: '#065f46', turretColor: '#047857', barrelColor: '#059669',
        projectileColor: '#34d399', projectileSize: 0, isAoe: false, chainTargets: 0,
        buildTime: 4.5, upgradeTimes: [3.0, 5.0],
        upgrades: [{ cost: 150, healRadius: 170, healRate: 10, hp: 170 }, { cost: 250, healRadius: 230, healRate: 15, hp: 210 }],
    },
    farm: {
        name: 'Ферма', icon: '🌾', description: 'Доход каждый раунд (макс. 5)',
        cost: 200, damage: 0, range: 0, fireRate: 999, hp: 80, unlockWave: 0,
        isFarm: true, farmIncome: 100,
        baseColor: '#854d0e', turretColor: '#a16207', barrelColor: '#ca8a04',
        projectileColor: '#fde047', projectileSize: 0, isAoe: false, chainTargets: 0,
        buildTime: 4.0, upgradeTimes: [2.5, 4.0],
        upgrades: [{ cost: 267, farmIncome: 190, hp: 110 }, { cost: 467, farmIncome: 300, hp: 140 }],
    },
};

const NUCLEAR_PAYLOADS = {
    tactical: {
        name: 'Малая ракета',
        shortName: 'МАЛАЯ',
        icon: '🚀',
        color: '#f8fafc',
        size: 6,
        cost: 240,
        damage: 850,
        aoeRadius: 0,
        splashDamageBands: null,
        speedMultiplier: 0.2,
        directHitRadius: 18,
        maxAltitude: 170,
        renderStyle: 'missile',
        impactEffect: 'explosion',
        impactSound: 'tactical',
        launchSound: 'tactical',
        inventoryColor: '#e2e8f0',
        burnDps: 0,
        burnDuration: 0,
    },
    strategic: {
        name: 'Стратегическая',
        shortName: 'СТРАТ',
        icon: '🛰',
        color: '#fb7185',
        size: 8,
        cost: 620,
        damage: 1450,
        aoeRadius: 95,
        splashDamageBands: [{ radiusRatio: 0.26, multiplier: 0.75 }, { radiusRatio: 0.58, multiplier: 0.35 }, { radiusRatio: 1, multiplier: 0.14 }],
        speedMultiplier: 0.17,
        directHitRadius: 20,
        maxAltitude: 200,
        renderStyle: 'strategicMissile',
        impactEffect: 'bombExplosion',
        impactSound: 'strategic',
        launchSound: 'strategic',
        inventoryColor: '#fb7185',
        burnDps: 0,
        burnDuration: 0,
    },
    tsar: {
        name: 'Царь-бомба',
        shortName: 'ЦАРЬ',
        icon: '☢',
        color: '#facc15',
        size: 10,
        cost: 1000,
        damage: 3975,
        aoeRadius: 270,
        splashDamageBands: [{ radiusRatio: 0.18, multiplier: 1.0 }, { radiusRatio: 0.48, multiplier: 0.34 }, { radiusRatio: 1, multiplier: 0.08 }],
        speedMultiplier: 0.14,
        directHitRadius: 42,
        directHitMultiplier: 1.15,
        maxAltitude: 230,
        renderStyle: 'nukeMissile',
        impactEffect: 'nukeExplosion',
        impactSound: 'tsar',
        launchSound: 'tsar',
        inventoryColor: '#facc15',
        burnDps: 95,
        burnDuration: 5,
    },
};

const WAVE_DATA = [
    [{ type: 'runner', count: 10, interval: 0.7 }],
    [{ type: 'normal', count: 8, interval: 0.9 }],
    [{ type: 'runner', count: 14, interval: 0.5 }, { type: 'normal', count: 6, interval: 0.8 }],
    [{ type: 'normal', count: 10, interval: 0.7 }, { type: 'runner', count: 8, interval: 0.4 }],
    [{ type: 'normal', count: 8, interval: 0.6 }, { type: 'ghost', count: 4, interval: 1.2 }, { type: 'runner', count: 12, interval: 0.4 }],
    [{ type: 'normal', count: 12, interval: 0.6 }, { type: 'armored', count: 4, interval: 1.2 }, { type: 'ghost', count: 5, interval: 1.0 }],
    [{ type: 'runner', count: 18, interval: 0.35 }, { type: 'normal', count: 10, interval: 0.6 }, { type: 'armored', count: 4, interval: 1.2 }, { type: 'tank', count: 2, interval: 2.5 }],
    [{ type: 'normal', count: 12, interval: 0.5 }, { type: 'tank', count: 5, interval: 2.0 }, { type: 'ghost', count: 6, interval: 0.9 }, { type: 'armored', count: 5, interval: 1.0 }],
    [{ type: 'runner', count: 20, interval: 0.3 }, { type: 'normal', count: 12, interval: 0.5 }, { type: 'tank', count: 4, interval: 1.8 }, { type: 'destroyer', count: 2, interval: 3.0 }, { type: 'ghost', count: 5, interval: 1.0 }],
    [{ type: 'normal', count: 14, interval: 0.5 }, { type: 'tank', count: 6, interval: 1.5 }, { type: 'destroyer', count: 3, interval: 2.5 }, { type: 'boss', count: 1, interval: 5.0 }],
    [{ type: 'runner', count: 25, interval: 0.25 }, { type: 'normal', count: 14, interval: 0.45 }, { type: 'tank', count: 5, interval: 1.5 }, { type: 'destroyer', count: 4, interval: 2.0 }, { type: 'ghost', count: 7, interval: 0.8 }],
    [{ type: 'normal', count: 16, interval: 0.4 }, { type: 'armored', count: 8, interval: 0.8 }, { type: 'tank', count: 7, interval: 1.2 }, { type: 'destroyer', count: 4, interval: 2.0 }, { type: 'ghost', count: 6, interval: 0.9 }],
    [{ type: 'normal', count: 18, interval: 0.4 }, { type: 'tank', count: 8, interval: 1.0 }, { type: 'destroyer', count: 5, interval: 1.8 }, { type: 'necro', count: 3, interval: 2.5 }, { type: 'ghost', count: 6, interval: 0.7 }, { type: 'shade', count: 3, interval: 1.1 }],
    [{ type: 'runner', count: 30, interval: 0.2 }, { type: 'normal', count: 16, interval: 0.4 }, { type: 'tank', count: 8, interval: 1.0 }, { type: 'destroyer', count: 5, interval: 1.5 }, { type: 'necro', count: 4, interval: 2.0 }, { type: 'ghost', count: 5, interval: 0.8 }, { type: 'shade', count: 4, interval: 1.0 }],
    [{ type: 'normal', count: 20, interval: 0.35 }, { type: 'tank', count: 10, interval: 0.9 }, { type: 'destroyer', count: 6, interval: 1.5 }, { type: 'necro', count: 5, interval: 1.8 }, { type: 'boss', count: 2, interval: 5.0 }, { type: 'ghost', count: 6, interval: 0.7 }, { type: 'shade', count: 5, interval: 0.95 }],
    [{ type: 'runner', count: 35, interval: 0.18 }, { type: 'normal', count: 20, interval: 0.35 }, { type: 'armored', count: 10, interval: 0.7 }, { type: 'destroyer', count: 7, interval: 1.2 }, { type: 'necro', count: 5, interval: 1.5 }, { type: 'ghost', count: 8, interval: 0.6 }, { type: 'shade', count: 6, interval: 0.9 }],
    [{ type: 'normal', count: 22, interval: 0.3 }, { type: 'tank', count: 12, interval: 0.8 }, { type: 'destroyer', count: 8, interval: 1.2 }, { type: 'necro', count: 6, interval: 1.5 }, { type: 'ghost', count: 6, interval: 0.7 }, { type: 'shade', count: 5, interval: 0.9 }, { type: 'stalker', count: 2, interval: 1.7 }],
    [{ type: 'normal', count: 25, interval: 0.3 }, { type: 'tank', count: 14, interval: 0.7 }, { type: 'destroyer', count: 10, interval: 1.0 }, { type: 'necro', count: 7, interval: 1.2 }, { type: 'boss', count: 3, interval: 4.0 }, { type: 'ghost', count: 6, interval: 0.6 }, { type: 'shade', count: 6, interval: 0.85 }, { type: 'stalker', count: 3, interval: 1.6 }],
    [{ type: 'runner', count: 40, interval: 0.15 }, { type: 'normal', count: 25, interval: 0.25 }, { type: 'tank', count: 14, interval: 0.7 }, { type: 'destroyer', count: 12, interval: 0.9 }, { type: 'necro', count: 8, interval: 1.0 }, { type: 'boss', count: 3, interval: 3.5 }, { type: 'ghost', count: 8, interval: 0.5 }, { type: 'shade', count: 6, interval: 0.8 }, { type: 'stalker', count: 4, interval: 1.4 }],
    [{ type: 'runner', count: 50, interval: 0.12 }, { type: 'normal', count: 30, interval: 0.2 }, { type: 'tank', count: 16, interval: 0.6 }, { type: 'destroyer', count: 14, interval: 0.8 }, { type: 'necro', count: 10, interval: 0.9 }, { type: 'boss', count: 5, interval: 3.0 }, { type: 'ghost', count: 8, interval: 0.4 }, { type: 'shade', count: 8, interval: 0.75 }, { type: 'stalker', count: 5, interval: 1.3 }],
];

function getWaveGroupsForBaseBalance(waveNumber) {
    const waveIndex = waveNumber - 1;
    return (WAVE_DATA[waveIndex] || []).filter(group => group.type !== 'boss' && !THEMED_BOSS_TYPES.has(group.type));
}

function getDominantEnemyTypeForBaseBalance(waveNumber) {
    const startWave = Math.max(1, waveNumber - 4);
    const counts = new Map();
    let bestType = null;
    let bestCount = -1;
    let bestReward = -1;
    for (let wave = startWave; wave <= waveNumber; wave++) {
        for (const group of getWaveGroupsForBaseBalance(wave)) {
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

function getBossEntryForBaseBalance(waveNumber) {
    if (waveNumber % 5 !== 0) return null;
    const dominantType = getDominantEnemyTypeForBaseBalance(waveNumber);
    const bossType = THEMED_BOSS_TYPE_BY_BASE[dominantType];
    if (!bossType) return null;
    const bossStage = Math.max(1, Math.floor(waveNumber / 5));
    const cfg = ENEMY_TYPES[bossType];
    const stageProfile = BOSS_STAGE_PROFILES[bossStage] || BOSS_STAGE_PROFILES[4];
    return {
        type: bossType,
        overrides: {
            damage: bossStage * 5,
            hp: Math.round(cfg.hp * stageProfile.hpScale),
        },
    };
}

function getEnemyBaseDamage(enemy) {
    return Math.max(0, Math.round(enemy?.hp || 0));
}

function calculateEquivalentBaseHp() {
    let totalEnemyHp = 0;
    let totalLegacyDamage = 0;

    for (let wave = 1; wave <= CONFIG.TOTAL_WAVES; wave++) {
        for (const group of getWaveGroupsForBaseBalance(wave)) {
            const cfg = ENEMY_TYPES[group.type];
            if (!cfg) continue;
            totalEnemyHp += cfg.hp * group.count;
            totalLegacyDamage += cfg.damage * group.count;
        }

        const bossEntry = getBossEntryForBaseBalance(wave);
        if (!bossEntry) continue;
        const bossCfg = ENEMY_TYPES[bossEntry.type];
        totalEnemyHp += (bossEntry.overrides?.hp ?? bossCfg.hp);
        totalLegacyDamage += (bossEntry.overrides?.damage ?? bossCfg.damage);
    }

    if (totalEnemyHp <= 0 || totalLegacyDamage <= 0) return CONFIG.LEGACY_START_LIVES;
    return Math.max(CONFIG.LEGACY_START_LIVES, Math.round(CONFIG.LEGACY_START_LIVES * (totalEnemyHp / totalLegacyDamage)));
}

CONFIG.START_LIVES = 500;
CONFIG.BASE_HP_PER_LEGACY_LIFE = CONFIG.START_LIVES / CONFIG.LEGACY_START_LIVES;

const TARGET_MODES = ['first', 'last', 'strong', 'close'];
const TARGET_MODE_NAMES = { first: 'Первый', last: 'Последний', strong: 'Сильный', close: 'Ближний' };
