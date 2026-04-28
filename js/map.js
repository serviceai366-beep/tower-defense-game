const MAP_THEME_STYLES = {
    forest: {
        backgroundTop: '#17391a',
        backgroundBottom: '#0a1d0d',
        cellTintA: 'rgba(31, 68, 29, 0.22)',
        cellTintB: 'rgba(8, 20, 9, 0.16)',
        gridColor: 'rgba(110, 164, 84, 0.08)',
        pathBase: '#4a3c2a',
        pathShadeA: 'rgba(40, 28, 19, 0.10)',
        pathShadeB: 'rgba(90, 74, 50, 0.08)',
        pathEdge: 'rgba(18, 12, 8, 0.58)',
        entryColor: '#ef4444',
        baseGlow: 'rgba(239, 68, 68, 0.18)',
        baseStroke: '#b91c1c',
        baseText: '#fca5a5',
        sceneryTypes: ['tree', 'bush', 'rock'],
    },
    frost: {
        backgroundTop: '#0d223a',
        backgroundBottom: '#08131f',
        cellTintA: 'rgba(147, 197, 253, 0.14)',
        cellTintB: 'rgba(15, 35, 57, 0.22)',
        gridColor: 'rgba(140, 210, 255, 0.10)',
        pathBase: '#c6d9ea',
        pathShadeA: 'rgba(255, 255, 255, 0.12)',
        pathShadeB: 'rgba(77, 120, 160, 0.08)',
        pathEdge: 'rgba(74, 121, 160, 0.64)',
        entryColor: '#38bdf8',
        baseGlow: 'rgba(56, 189, 248, 0.18)',
        baseStroke: '#0ea5e9',
        baseText: '#bae6fd',
        sceneryTypes: ['crystal', 'snow', 'rock'],
    },
    desert: {
        backgroundTop: '#6d4c20',
        backgroundBottom: '#36200d',
        cellTintA: 'rgba(250, 204, 21, 0.08)',
        cellTintB: 'rgba(74, 48, 17, 0.20)',
        gridColor: 'rgba(234, 179, 8, 0.08)',
        pathBase: '#8a6537',
        pathShadeA: 'rgba(255, 226, 159, 0.08)',
        pathShadeB: 'rgba(86, 58, 26, 0.12)',
        pathEdge: 'rgba(74, 45, 14, 0.55)',
        entryColor: '#f59e0b',
        baseGlow: 'rgba(245, 158, 11, 0.18)',
        baseStroke: '#d97706',
        baseText: '#fde68a',
        sceneryTypes: ['dune', 'cactus', 'bone'],
    },
    swamp: {
        backgroundTop: '#163d34',
        backgroundBottom: '#081712',
        cellTintA: 'rgba(22, 101, 52, 0.14)',
        cellTintB: 'rgba(7, 20, 16, 0.18)',
        gridColor: 'rgba(74, 222, 128, 0.07)',
        pathBase: '#5a4b3a',
        pathShadeA: 'rgba(18, 12, 10, 0.10)',
        pathShadeB: 'rgba(99, 78, 49, 0.10)',
        pathEdge: 'rgba(21, 18, 10, 0.58)',
        entryColor: '#22c55e',
        baseGlow: 'rgba(34, 197, 94, 0.18)',
        baseStroke: '#16a34a',
        baseText: '#bbf7d0',
        sceneryTypes: ['pool', 'reed', 'tree'],
    },
    volcanic: {
        backgroundTop: '#26110d',
        backgroundBottom: '#100708',
        cellTintA: 'rgba(255, 115, 0, 0.08)',
        cellTintB: 'rgba(40, 13, 8, 0.22)',
        gridColor: 'rgba(248, 113, 113, 0.06)',
        pathBase: '#473734',
        pathShadeA: 'rgba(255, 140, 0, 0.08)',
        pathShadeB: 'rgba(20, 9, 7, 0.12)',
        pathEdge: 'rgba(245, 80, 40, 0.34)',
        entryColor: '#fb7185',
        baseGlow: 'rgba(244, 63, 94, 0.18)',
        baseStroke: '#e11d48',
        baseText: '#fecdd3',
        sceneryTypes: ['lava', 'basalt', 'ember'],
    },
};

const MAP_ART_CACHE = {};

function makeSeededRandom(seedText) {
    let seed = 0;
    for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}

class GameMap {
    constructor(mapId = DEFAULT_MAP_ID) {
        this.setMap(mapId);
    }

    setMap(mapId) {
        this.preset = getMapPreset(mapId);
        this.theme = MAP_THEME_STYLES[this.preset.theme] || MAP_THEME_STYLES.forest;
        this.cols = this.preset.cols || CONFIG.GRID_COLS;
        this.rows = this.preset.rows || CONFIG.GRID_ROWS;
        this.worldWidth = this.preset.worldWidth || this.cols * CONFIG.CELL_SIZE;
        this.worldHeight = this.preset.worldHeight || this.rows * CONFIG.CELL_SIZE;
        this.backgroundImage = this.loadMapArt(this.preset.art);
        this.resetGrid();
        this.pathSegments = this.computePathSegments();
        this.totalPathLength = this.pathSegments.reduce((sum, seg) => sum + seg.length, 0);
        this.scenery = this.generateScenery();
    }

    loadMapArt(src) {
        if (!src) return null;
        if (MAP_ART_CACHE[src]) return MAP_ART_CACHE[src];
        const image = new Image();
        image.src = src;
        MAP_ART_CACHE[src] = image;
        return image;
    }

    resetGrid() {
        this.grid = this.preset.grid.map(row => [...row]);
    }

    computePathSegments() {
        const segments = [];
        const waypoints = this.preset.waypoints;
        for (let i = 0; i < waypoints.length - 1; i++) {
            const a = waypoints[i];
            const b = waypoints[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, dx, dy, length: Math.hypot(dx, dy) });
        }
        return segments;
    }

    getPositionAtDistance(distance) {
        let remaining = distance;
        for (const seg of this.pathSegments) {
            if (remaining <= seg.length) {
                const t = remaining / seg.length;
                return { x: seg.ax + seg.dx * t, y: seg.ay + seg.dy * t, angle: Math.atan2(seg.dy, seg.dx) };
            }
            remaining -= seg.length;
        }
        const last = this.preset.waypoints[this.preset.waypoints.length - 1];
        return { x: last.x, y: last.y, angle: 0 };
    }

    generateScenery() {
        const rand = makeSeededRandom(this.preset.id);
        const items = [];
        const areaScale = (this.cols * this.rows) / (CONFIG.GRID_COLS * CONFIG.GRID_ROWS);
        const countBase = this.preset.theme === 'swamp' ? 70 : this.preset.theme === 'volcanic' ? 62 : 56;
        const count = Math.round(countBase * Math.max(1, areaScale));
        for (let i = 0; i < count; i++) {
            const col = Math.floor(rand() * this.cols);
            const row = Math.floor(rand() * this.rows);
            if (this.preset.grid[row][col] === 1) continue;
            const type = this.theme.sceneryTypes[Math.floor(rand() * this.theme.sceneryTypes.length)];
            items.push({
                x: col * CONFIG.CELL_SIZE + 8 + rand() * (CONFIG.CELL_SIZE - 16),
                y: row * CONFIG.CELL_SIZE + 8 + rand() * (CONFIG.CELL_SIZE - 16),
                size: 8 + rand() * 20,
                type,
                rot: rand() * Math.PI * 2,
            });
        }
        return items;
    }

    render(ctx) {
        if (!this.renderMapArt(ctx)) {
            const bgGrad = ctx.createLinearGradient(0, 0, 0, this.worldHeight);
            bgGrad.addColorStop(0, this.theme.backgroundTop);
            bgGrad.addColorStop(1, this.theme.backgroundBottom);
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
            this.renderTerrainTiles(ctx);
            this.renderAmbientBackdrop(ctx);
            this.renderScenery(ctx);
        }
        this.renderPath(ctx);
        this.renderRouteAccents(ctx);
        this.renderBuildSubtleGrid(ctx);
        this.renderEntry(ctx);
        this.renderBase(ctx);
    }

    renderMapArt(ctx) {
        const image = this.backgroundImage;
        if (!image || !image.complete || image.naturalWidth <= 0) return false;
        ctx.save();
        const imageRatio = image.naturalWidth / image.naturalHeight;
        const worldRatio = this.worldWidth / this.worldHeight;
        let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
        if (imageRatio > worldRatio) {
            sw = image.naturalHeight * worldRatio;
            sx = (image.naturalWidth - sw) / 2;
        } else if (imageRatio < worldRatio) {
            sh = image.naturalWidth / worldRatio;
            sy = (image.naturalHeight - sh) / 2;
        }
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, this.worldWidth, this.worldHeight);

        const shade = ctx.createRadialGradient(
            this.worldWidth * 0.5, this.worldHeight * 0.45, Math.min(this.worldWidth, this.worldHeight) * 0.2,
            this.worldWidth * 0.5, this.worldHeight * 0.5, Math.max(this.worldWidth, this.worldHeight) * 0.72
        );
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(0,0,0,0.32)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

        ctx.fillStyle = this.preset.theme === 'frost'
            ? 'rgba(6, 22, 40, 0.08)'
            : this.preset.theme === 'volcanic'
                ? 'rgba(35, 9, 5, 0.10)'
                : 'rgba(3, 12, 6, 0.12)';
        ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
        ctx.restore();
        return true;
    }

    renderTerrainTiles(ctx) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.grid[row][col] === 1) continue;
                const x = col * CONFIG.CELL_SIZE;
                const y = row * CONFIG.CELL_SIZE;
                ctx.fillStyle = (row + col) % 2 === 0 ? this.theme.cellTintA : this.theme.cellTintB;
                ctx.fillRect(x, y, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
            }
        }
    }

    renderAmbientBackdrop(ctx) {
        ctx.save();
        const bandCount = Math.max(5, Math.ceil(this.worldWidth / 170));
        if (this.preset.theme === 'frost') {
            for (let i = 0; i < bandCount; i++) {
                ctx.fillStyle = `rgba(186, 230, 253, ${0.04 + i * 0.01})`;
                ctx.beginPath();
                ctx.arc(120 + i * (this.worldWidth / Math.max(1, bandCount - 1)), 80 + (i % 2) * Math.min(140, this.worldHeight * 0.16), 42 + (i % 4) * 6, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.preset.theme === 'desert') {
            for (let i = 0; i < bandCount; i++) {
                ctx.fillStyle = `rgba(245, 158, 11, ${0.05 + i * 0.01})`;
                ctx.beginPath();
                ctx.ellipse(120 + i * (this.worldWidth / Math.max(1, bandCount - 1)), 80 + (i % 3) * Math.min(180, this.worldHeight * 0.22), 90, 28, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.preset.theme === 'swamp') {
            for (let i = 0; i < bandCount - 1; i++) {
                ctx.fillStyle = `rgba(16, 185, 129, ${0.05 + i * 0.01})`;
                ctx.beginPath();
                ctx.ellipse(170 + i * (this.worldWidth / Math.max(1, bandCount - 2)), 110 + (i % 2) * Math.min(220, this.worldHeight * 0.28), 100, 42, 0.35, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.preset.theme === 'volcanic') {
            for (let i = 0; i < bandCount; i++) {
                ctx.fillStyle = `rgba(239, 68, 68, ${0.035 + i * 0.01})`;
                ctx.beginPath();
                ctx.ellipse(100 + i * (this.worldWidth / Math.max(1, bandCount - 1)), 70 + (i % 2) * Math.min(240, this.worldHeight * 0.3), 110, 26, -0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            for (let i = 0; i < bandCount + 1; i++) {
                ctx.fillStyle = `rgba(34, 197, 94, ${0.03 + i * 0.008})`;
                ctx.beginPath();
                ctx.arc(70 + i * (this.worldWidth / Math.max(1, bandCount)), 70 + (i % 3) * Math.min(170, this.worldHeight * 0.2), 45 + (i % 4) * 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    renderScenery(ctx) {
        for (const item of this.scenery) {
            ctx.save();
            ctx.translate(item.x, item.y);
            ctx.rotate(item.rot);
            switch (item.type) {
                case 'tree':
                    ctx.fillStyle = '#3f2c1b';
                    ctx.fillRect(-2, 0, 4, item.size * 0.55);
                    ctx.fillStyle = '#1f8a4c';
                    ctx.beginPath();
                    ctx.arc(0, -2, item.size * 0.46, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'bush':
                    ctx.fillStyle = '#256d34';
                    ctx.beginPath();
                    ctx.arc(-4, 2, item.size * 0.22, 0, Math.PI * 2);
                    ctx.arc(4, 1, item.size * 0.26, 0, Math.PI * 2);
                    ctx.arc(0, -3, item.size * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'rock':
                case 'basalt':
                    ctx.fillStyle = item.type === 'basalt' ? '#2b1c1b' : '#4b5563';
                    ctx.beginPath();
                    ctx.moveTo(-item.size * 0.4, item.size * 0.2);
                    ctx.lineTo(-item.size * 0.15, -item.size * 0.35);
                    ctx.lineTo(item.size * 0.3, -item.size * 0.2);
                    ctx.lineTo(item.size * 0.4, item.size * 0.2);
                    ctx.lineTo(0, item.size * 0.38);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'crystal':
                    ctx.fillStyle = '#bfdbfe';
                    ctx.beginPath();
                    ctx.moveTo(0, -item.size * 0.55);
                    ctx.lineTo(item.size * 0.22, 0);
                    ctx.lineTo(0, item.size * 0.52);
                    ctx.lineTo(-item.size * 0.18, 0);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'snow':
                    ctx.fillStyle = 'rgba(255,255,255,0.78)';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, item.size * 0.48, item.size * 0.24, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'dune':
                    ctx.fillStyle = 'rgba(245, 158, 11, 0.34)';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, item.size * 0.6, item.size * 0.24, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'cactus':
                    ctx.fillStyle = '#166534';
                    ctx.fillRect(-2, -item.size * 0.35, 4, item.size * 0.72);
                    ctx.fillRect(-item.size * 0.2, -item.size * 0.08, 4, item.size * 0.26);
                    ctx.fillRect(item.size * 0.12, -item.size * 0.2, 4, item.size * 0.3);
                    break;
                case 'bone':
                    ctx.strokeStyle = 'rgba(255, 244, 214, 0.65)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-item.size * 0.32, 0);
                    ctx.lineTo(item.size * 0.32, 0);
                    ctx.stroke();
                    break;
                case 'pool':
                    ctx.fillStyle = 'rgba(20, 184, 166, 0.22)';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, item.size * 0.56, item.size * 0.28, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'reed':
                    ctx.strokeStyle = '#65a30d';
                    ctx.lineWidth = 1.6;
                    for (let i = -1; i <= 1; i++) {
                        ctx.beginPath();
                        ctx.moveTo(i * 3, item.size * 0.34);
                        ctx.lineTo(i * 2, -item.size * 0.35);
                        ctx.stroke();
                    }
                    break;
                case 'lava':
                    ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, item.size * 0.55, item.size * 0.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(254, 215, 170, 0.36)';
                    ctx.stroke();
                    break;
                case 'ember':
                    ctx.fillStyle = 'rgba(251, 146, 60, 0.68)';
                    ctx.beginPath();
                    ctx.arc(0, 0, item.size * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
            ctx.restore();
        }
    }

    renderPath(ctx) {
        const points = this.preset.waypoints;
        if (!points || points.length < 2) return;

        const drawRoute = () => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        };

        const road = {
            forest: { bed: 'rgba(18, 14, 9, 0.48)', fill: 'rgba(74, 57, 35, 0.62)', crown: 'rgba(138, 111, 72, 0.16)', mark: 'rgba(34, 24, 14, 0.34)' },
            frost: { bed: 'rgba(34, 62, 88, 0.42)', fill: 'rgba(220, 234, 244, 0.48)', crown: 'rgba(255, 255, 255, 0.24)', mark: 'rgba(89, 124, 154, 0.30)' },
            desert: { bed: 'rgba(70, 44, 18, 0.44)', fill: 'rgba(137, 93, 43, 0.58)', crown: 'rgba(234, 188, 111, 0.16)', mark: 'rgba(82, 53, 25, 0.32)' },
            swamp: { bed: 'rgba(16, 20, 12, 0.48)', fill: 'rgba(69, 60, 41, 0.56)', crown: 'rgba(139, 124, 82, 0.14)', mark: 'rgba(24, 37, 21, 0.30)' },
            volcanic: { bed: 'rgba(3, 3, 4, 0.52)', fill: 'rgba(55, 52, 48, 0.58)', crown: 'rgba(156, 96, 66, 0.12)', mark: 'rgba(7, 7, 8, 0.34)' },
        }[this.preset.theme] || { bed: this.theme.pathEdge, fill: this.theme.pathBase, crown: this.theme.pathShadeA, mark: this.theme.pathShadeB };

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.strokeStyle = road.bed;
        ctx.lineWidth = CONFIG.CELL_SIZE * 1.26;
        drawRoute();
        ctx.stroke();

        ctx.strokeStyle = road.fill;
        ctx.lineWidth = CONFIG.CELL_SIZE * 1.02;
        drawRoute();
        ctx.stroke();

        ctx.strokeStyle = road.crown;
        ctx.lineWidth = CONFIG.CELL_SIZE * 0.52;
        drawRoute();
        ctx.stroke();

        if (this.preset.theme === 'frost') {
            ctx.strokeStyle = 'rgba(21, 54, 81, 0.22)';
            ctx.lineWidth = 2;
            ctx.setLineDash([18, 26]);
            drawRoute();
            ctx.stroke();
            ctx.setLineDash([]);
        }

        for (let i = 0; i < this.pathSegments.length; i++) {
            const seg = this.pathSegments[i];
            const nx = seg.length ? -seg.dy / seg.length : 0;
            const ny = seg.length ? seg.dx / seg.length : 0;
            const count = Math.max(1, Math.floor(seg.length / 72));
            for (let j = 0; j < count; j++) {
                const t = (j + 0.5) / count;
                const x = seg.ax + seg.dx * t;
                const y = seg.ay + seg.dy * t;
                const side = j % 2 === 0 ? -1 : 1;
                ctx.strokeStyle = road.mark;
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(x + nx * side * 9 - seg.dx / Math.max(1, seg.length) * 10, y + ny * side * 9 - seg.dy / Math.max(1, seg.length) * 10);
                ctx.lineTo(x + nx * side * 17 + seg.dx / Math.max(1, seg.length) * 10, y + ny * side * 17 + seg.dy / Math.max(1, seg.length) * 10);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    renderRouteAccents(ctx) {
        if (this.backgroundImage) return;
        const points = this.preset.waypoints;
        if (!points || points.length < 2) return;
        const drawRoute = () => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        };

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const glowByTheme = {
            forest: 'rgba(250, 204, 21, 0.10)',
            frost: 'rgba(186, 230, 253, 0.16)',
            desert: 'rgba(254, 215, 170, 0.14)',
            swamp: 'rgba(74, 222, 128, 0.10)',
            volcanic: 'rgba(248, 113, 113, 0.18)',
        };
        ctx.strokeStyle = glowByTheme[this.preset.theme] || 'rgba(250, 204, 21, 0.10)';
        ctx.lineWidth = CONFIG.CELL_SIZE * 0.9;
        drawRoute();
        ctx.stroke();

        ctx.strokeStyle = this.preset.theme === 'frost'
            ? 'rgba(255, 255, 255, 0.22)'
            : this.preset.theme === 'volcanic'
                ? 'rgba(251, 146, 60, 0.26)'
                : 'rgba(255, 244, 214, 0.16)';
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 20]);
        drawRoute();
        ctx.stroke();
        ctx.setLineDash([]);

        for (let i = 1; i < points.length - 1; i++) {
            const p = points[i];
            ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
            ctx.lineWidth = 1.4;
            ctx.stroke();
        }
        ctx.restore();
    }

    renderGrid(ctx) {
        ctx.strokeStyle = this.theme.gridColor;
        ctx.lineWidth = 0.5;
        for (let row = 0; row <= this.rows; row++) {
            ctx.beginPath();
            ctx.moveTo(0, row * CONFIG.CELL_SIZE);
            ctx.lineTo(this.worldWidth, row * CONFIG.CELL_SIZE);
            ctx.stroke();
        }
        for (let col = 0; col <= this.cols; col++) {
            ctx.beginPath();
            ctx.moveTo(col * CONFIG.CELL_SIZE, 0);
            ctx.lineTo(col * CONFIG.CELL_SIZE, this.worldHeight);
            ctx.stroke();
        }
    }

    renderBuildSubtleGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = this.backgroundImage ? 'rgba(255,255,255,0.035)' : this.theme.gridColor;
        ctx.lineWidth = this.backgroundImage ? 0.35 : 0.5;
        for (let row = 0; row <= this.rows; row++) {
            ctx.beginPath();
            ctx.moveTo(0, row * CONFIG.CELL_SIZE);
            ctx.lineTo(this.worldWidth, row * CONFIG.CELL_SIZE);
            ctx.stroke();
        }
        for (let col = 0; col <= this.cols; col++) {
            ctx.beginPath();
            ctx.moveTo(col * CONFIG.CELL_SIZE, 0);
            ctx.lineTo(col * CONFIG.CELL_SIZE, this.worldHeight);
            ctx.stroke();
        }
        ctx.restore();
    }

    renderEntry(ctx) {
        const first = this.preset.waypoints[0];
        const second = this.preset.waypoints[1];
        const dx = Math.sign(second.x - first.x);
        const dy = Math.sign(second.y - first.y);
        ctx.fillStyle = this.theme.entryColor;
        ctx.beginPath();
        if (Math.abs(dx) > 0) {
            const dir = dx > 0 ? 1 : -1;
            ctx.moveTo(first.x, first.y);
            ctx.lineTo(first.x - dir * 20, first.y - 16);
            ctx.lineTo(first.x - dir * 20, first.y + 16);
        } else {
            const dir = dy > 0 ? 1 : -1;
            ctx.moveTo(first.x, first.y);
            ctx.lineTo(first.x - 16, first.y - dir * 20);
            ctx.lineTo(first.x + 16, first.y - dir * 20);
        }
        ctx.closePath();
        ctx.fill();
    }

    renderBase(ctx) {
        const bx = this.preset.baseCell.col * CONFIG.CELL_SIZE;
        const by = this.preset.baseCell.row * CONFIG.CELL_SIZE;
        ctx.fillStyle = this.theme.baseGlow;
        ctx.fillRect(bx + 2, by + 2, CONFIG.CELL_SIZE - 4, CONFIG.CELL_SIZE - 4);
        ctx.strokeStyle = this.theme.baseStroke;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(bx + 2, by + 2, CONFIG.CELL_SIZE - 4, CONFIG.CELL_SIZE - 4);
        const cx = bx + CONFIG.CELL_SIZE / 2;
        const cy = by + CONFIG.CELL_SIZE / 2;
        ctx.strokeStyle = this.theme.baseStroke;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx + 10, cy + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 10, cy - 10); ctx.lineTo(cx - 10, cy + 10); ctx.stroke();
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = this.theme.baseText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('БАЗА', cx, cy + 22);
    }
    renderMiniMap(ctx, x, y, width, height, viewRect = null, towers = [], enemies = []) {
        const scaleX = width / this.worldWidth;
        const scaleY = height / this.worldHeight;
        ctx.save();
        ctx.translate(x, y);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, this.theme.backgroundTop);
        bgGrad.addColorStop(1, this.theme.backgroundBottom);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.preset.grid[row][col] !== 1) continue;
                ctx.fillStyle = this.theme.pathBase;
                ctx.fillRect(col * CONFIG.CELL_SIZE * scaleX, row * CONFIG.CELL_SIZE * scaleY, Math.max(1.2, CONFIG.CELL_SIZE * scaleX), Math.max(1.2, CONFIG.CELL_SIZE * scaleY));
            }
        }
        for (const tower of towers) {
            if (tower.isDestroyed) continue;
            ctx.fillStyle = tower.isNukeSilo ? '#facc15' : tower.isWall ? '#94a3b8' : '#60a5fa';
            ctx.fillRect(tower.x * scaleX - 1.2, tower.y * scaleY - 1.2, 2.4, 2.4);
        }
        for (const enemy of enemies) {
            if (enemy.isDead || enemy.reachedEnd) continue;
            ctx.fillStyle = enemy.isBoss ? '#ef4444' : enemy.isInvisible ? '#a78bfa' : '#22c55e';
            ctx.fillRect(enemy.x * scaleX - 1, enemy.y * scaleY - 1, 2, 2);
        }
        const entry = this.preset.waypoints[0];
        ctx.fillStyle = this.theme.entryColor;
        ctx.fillRect(entry.x * scaleX - 2, entry.y * scaleY - 2, 4, 4);
        ctx.strokeStyle = this.theme.baseStroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(this.preset.baseCell.col * CONFIG.CELL_SIZE * scaleX, this.preset.baseCell.row * CONFIG.CELL_SIZE * scaleY, CONFIG.CELL_SIZE * scaleX, CONFIG.CELL_SIZE * scaleY);
        if (viewRect) {
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 2;
            ctx.strokeRect(viewRect.x * scaleX, viewRect.y * scaleY, viewRect.width * scaleX, viewRect.height * scaleY);
        }
        ctx.strokeStyle = 'rgba(248,250,252,0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        ctx.restore();
    }
}
