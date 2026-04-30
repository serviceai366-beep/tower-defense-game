const http = require('http');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8787);
const ROOM_TTL_MS = 1000 * 60 * 60 * 4;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = new Map();

function send(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Cache-Control': 'no-store',
    });
    res.end(body);
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1024 * 512) {
                reject(new Error('Payload too large'));
                req.destroy();
            }
        });
        req.on('end', () => {
            if (!body) return resolve({});
            try { resolve(JSON.parse(body)); }
            catch (_) { reject(new Error('Invalid JSON')); }
        });
    });
}

function makeCode() {
    let code = '';
    for (let i = 0; i < 10; i++) code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
    return code;
}

function makePlayerId() {
    return crypto.randomBytes(12).toString('hex');
}

function createRoom() {
    let code = makeCode();
    while (rooms.has(code)) code = makeCode();
    const hostId = makePlayerId();
    const room = {
        code,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        players: [{ id: hostId, key: 'p1', role: 'host' }],
        events: [],
        nextEventId: 1,
        snapshot: null,
    };
    rooms.set(code, room);
    return { room, player: room.players[0] };
}

function cleanRooms() {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
        if (now - room.updatedAt > ROOM_TTL_MS) rooms.delete(code);
    }
}

function getRoom(code) {
    cleanRooms();
    return rooms.get(String(code || '').toUpperCase());
}

function findPlayer(room, playerId) {
    return room.players.find(player => player.id === playerId);
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const parts = url.pathname.split('/').filter(Boolean);

    try {
        if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, rooms: rooms.size });

        if (req.method === 'POST' && url.pathname === '/rooms') {
            const { room, player } = createRoom();
            return send(res, 200, { code: room.code, playerId: player.id, playerKey: player.key, role: player.role, playerCount: 1, lastEventId: 0 });
        }

        if (parts[0] === 'rooms' && parts[1]) {
            const code = parts[1].toUpperCase();
            const room = getRoom(code);
            if (!room) return send(res, 404, { error: 'Room not found' });
            room.updatedAt = Date.now();

            if (req.method === 'POST' && parts[2] === 'join') {
                if (room.players.length >= 2) return send(res, 409, { error: 'Room is full' });
                const player = { id: makePlayerId(), key: 'p2', role: 'guest' };
                room.players.push(player);
                return send(res, 200, { code, playerId: player.id, playerKey: player.key, role: player.role, playerCount: room.players.length, lastEventId: room.nextEventId - 1 });
            }

            if (req.method === 'GET' && parts[2] === 'state') {
                const playerId = url.searchParams.get('playerId');
                const player = findPlayer(room, playerId);
                if (!player) return send(res, 403, { error: 'Player not in room' });
                const since = Number(url.searchParams.get('since') || 0);
                const events = room.events.filter(event => event.id > since);
                return send(res, 200, { code, playerCount: room.players.length, snapshot: room.snapshot, events });
            }

            if (req.method === 'POST' && parts[2] === 'events') {
                const body = await readJson(req);
                const player = findPlayer(room, body.playerId);
                if (!player) return send(res, 403, { error: 'Player not in room' });
                const event = {
                    id: room.nextEventId++,
                    playerId: player.id,
                    playerKey: player.key,
                    command: body.command || {},
                    time: Date.now(),
                };
                room.events.push(event);
                if (room.events.length > 800) room.events.splice(0, room.events.length - 800);
                return send(res, 200, { ok: true, eventId: event.id });
            }

            if (req.method === 'POST' && parts[2] === 'snapshot') {
                const body = await readJson(req);
                const player = findPlayer(room, body.playerId);
                if (!player || player.role !== 'host') return send(res, 403, { error: 'Only host can publish snapshots' });
                room.snapshot = body.snapshot || null;
                return send(res, 200, { ok: true });
            }
        }

        send(res, 404, { error: 'Not found' });
    } catch (err) {
        send(res, 400, { error: err.message || 'Bad request' });
    }
});

server.listen(PORT, () => {
    console.log(`Tower Defense multiplayer server listening on http://localhost:${PORT}`);
});
