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
    },
};

const GameSprites = (() => {
    const cache = { enemies: {}, towers: {} };

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

    function get(group, key) {
        const image = cache[group]?.[key];
        return image && image.complete && image.naturalWidth > 0 ? image : null;
    }

    return {
        enemy(key) { return get('enemies', key); },
        tower(key) { return get('towers', key); },
    };
})();
