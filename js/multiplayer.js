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
        this.lastAppliedSnapshotVersion = 0;
        this.serverInput = document.getElementById('multiplayer-server-url');
        this.codeInput = document.getElementById('room-code-input');
        this.createBtn = document.getElementById('btn-create-room');
        this.joinBtn = document.getElementById('btn-join-room');
        this.leaveBtn = document.getElementById('btn-leave-room');
        this.statusEl = document.getElementById('room-status');
        this.chatEl = document.getElementById('coop-chat');
        this.chatBody = document.getElementById('coop-chat-body');
        this.chatMessages = document.getElementById('coop-chat-messages');
        this.chatForm = document.getElementById('coop-chat-form');
        this.chatInput = document.getElementById('coop-chat-input');
        this.chatToggle = document.getElementById('btn-toggle-chat');
        this.bind();
        this.game.setMultiplayerAdapter(this);
    }
    bind() {
        this.createBtn?.addEventListener('click', () => this.createRoom());
        this.joinBtn?.addEventListener('click', () => this.joinRoom());
        this.leaveBtn?.addEventListener('click', () => this.leaveRoom());
        this.chatToggle?.addEventListener('click', () => {
            this.chatEl?.classList.toggle('collapsed');
            if (this.chatToggle) this.chatToggle.textContent = this.chatEl?.classList.contains('collapsed') ? '+' : '−';
        });
        this.chatForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.sendChatMessage();
        });
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
        if (this.statusEl.textContent === text && this.statusEl.classList.contains(kind || '__none__')) return;
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
