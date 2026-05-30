const SPRITE_PATHS = {
    enemies: {
        runner: 'assets/sprites/enemies/runner.png',
        normal: 'assets/sprites/enemies/normal.png',
        armored: 'assets/sprites/enemies/armored.png',
        ghost: 'assets/sprites/enemies/ghost.png',
        shade: 'assets/sprites/enemies/ghost.png',
        stalker: 'assets/sprites/enemies/necro.png',
        necro: 'assets/sprites/enemies/necro.png',
        tank: 'assets/sprites/enemies/tank.png',
        destroyer: 'assets/sprites/enemies/destroyer.png',
        boss: 'assets/sprites/enemies/boss.png',
        runnerBoss: 'assets/sprites/enemies/runner.png',
        normalBoss: 'assets/sprites/enemies/normal.png',
        armoredBoss: 'assets/sprites/enemies/armored.png',
        ghostBoss: 'assets/sprites/enemies/ghost.png',
        shadeBoss: 'assets/sprites/enemies/ghost.png',
        stalkerBoss: 'assets/sprites/enemies/necro.png',
        necroBoss: 'assets/sprites/enemies/necro.png',
        tankBoss: 'assets/sprites/enemies/tank.png',
        destroyerBoss: 'assets/sprites/enemies/destroyer.png',
    },
    towers: {
        pistol: 'assets/sprites/towers/pistol.png',
        machinegun: 'assets/sprites/towers/machinegun.png',
        scanner: 'assets/sprites/towers/scanner.png',
        flamethrower: 'assets/sprites/towers/flamethrower.png',
        sniper: 'assets/sprites/towers/sniper.png',
        grenade: 'assets/sprites/towers/grenade.png',
        rifle: 'assets/sprites/towers/rifle.png',
        cryo: 'assets/sprites/towers/cryo.png',
        rocket: 'assets/sprites/towers/rocket.png',
        tesla: 'assets/sprites/towers/tesla.png',
        railgun: 'assets/sprites/towers/railgun.png',
        pulse: 'assets/sprites/towers/pulse.png',
        healer: 'assets/sprites/towers/healer.png',
        farm: 'assets/sprites/towers/farm.png',
        airfield: 'assets/sprites/towers/airfield.png',
        nukeSilo: 'assets/sprites/towers/nukeSilo.png',
        lightWall: 'assets/sprites/towers/lightWall.png',
        mediumWall: 'assets/sprites/towers/mediumWall.png',
        heavyWall: 'assets/sprites/towers/heavyWall.png',
        construction: 'assets/sprites/towers/construction.png',
        factory: 'assets/sprites/tower-bases/factory-gpt.png',
        djBooth: 'assets/sprites/tower-bases/djBooth-gpt.png',
    },
    towerBases: {
        cryo: 'assets/sprites/tower-bases/cryo-gpt.png',
        airfield: 'assets/sprites/tower-bases/airfield-gpt.png',
        djBooth: 'assets/sprites/tower-bases/djBooth-gpt.png',
        factory: 'assets/sprites/tower-bases/factory-gpt.png',
        flamethrower: 'assets/sprites/tower-bases/flamethrower-gpt.png',
        grenade: 'assets/sprites/tower-bases/grenade-gpt.png',
        machinegun: 'assets/sprites/tower-bases/machinegun-gpt.png',
        nukeSilo: 'assets/sprites/tower-bases/nukeSilo-gpt.png',
        pistol: 'assets/sprites/tower-bases/pistol-gpt.png',
        pulse: 'assets/sprites/tower-bases/pulse-gpt.png',
        railgun: 'assets/sprites/tower-bases/railgun-gpt.png',
        rifle: 'assets/sprites/tower-bases/rifle-gpt.png',
        rocket: 'assets/sprites/tower-bases/rocket-gpt.png',
        sniper: 'assets/sprites/tower-bases/sniper-gpt.png',
        tesla: 'assets/sprites/tower-bases/tesla-gpt.png',
    },
    barrels: {
        pistol: 'assets/sprites/barrels/pistol-gpt.png',
        machinegun: 'assets/sprites/barrels/machinegun-gpt.png',
        rifle: 'assets/sprites/barrels/rifle-gpt.png',
        flamethrower: 'assets/sprites/barrels/flamethrower-gpt.png',
        sniper: 'assets/sprites/barrels/sniper-gpt.png',
        grenade: 'assets/sprites/barrels/grenade-gpt.png',
        cryo: 'assets/sprites/barrels/cryo-gpt.png',
        rocket: 'assets/sprites/barrels/rocket-gpt.png',
        tesla: 'assets/sprites/barrels/tesla-gpt.png',
        railgun: 'assets/sprites/barrels/railgun-gpt.png',
        pulse: 'assets/sprites/barrels/pulse-gpt.png',
    },
    vehicles: {
        airfieldPlane: 'assets/sprites/vehicles/airfield-plane-gpt.png',
        factory1: 'assets/sprites/vehicles/factory-car-l1-gpt.png',
        factory2: 'assets/sprites/vehicles/factory-car-l2-gpt.png',
        factory3: 'assets/sprites/vehicles/factory-car-l3-gpt.png',
    },
};

const GameSprites = (() => {
    const cache = { enemies: {}, towers: {}, towerBases: {}, barrels: {}, vehicles: {} };

    function loadGroup(group) {
        Object.entries(SPRITE_PATHS[group]).forEach(([key, path]) => {
            if (cache[group][key]) return;
            const image = new Image();
            image.src = path;
            cache[group][key] = image;
        });
    }

    loadGroup('enemies');
    loadGroup('towers');
    loadGroup('towerBases');
    loadGroup('barrels');
    loadGroup('vehicles');

    function get(group, key) {
        const image = cache[group]?.[key];
        return image && image.complete && image.naturalWidth > 0 ? image : null;
    }

    return {
        enemy(key) { return get('enemies', key); },
        tower(key) { return get('towers', key); },
        towerBase(key) { return get('towerBases', key); },
        hasTowerBase(key) { return !!SPRITE_PATHS.towerBases?.[key]; },
        barrel(key) { return get('barrels', key); },
        hasBarrel(key) { return !!SPRITE_PATHS.barrels?.[key]; },
        vehicle(key) { return get('vehicles', key); },
    };
})();
