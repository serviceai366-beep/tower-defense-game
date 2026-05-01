class MultiplayerClient {
    constructor(game) {
        this.defaultServerUrl = 'https://tower-defense-multiplayer-3gxn.onrender.com';
        this.game = game;
        this.roomCode = '';
        this.playerId = '';
        this.playerKey = 'p1';
        this.role = 'solo';
        this.playerCount = 1;
        this.lastEventId = 0;
        this.pollTimer = 0;
        this.snapshotTimer = 0;
        this.serverInput = document.getElementById('multiplayer-server-url');
        this.codeInput = document.getElementById('room-code-input');
        this.createBtn = document.getElementById('btn-create-room');
        this.joinBtn = document.getElementById('btn-join-room');
        this.leaveBtn = document.getElementById('btn-leave-room');
        this.statusEl = document.getElementById('room-status');
        this.bind();
        this.game.setMultiplayerAdapter(this);
    }
    bind() {
        this.createBtn?.addEventListener('click', () => this.createRoom());
        this.joinBtn?.addEventListener('click', () => this.joinRoom());
        this.leaveBtn?.addEventListener('click', () => this.leaveRoom());
        this.codeInput?.addEventListener('input', () => {
            this.codeInput.value = this.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        });
    }
    get serverUrl() {
        return (this.serverInput?.value || this.defaultServerUrl).replace(/\/+$/, '');
    }
    isRoomActive() { return !!this.roomCode && !!this.playerId; }
    isCoopActive() { return this.isRoomActive() && this.playerCount >= 2; }
    isGuest() { return this.role === 'guest'; }
    getLocalPlayerKey() { return this.playerKey || 'p1'; }
    setWaitingForHost() {
        this.setStatus('Ждем, пока ваш партнер сделает выбор', 'ready');
    }
    setStatus(text, kind = '') {
        if (!this.statusEl) return;
        this.statusEl.textContent = text;
        this.statusEl.classList.toggle('ready', kind === 'ready');
        this.statusEl.classList.toggle('error', kind === 'error');
    }
    async request(path, body = null) {
        const res = await fetch(`${this.serverUrl}${path}`, {
            method: body ? 'POST' : 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : {},
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
    }
    async createRoom() {
        try {
            const data = await this.request('/rooms', {});
            this.connectRoom(data, 'host');
            this.setStatus(`Room ${this.roomCode}. You are the host. Choose mode, difficulty and map.`, 'ready');
        } catch (err) {
            this.setStatus(`Cannot create room: ${err.message}`, 'error');
        }
    }
    async joinRoom() {
        const code = (this.codeInput?.value || '').trim().toUpperCase();
        if (code.length !== 10) {
            this.setStatus('Enter a 10-character room code.', 'error');
            return;
        }
        try {
            const data = await this.request(`/rooms/${code}/join`, {});
            this.connectRoom(data, 'guest');
            this.setWaitingForHost();
        } catch (err) {
            this.setStatus(`Cannot join room: ${err.message}`, 'error');
        }
    }
    connectRoom(data, fallbackRole) {
        this.roomCode = data.code;
        this.playerId = data.playerId;
        this.playerKey = data.playerKey || (fallbackRole === 'host' ? 'p1' : 'p2');
        this.role = data.role || fallbackRole;
        this.playerCount = data.playerCount || 1;
        this.lastEventId = data.lastEventId || 0;
        if (this.codeInput) this.codeInput.value = this.roomCode;
        if (this.leaveBtn) this.leaveBtn.hidden = false;
        window.clearInterval(this.pollTimer);
        window.clearInterval(this.snapshotTimer);
        this.pollTimer = window.setInterval(() => this.poll(), this.isGuest() ? 90 : 120);
        this.poll();
        if (!this.isGuest()) {
            this.snapshotTimer = window.setInterval(() => this.publishSnapshot(), 120);
            this.publishSnapshot();
        }
        this.game.syncVisibleGold();
        this.game.ui.applyMultiplayerRoleState?.();
        window.addEventListener('beforeunload', this.beforeUnloadHandler ||= (() => this.sendLeaveBeacon()));
    }
    async poll() {
        if (!this.isRoomActive()) return;
        try {
            const data = await this.request(`/rooms/${this.roomCode}/state?playerId=${encodeURIComponent(this.playerId)}&since=${this.lastEventId}`);
            const previousPlayerCount = this.playerCount;
            this.playerCount = data.playerCount || this.playerCount;
            if (!this.isGuest() && previousPlayerCount < 2 && this.playerCount >= 2) this.game.applyCoopHpBoostToAliveEnemies();
            const roomWasClosed = Array.isArray(data.events) && data.events.some(event => event.command?.type === 'playerLeft' && event.playerId !== this.playerId);
            if (roomWasClosed) {
                this.game.endCoopSession('Игрок вышел, поэтому игра закончена');
                return;
            }
            if (this.isGuest() && data.snapshot) this.game.applySnapshot(data.snapshot);
            if (!this.isGuest() && Array.isArray(data.events)) {
                let appliedRemoteCommand = false;
                for (const event of data.events) {
                    this.lastEventId = Math.max(this.lastEventId, event.id || 0);
                    if (event.playerId === this.playerId) continue;
                    this.game.applyRemoteCommand({ ...event.command, playerKey: event.playerKey });
                    appliedRemoteCommand = true;
                }
                if (appliedRemoteCommand) this.publishSnapshot();
            }
            if (this.isGuest() && (!data.snapshot || !data.snapshot.active)) {
                this.setWaitingForHost();
            } else {
                const label = this.playerCount >= 2 ? 'Co-op active: enemy HP +75%.' : 'Waiting for second player...';
                this.setStatus(`Room ${this.roomCode}. You are ${this.playerKey.toUpperCase()}. ${label}`, 'ready');
            }
            this.game.ui.applyMultiplayerRoleState?.();
        } catch (err) {
            this.setStatus(`Room connection problem: ${err.message}`, 'error');
        }
    }
    async publishSnapshot() {
        if (!this.isRoomActive() || this.isGuest()) return;
        try {
            await this.request(`/rooms/${this.roomCode}/snapshot`, {
                playerId: this.playerId,
                snapshot: this.game.createSnapshot(),
            });
        } catch (err) {
            this.setStatus(`Snapshot failed: ${err.message}`, 'error');
        }
    }
    async sendCommand(command) {
        if (!this.isRoomActive()) return false;
        try {
            await this.request(`/rooms/${this.roomCode}/events`, {
                playerId: this.playerId,
                command,
            });
            return true;
        } catch (err) {
            this.setStatus(`Command failed: ${err.message}`, 'error');
            return false;
        }
    }
    notifyLocalAction() {}
    sendLeaveBeacon() {
        if (!this.isRoomActive() || !navigator.sendBeacon) return;
        const body = JSON.stringify({
            playerId: this.playerId,
            command: { type: 'playerLeft' },
        });
        navigator.sendBeacon(`${this.serverUrl}/rooms/${this.roomCode}/events`, body);
    }
    disconnectLocally() {
        window.clearInterval(this.pollTimer);
        window.clearInterval(this.snapshotTimer);
        this.pollTimer = 0;
        this.snapshotTimer = 0;
        this.roomCode = '';
        this.playerId = '';
        this.playerKey = 'p1';
        this.role = 'solo';
        this.playerCount = 1;
        this.lastEventId = 0;
        if (this.leaveBtn) this.leaveBtn.hidden = true;
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        this.game.syncVisibleGold();
        this.game.ui.applyMultiplayerRoleState?.();
    }
    async leaveRoom() {
        if (!this.isRoomActive()) return;
        const message = 'Игрок вышел, поэтому игра закончена';
        try {
            await this.sendCommand({ type: 'playerLeft' });
        } catch (_) {}
        this.game.endCoopSession(message);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const attach = () => {
        if (!window.game) {
            window.setTimeout(attach, 50);
            return;
        }
        window.multiplayer = new MultiplayerClient(window.game);
    };
    attach();
});
