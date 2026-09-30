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
    addGame(user_id, opponent_type, result, moves_history, meta = {}) {
        const games = this.getGames();
        const id = games.length ? Math.max(...games.map(g => g.id)) + 1 : 1;
        games.push({
            id, user_id, opponent_type, result, moves_history,
            time_control: meta.time_control || null,
            difficulty: meta.difficulty || null,
            mode: meta.mode || null,
            played_at: new Date().toISOString(),
        });
        this.saveGames(games);
    },
    getGame(id) { return this.getGames().find(g => g.id === id) || null; },
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
    },

    // ===== Settings (user preferences) =====
    DEFAULT_SETTINGS: {
        board_theme: 'green',
        piece_set: 'classic',
        coordinates: true,
        sound: true,
        animations: true,
        reduced_motion: false,
    },
    getSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem('chess_settings') || 'null');
            return Object.assign({}, this.DEFAULT_SETTINGS, saved || {});
        } catch (e) {
            return Object.assign({}, this.DEFAULT_SETTINGS);
        }
    },
    saveSettings(patch) {
        const current = this.getSettings();
        localStorage.setItem('chess_settings', JSON.stringify(Object.assign({}, current, patch)));
    },

    // ===== Puzzle progress =====
    getPuzzleProgress() {
        try { return JSON.parse(localStorage.getItem('chess_puzzle_progress') || 'null') || {}; }
        catch (e) { return {}; }
    },
    savePuzzleResult(puzzleId, solved) {
        const progress = this.getPuzzleProgress();
        const entry = progress[puzzleId] || { solved: false, attempts: 0, solved_at: null };
        entry.attempts++;
        if (solved) {
            entry.solved = true;
            entry.solved_at = new Date().toISOString();
        }
        progress[puzzleId] = entry;
        localStorage.setItem('chess_puzzle_progress', JSON.stringify(progress));
    },
    getPuzzleStats() {
        const progress = this.getPuzzleProgress();
        const entries = Object.values(progress);
        const solved = entries.filter(e => e.solved).length;
        const attempts = entries.reduce((sum, e) => sum + e.attempts, 0);
        return {
            solved,
            attempts,
            success_rate: attempts ? Math.round((solved / attempts) * 100) : 0,
        };
    },

    // ===== Lesson progress =====
    getLessonProgress() {
        try { return JSON.parse(localStorage.getItem('chess_lesson_progress') || 'null') || {}; }
        catch (e) { return {}; }
    },
    saveLessonComplete(lessonId) {
        const progress = this.getLessonProgress();
        if (!progress[lessonId]) {
            progress[lessonId] = { completed: true, completed_at: new Date().toISOString() };
            localStorage.setItem('chess_lesson_progress', JSON.stringify(progress));
        }
    },
    getLessonStats() {
        const progress = this.getLessonProgress();
        return { completed: Object.keys(progress).length };
    },

    // ===== In-progress game (save / resume) =====
    saveInProgress(state) {
        try { localStorage.setItem('chess_in_progress', JSON.stringify(state)); } catch (e) {}
    },
    loadInProgress() {
        try {
            const raw = localStorage.getItem('chess_in_progress');
            if (!raw) return null;
            const state = JSON.parse(raw);
            if (!state || (!state.moves && !state.moveRecords) || state.isGameOver) return null;
            return state;
        } catch (e) { return null; }
    },
    clearInProgress() {
        localStorage.removeItem('chess_in_progress');
    },

    // ===== Data export / reset =====
    exportData() {
        const dump = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('chess_')) dump[key] = localStorage.getItem(key);
        }
        return JSON.stringify(dump, null, 2);
    },
    resetAllData() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('chess_')) keys.push(key);
        }
        keys.forEach(k => localStorage.removeItem(k));
    },
};

DB.initAdmin();
