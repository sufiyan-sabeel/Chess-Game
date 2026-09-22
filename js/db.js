// ===== Chess Game Database (localStorage) =====
const DB = {
    _get(key) { return JSON.parse(localStorage.getItem('chess_' + key) || '[]'); },
    _set(key, val) { localStorage.setItem('chess_' + key, JSON.stringify(val)); },

    // Users
    getUsers() { return this._get('users'); },
    saveUsers(u) { this._set('users', u); },
    findUser(username) { return this.getUsers().find(u => u.username === username); },
    findUserByEmail(email) { return this.getUsers().find(u => u.email === email); },
    addUser(username, email, password) {
        const users = this.getUsers();
        const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
        users.push({ id, username, email, password, created_at: new Date().toISOString() });
        this.saveUsers(users);
        return id;
    },
    deleteUser(id) {
        this.saveUsers(this.getUsers().filter(u => u.id !== id));
        this.saveGames(this.getGames().filter(g => g.user_id !== id));
    },

    // Admin
    getAdmin() { return this._get('admin')[0] || null; },
    initAdmin() {
        if (!this.getAdmin()) {
            this._set('admin', [{ id: 1, username: 'admin', password: 'admin123' }]);
        }
    },

    // Games
    getGames() { return this._get('games'); },
    saveGames(g) { this._set('games', g); },
    addGame(user_id, opponent_type, result, moves_history) {
        const games = this.getGames();
        const id = games.length ? Math.max(...games.map(g => g.id)) + 1 : 1;
        games.push({ id, user_id, opponent_type, result, moves_history, played_at: new Date().toISOString() });
        this.saveGames(games);
    },
    getUserGames(user_id) {
        return this.getGames().filter(g => g.user_id === user_id).sort((a, b) => new Date(b.played_at) - new Date(a.played_at));
    },
    getUserStats(user_id) {
        const games = this.getGames().filter(g => g.user_id === user_id);
        return {
            win: games.filter(g => g.result === 'win').length,
            loss: games.filter(g => g.result === 'loss').length,
            draw: games.filter(g => g.result === 'draw').length,
        };
    },
    getTotalStats() {
        const users = this.getUsers().length;
        const games = this.getGames().length;
        return { users, games };
    }
};

DB.initAdmin();
