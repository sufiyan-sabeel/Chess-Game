// ===== Chess Game Auth (localStorage sessions) =====
const Auth = {
    currentUser: null,

    init() {
        const saved = localStorage.getItem('chess_session');
        if (saved) this.currentUser = JSON.parse(saved);
    },

    login(username, password) {
        const user = DB.findUser(username);
        if (!user) return { error: 'Invalid username or password.' };
        if (user.password !== password) return { error: 'Invalid username or password.' };
        this.currentUser = { id: user.id, username: user.username };
        localStorage.setItem('chess_session', JSON.stringify(this.currentUser));
        return { success: true };
    },

    signup(username, email, password) {
        if (!username || !email || !password) return { error: 'All fields are required.' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Invalid email format.' };
        if (DB.findUser(username)) return { error: 'Username already taken.' };
        if (DB.findUserByEmail(email)) return { error: 'Email already taken.' };
        const id = DB.addUser(username, email, password);
        this.currentUser = { id, username };
        localStorage.setItem('chess_session', JSON.stringify(this.currentUser));
        return { success: true };
    },

    logout() {
        this.currentUser = null;
        localStorage.removeItem('chess_session');
    },

    isLoggedIn() { return this.currentUser !== null; },

    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};

Auth.init();
