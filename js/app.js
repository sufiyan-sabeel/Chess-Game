// ============================================================
// CheckMate — App shell: router, navigation, screens
// ============================================================
(function () {
    'use strict';

    // ---------- Utilities ----------
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
    function el(tag, cls, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html !== undefined) e.innerHTML = html;
        return e;
    }
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function toast(msg, type) {
        const root = $('#toast-root');
        const t = el('div', 'toast' + (type ? ' toast-' + type : ''), escapeHtml(msg));
        root.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2500);
    }

    function showModal(content, onClose) {
        const root = $('#modal-root');
        root.innerHTML = '';
        const overlay = el('div', 'modal-overlay');
        const modal = el('div', 'modal');
        if (typeof content === 'string') modal.innerHTML = content;
        else modal.appendChild(content);
        overlay.appendChild(modal);
        overlay.addEventListener('pointerdown', e => { if (e.target === overlay) { closeModal(); if (onClose) onClose(); } });
        root.appendChild(overlay);
        return modal;
    }
    function closeModal() { $('#modal-root').innerHTML = ''; }

    // ---------- App state ----------
    const App = {
        currentRoute: 'home',
        game: null,          // active GameController
        board: null,         // active ChessBoard
        clock: null,
        settings: DB.getSettings(),
        playOptions: null,   // options passed from Play screen
        puzzleState: null,
        lessonState: null,
        reviewState: null,
    };
    window.App = App;

    // ---------- Router ----------
    const ROUTES = ['home', 'play', 'game', 'puzzles', 'learn', 'review', 'stats', 'login'];

    function navigate(route) {
        if (!ROUTES.includes(route)) route = 'home';
        if (route !== 'login' && !Auth.isLoggedIn()) route = 'login';
        App.currentRoute = route;
        if (location.hash !== '#/' + route) location.hash = '#/' + route;
        renderRoute(route);
        updateNav(route);
    }

    function renderRoute(route) {
        $all('.screen').forEach(s => s.classList.remove('active'));
        const screen = $('#screen-' + route);
        if (screen) screen.classList.add('active');
        const renderer = SCREEN_RENDERERS[route];
        if (renderer) renderer(screen);
        // Save clock state when leaving game screen
        if (route !== 'game' && App.clock) { App.clock.saveState(); }
    }

    function updateNav(route) {
        $all('#bottom-nav .nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.route === route);
        });
    }

    window.addEventListener('hashchange', () => {
        const route = (location.hash || '#/home').replace('#/', '');
        if (route !== App.currentRoute) navigate(route);
    });

    // ---------- Bottom navigation ----------
    const NAV_ITEMS = [
        { route: 'home', icon: 'fa-house', label: 'Home' },
        { route: 'play', icon: 'fa-chess', label: 'Play' },
        { route: 'puzzles', icon: 'fa-puzzle-piece', label: 'Puzzles' },
        { route: 'learn', icon: 'fa-graduation-cap', label: 'Learn' },
        { route: 'review', icon: 'fa-clipboard-list', label: 'Review' },
        { route: 'stats', icon: 'fa-chart-line', label: 'Stats' },
    ];

    function buildNav() {
        const nav = $('#bottom-nav');
        nav.innerHTML = '';
        for (const item of NAV_ITEMS) {
            const btn = el('button', 'nav-item');
            btn.dataset.route = item.route;
            btn.innerHTML = '<i class="fa-solid ' + item.icon + '"></i><span>' + item.label + '</span>';
            btn.addEventListener('click', () => { SoundManager.uiClick(); navigate(item.route); });
            nav.appendChild(btn);
        }
    }

    // ---------- Auth gate ----------
    function requireAuth() {
        if (Auth.isLoggedIn()) return true;
        navigate('login');
        return false;
    }

    // ============================================================
    // SCREEN: LOGIN
    // ============================================================
    function renderLogin(screen) {
        screen.innerHTML = '';
        const wrap = el('div', 'flex flex-col items-center justify-center');
        wrap.style.minHeight = '100%';
        wrap.style.padding = '24px';

        const card = el('div', 'card');
        card.style.maxWidth = '400px';
        card.style.width = '100%';
        card.style.padding = '32px 24px';

        card.innerHTML =
            '<div class="text-center mb-24">' +
            '<div class="hero-icon" style="font-size:48px;color:var(--green)"><i class="fa-solid fa-chess"></i></div>' +
            '<h1>CheckMate</h1>' +
            '<p class="subtitle">Premium chess experience</p>' +
            '</div>';

        // Tabs
        const tabs = el('div', 'flex mb-16');
        tabs.style.borderBottom = '1px solid var(--border)';
        const loginTab = el('button', 'flex-1 py-2 text-center font-semibold', 'Login');
        const signupTab = el('button', 'flex-1 py-2 text-center font-semibold', 'Sign Up');
        for (const t of [loginTab, signupTab]) {
            t.style.background = 'none'; t.style.border = 'none'; t.style.color = 'var(--text-secondary)';
            t.style.borderBottom = '2px solid transparent'; t.style.cursor = 'pointer';
        }
        loginTab.style.color = 'var(--green)';
        loginTab.style.borderBottomColor = 'var(--green)';
        tabs.appendChild(loginTab); tabs.appendChild(signupTab);

        const errorBox = el('div', 'hidden mb-16');
        errorBox.style.cssText = 'background:rgba(224,91,91,0.15);color:var(--red);padding:10px;border-radius:8px;font-size:14px;';

        const loginForm = el('form', 'flex flex-col gap-12');
        loginForm.innerHTML =
            '<div><label class="form-label">Username</label><input type="text" id="login-username" class="form-input" required></div>' +
            '<div><label class="form-label">Password</label><input type="password" id="login-password" class="form-input" required></div>' +
            '<button type="submit" class="btn btn-primary">Login</button>';

        const signupForm = el('form', 'flex flex-col gap-12 hidden');
        signupForm.innerHTML =
            '<div><label class="form-label">Username</label><input type="text" id="signup-username" class="form-input" required></div>' +
            '<div><label class="form-label">Email</label><input type="email" id="signup-email" class="form-input" required></div>' +
            '<div><label class="form-label">Password</label><input type="password" id="signup-password" class="form-input" required></div>' +
            '<button type="submit" class="btn btn-primary">Create Account</button>';

        function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); }
        function switchTab(which) {
            const isLogin = which === 'login';
            loginForm.classList.toggle('hidden', !isLogin);
            signupForm.classList.toggle('hidden', isLogin);
            loginTab.style.color = isLogin ? 'var(--green)' : 'var(--text-secondary)';
            loginTab.style.borderBottomColor = isLogin ? 'var(--green)' : 'transparent';
            signupTab.style.color = !isLogin ? 'var(--green)' : 'var(--text-secondary)';
            signupTab.style.borderBottomColor = !isLogin ? 'var(--green)' : 'transparent';
            errorBox.classList.add('hidden');
        }
        loginTab.addEventListener('click', () => switchTab('login'));
        signupTab.addEventListener('click', () => switchTab('signup'));

        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const r = Auth.login($('#login-username').value, $('#login-password').value);
            if (r.error) showError(r.error);
            else { SoundManager.gameStart(); navigate('home'); }
        });
        signupForm.addEventListener('submit', e => {
            e.preventDefault();
            const r = Auth.signup($('#signup-username').value, $('#signup-email').value, $('#signup-password').value);
            if (r.error) showError(r.error);
            else { SoundManager.gameStart(); navigate('home'); }
        });

        card.appendChild(tabs);
        card.appendChild(errorBox);
        card.appendChild(loginForm);
        card.appendChild(signupForm);
        wrap.appendChild(card);
        screen.appendChild(wrap);
    }

    // ============================================================
    // SCREEN: HOME
    // ============================================================
    function renderHome(screen) {
        screen.innerHTML = '';
        const settings = App.settings;
        const stats = DB.getUserStats(Auth.currentUser.id);
        const games = DB.getUserGames(Auth.currentUser.id);
        const puzzleStats = DB.getPuzzleStats();
        const lessonStats = DB.getLessonStats();
        const inProgress = DB.loadInProgress();

        const wrap = el('div');
        wrap.style.padding = '16px';

        // Hero
        const hero = el('div', 'hero');
        hero.innerHTML =
            '<div class="hero-icon"><i class="fa-solid fa-chess"></i></div>' +
            '<h1>Welcome, ' + escapeHtml(Auth.currentUser.username) + '</h1>' +
            '<p class="subtitle">Ready for a game?</p>';
        const playBtn = el('a', 'btn btn-primary mt-16');
        playBtn.href = '#/play';
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i> Play Now';
        hero.appendChild(playBtn);
        wrap.appendChild(hero);

        // Continue game
        if (inProgress) {
            const cont = el('div', 'card card-interactive mb-16');
            cont.innerHTML =
                '<div class="flex items-center gap-12">' +
                '<i class="fa-solid fa-rotate-left" style="font-size:24px;color:var(--green)"></i>' +
                '<div><h3>Continue Game</h3><p class="subtitle">' + (inProgress.mode === 'ai' ? 'vs Computer' : 'Local') + ' &middot; ' + inProgress.moveRecords.length + ' moves</p></div>' +
                '</div>';
            cont.addEventListener('click', () => {
                App.playOptions = {
                    mode: inProgress.mode, difficulty: inProgress.difficulty,
                    playerColor: inProgress.playerColor, timeControl: inProgress.timeControl,
                };
                navigate('game');
            });
            wrap.appendChild(cont);
        }

        // Daily challenge
        const dailyPuzzle = getDailyPuzzle();
        if (dailyPuzzle) {
            const daily = el('div', 'card card-interactive mb-16');
            daily.innerHTML =
                '<div class="flex items-center gap-12">' +
                '<i class="fa-solid fa-calendar-day" style="font-size:24px;color:var(--gold)"></i>' +
                '<div><h3>Daily Challenge</h3><p class="subtitle">' + escapeHtml(dailyPuzzle.title) + ' &middot; Rating ' + dailyPuzzle.rating + '</p></div>' +
                '</div>';
            daily.addEventListener('click', () => { App._dailyPuzzle = dailyPuzzle; navigate('puzzles'); });
            wrap.appendChild(daily);
        }

        // Feature grid
        const grid = el('div', 'feature-grid');
        const features = [
            { route: 'play', icon: 'fa-robot', color: 'var(--green)', title: 'Play Computer', desc: 'Challenge the engine' },
            { route: 'play', icon: 'fa-user-friends', color: 'var(--blue)', title: 'Play a Friend', desc: 'Local 2-player' },
            { route: 'puzzles', icon: 'fa-puzzle-piece', color: 'var(--violet)', title: 'Puzzles', desc: puzzleStats.solved + ' solved' },
            { route: 'learn', icon: 'fa-graduation-cap', color: 'var(--cyan)', title: 'Learn', desc: lessonStats.completed + ' lessons done' },
            { route: 'review', icon: 'fa-clipboard-list', color: 'var(--gold)', title: 'Game Review', desc: 'Analyze your games' },
            { route: 'stats', icon: 'fa-chart-line', color: 'var(--red)', title: 'Statistics', desc: 'Track progress' },
        ];
        for (const f of features) {
            const card = el('a', 'feature-card');
            card.href = '#/' + f.route;
            card.innerHTML = '<i class="fa-solid ' + f.icon + '" style="color:' + f.color + '"></i><h3>' + f.title + '</h3><p>' + f.desc + '</p>';
            grid.appendChild(card);
        }
        wrap.appendChild(grid);

        // Your progress
        const prog = el('div', 'stat-grid');
        const progStats = [
            { value: stats.win + stats.loss + stats.draw, label: 'Games Played' },
            { value: stats.win, label: 'Wins' },
            { value: puzzleStats.solved, label: 'Puzzles Solved' },
            { value: lessonStats.completed, label: 'Lessons Done' },
        ];
        for (const s of progStats) {
            const c = el('div', 'stat-card');
            c.innerHTML = '<div class="stat-value">' + s.value + '</div><div class="stat-label">' + s.label + '</div>';
            prog.appendChild(c);
        }
        wrap.appendChild(prog);

        // Recent games
        if (games.length > 0) {
            const sec = el('div');
            sec.innerHTML = '<div class="section-header"><h2>Recent Games</h2></div>';
            const list = el('div');
            for (const g of games.slice(0, 5)) {
                const row = el('div', 'card mb-8');
                row.style.padding = '12px';
                const resultColor = g.result === 'win' ? 'var(--green)' : g.result === 'loss' ? 'var(--red)' : 'var(--yellow)';
                const resultIcon = g.result === 'win' ? 'fa-trophy' : g.result === 'loss' ? 'fa-flag' : 'fa-handshake';
                row.innerHTML =
                    '<div class="flex items-center gap-12">' +
                    '<i class="fa-solid ' + resultIcon + '" style="color:' + resultColor + ';font-size:20px"></i>' +
                    '<div class="flex-1"><div style="font-weight:600">' + (g.opponent_type === 'ai' ? 'vs Computer' : 'vs Human') + '</div>' +
                    '<div class="subtitle">' + new Date(g.played_at).toLocaleDateString() + '</div></div>' +
                    '<span class="badge" style="background:' + resultColor + ';color:#111">' + g.result + '</span>' +
                    '</div>';
                list.appendChild(row);
            }
            sec.appendChild(list);
            wrap.appendChild(sec);
        }

        screen.appendChild(wrap);
    }

    function getDailyPuzzle() {
        if (!window.PUZZLES || !PUZZLES.length) return null;
        const day = Math.floor(Date.now() / 86400000);
        return PUZZLES[day % PUZZLES.length];
    }

    // ============================================================
    // SCREEN: PLAY
    // ============================================================
    function renderPlay(screen) {
        screen.innerHTML = '';
        const wrap = el('div');
        wrap.style.padding = '16px';

        wrap.innerHTML = '<h1 class="mb-16">Play</h1>';

        // Mode selection
        const modeSec = el('div', 'mb-24');
        modeSec.innerHTML = '<h3 class="mb-8">Choose a mode</h3>';
        const modeGrid = el('div', 'feature-grid');
        const modes = [
            { id: 'ai', icon: 'fa-robot', color: 'var(--green)', title: 'vs Computer', desc: 'Challenge the AI' },
            { id: 'local', icon: 'fa-user-friends', color: 'var(--blue)', title: 'Local 2-Player', desc: 'Play on this device' },
            { id: 'practice', icon: 'fa-graduation-cap', color: 'var(--violet)', title: 'Practice', desc: 'Undo, hints & learn' },
        ];
        for (const m of modes) {
            const card = el('div', 'card card-interactive');
            card.innerHTML = '<i class="fa-solid ' + m.icon + '" style="color:' + m.color + ';font-size:28px"></i><h3>' + m.title + '</h3><p class="subtitle">' + m.desc + '</p>';
            card.addEventListener('click', () => { SoundManager.uiClick(); App._playMode = m.id; renderPlayOptions(wrap, m.id); });
            modeGrid.appendChild(card);
        }
        modeSec.appendChild(modeGrid);
        wrap.appendChild(modeSec);

        const optionsContainer = el('div');
        optionsContainer.id = 'play-options';
        wrap.appendChild(optionsContainer);

        screen.appendChild(wrap);

        // Default to showing options for vs Computer
        App._playMode = 'ai';
        renderPlayOptions(wrap, 'ai');
    }

    function renderPlayOptions(wrap, mode) {
        const container = $('#play-options', wrap);
        if (!container) return;
        container.innerHTML = '';

        const settings = App.settings;
        const opt = el('div');
        opt.style.display = 'flex';
        opt.style.flexDirection = 'column';
        opt.style.gap = '16px';

        // Difficulty (ai + practice)
        if (mode === 'ai' || mode === 'practice') {
            const diffCard = el('div', 'card');
            diffCard.innerHTML = '<label class="form-label">Difficulty</label>';
            const diffRow = el('div', 'flex gap-8');
            const diffs = [
                { id: 'beginner', label: 'Beginner' },
                { id: 'intermediate', label: 'Intermediate' },
                { id: 'advanced', label: 'Advanced' },
                { id: 'expert', label: 'Expert' },
            ];
            App._difficulty = App._difficulty || 'intermediate';
            for (const d of diffs) {
                const b = el('button', 'btn btn-sm ' + (App._difficulty === d.id ? 'btn-primary' : 'btn-secondary'), d.label);
                b.addEventListener('click', () => { App._difficulty = d.id; renderPlayOptions(wrap, mode); });
                diffRow.appendChild(b);
            }
            diffCard.appendChild(diffRow);
            opt.appendChild(diffCard);
        }

        // Side selection (ai + practice)
        if (mode === 'ai' || mode === 'practice') {
            const sideCard = el('div', 'card');
            sideCard.innerHTML = '<label class="form-label">Play as</label>';
            const sideRow = el('div', 'flex gap-8');
            App._side = App._side || 'white';
            for (const s of [{ id: 'white', label: 'White' }, { id: 'black', label: 'Black' }, { id: 'random', label: 'Random' }]) {
                const b = el('button', 'btn btn-sm ' + (App._side === s.id ? 'btn-primary' : 'btn-secondary'), s.label);
                b.addEventListener('click', () => { App._side = s.id; renderPlayOptions(wrap, mode); });
                sideRow.appendChild(b);
            }
            sideCard.appendChild(sideRow);
            opt.appendChild(sideCard);
        }

        // Time control
        const tcCard = el('div', 'card');
        tcCard.innerHTML = '<label class="form-label">Time Control</label>';
        const tcSelect = el('select', 'form-input');
        const timeControls = [
            { v: '1+0', l: '1+0 Bullet' }, { v: '2+1', l: '2+1 Bullet' },
            { v: '3+0', l: '3+0 Blitz' }, { v: '3+2', l: '3+2 Blitz' },
            { v: '5+0', l: '5+0 Blitz' }, { v: '5+3', l: '5+3 Blitz' },
            { v: '10+0', l: '10+0 Rapid' }, { v: '10+5', l: '10+5 Rapid' },
            { v: '15+10', l: '15+10 Rapid' }, { v: '30+0', l: '30+0 Classical' },
        ];
        for (const tc of timeControls) {
            const o = el('option');
            o.value = tc.v; o.textContent = tc.l;
            if ((App._timeControl || '5+3') === tc.v) o.selected = true;
            tcSelect.appendChild(o);
        }
        tcCard.appendChild(tcSelect);
        opt.appendChild(tcCard);

        // Board theme
        const themeCard = el('div', 'card');
        themeCard.innerHTML = '<label class="form-label">Board Theme</label>';
        const themeRow = el('div', 'flex gap-8');
        App._boardTheme = App._boardTheme || settings.board_theme || 'green';
        for (const t of [{ id: 'green', l: 'Green' }, { id: 'brown', l: 'Brown' }, { id: 'blue', l: 'Blue' }, { id: 'midnight', l: 'Midnight' }]) {
            const b = el('button', 'btn btn-sm ' + (App._boardTheme === t.id ? 'btn-primary' : 'btn-secondary'), t.l);
            b.addEventListener('click', () => { App._boardTheme = t.id; renderPlayOptions(wrap, mode); });
            themeRow.appendChild(b);
        }
        themeCard.appendChild(themeRow);
        opt.appendChild(themeCard);

        // Piece set
        const pieceCard = el('div', 'card');
        pieceCard.innerHTML = '<label class="form-label">Piece Set</label>';
        const pieceRow = el('div', 'flex gap-8');
        App._pieceSet = App._pieceSet || settings.piece_set || 'classic';
        for (const p of [{ id: 'classic', l: 'Classic' }, { id: 'unicode', l: 'Unicode' }]) {
            const b = el('button', 'btn btn-sm ' + (App._pieceSet === p.id ? 'btn-primary' : 'btn-secondary'), p.l);
            b.addEventListener('click', () => { App._pieceSet = p.id; renderPlayOptions(wrap, mode); });
            pieceRow.appendChild(b);
        }
        pieceCard.appendChild(pieceRow);
        opt.appendChild(pieceCard);

        // Start button
        const startBtn = el('button', 'btn btn-primary');
        startBtn.style.padding = '16px';
        startBtn.style.fontSize = '17px';
        startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start Game';
        startBtn.addEventListener('click', () => {
            SoundManager.uiClick();
            let playerColor = App._side || 'white';
            if (playerColor === 'random') playerColor = Math.random() < 0.5 ? 'white' : 'black';
            App.playOptions = {
                mode: mode,
                difficulty: App._difficulty || 'intermediate',
                playerColor: playerColor,
                timeControl: tcSelect.value,
                boardTheme: App._boardTheme,
                pieceSet: App._pieceSet,
            };
            navigate('game');
        });
        opt.appendChild(startBtn);

        container.appendChild(opt);
    }

    // ============================================================
    // SCREEN: GAME
    // ============================================================
    function renderGame(screen) {
        screen.innerHTML = '';

        // Resume in-progress game if present and no new options
        const inProgress = DB.loadInProgress();
        if (!App.playOptions && inProgress) {
            App.playOptions = {
                mode: inProgress.mode, difficulty: inProgress.difficulty,
                playerColor: inProgress.playerColor, timeControl: inProgress.timeControl,
            };
        }
        if (!App.playOptions) { navigate('play'); return; }

        const opts = App.playOptions;
        const settings = App.settings;

        // Build layout
        const layout = el('div', 'game-layout');
        const main = el('div', 'game-main');
        const side = el('div', 'game-side');

        // Status bar
        const statusBar = el('div', 'card');
        statusBar.style.cssText = 'padding:12px 16px;text-align:center;font-weight:700;font-size:16px;';
        statusBar.id = 'game-status';
        main.appendChild(statusBar);

        // Board container
        const boardWrap = el('div');
        boardWrap.style.width = '100%';
        boardWrap.style.maxWidth = '560px';
        boardWrap.id = 'game-board-container';
        main.appendChild(boardWrap);

        // Captured pieces (top - opponent's captured)
        const capturedTop = el('div', 'captured-row');
        capturedTop.id = 'captured-top';
        main.appendChild(capturedTop);

        // Captured pieces (bottom - player's captured)
        const capturedBottom = el('div', 'captured-row');
        capturedBottom.id = 'captured-bottom';
        main.appendChild(capturedBottom);

        // Side panel
        // Clock
        const clockCard = el('div', 'card');
        clockCard.innerHTML =
            '<div class="flex items-center justify-between mb-8">' +
            '<h3><i class="fa-solid fa-clock mr-8" style="color:var(--blue)"></i>Clock</h3>' +
            '<select id="time-control-select" class="form-input" style="width:auto;padding:6px 10px;font-size:13px;">' +
            '<option value="1+0">1+0</option><option value="2+1">2+1</option><option value="3+0">3+0</option>' +
            '<option value="3+2">3+2</option><option value="5+0">5+0</option><option value="5+3" selected>5+3</option>' +
            '<option value="10+0">10+0</option><option value="10+5">10+5</option><option value="15+10">15+10</option>' +
            '<option value="30+0">30+0</option></select></div>' +
            '<div class="flex flex-col gap-8">' +
            '<div class="clock-container clock-inactive" id="clock-black-container"><div class="flex items-center justify-between"><span style="font-size:13px;font-weight:600;color:var(--text-secondary)">Black</span><span id="clock-black" class="clock-time">05:00</span></div></div>' +
            '<div class="clock-container clock-active" id="clock-white-container"><div class="flex items-center justify-between"><span style="font-size:13px;font-weight:600;color:var(--green)">White</span><span id="clock-white" class="clock-time">05:00</span></div></div>' +
            '</div>' +
            '<div class="flex gap-8 mt-8">' +
            '<button id="pause-btn" class="btn btn-secondary btn-sm hidden"><i class="fa-solid fa-pause"></i> Pause</button>' +
            '<button id="resume-btn" class="btn btn-primary btn-sm hidden"><i class="fa-solid fa-play"></i> Resume</button>' +
            '<button id="reset-clock-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-rotate-left"></i> Reset</button>' +
            '</div>';
        side.appendChild(clockCard);

        // Move list
        const moveCard = el('div', 'card');
        moveCard.innerHTML = '<h3 class="mb-8"><i class="fa-solid fa-list mr-8" style="color:var(--violet)"></i>Moves</h3>';
        const moveList = el('div', 'move-list');
        moveList.id = 'move-list';
        moveCard.appendChild(moveList);
        side.appendChild(moveCard);

        // Controls
        const controls = el('div', 'game-controls');
        controls.innerHTML =
            '<button id="flip-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-right-left"></i> Flip</button>' +
            '<button id="undo-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-rotate-left"></i> Undo</button>' +
            '<button id="redo-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-rotate-right"></i> Redo</button>' +
            '<button id="resign-btn" class="btn btn-danger btn-sm"><i class="fa-solid fa-flag"></i> Resign</button>' +
            '<button id="draw-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-handshake"></i> Draw</button>' +
            '<button id="new-game-btn" class="btn btn-primary btn-sm"><i class="fa-solid fa-plus"></i> New Game</button>';
        side.appendChild(controls);

        layout.appendChild(main);
        layout.appendChild(side);
        screen.appendChild(layout);

        // Initialize board
        App.board = new ChessBoard(boardWrap, {
            theme: opts.boardTheme || settings.board_theme || 'green',
            pieceSet: opts.pieceSet || settings.piece_set || 'classic',
            coordinates: settings.coordinates !== false,
            animations: settings.animations !== false && !settings.reduced_motion,
            interactive: true,
            sideToMove: 'white',
            getLegalMoves: (r, c) => App.game ? App.game.getLegalMovesFor(r, c) : [],
            onMove: (fr, fc, tr, tc) => {
                if (App.game) App.game.makeMove(fr, fc, tr, tc);
            },
        });

        // Initialize clock
        App.clock = new ChessClock();
        App.clock.bindDOM('clock-white', 'clock-black', null, null);
        App.clock.setOnTimeout(loser => { if (App.game) App.game.handleTimeout(loser); });
        App.clock.setSelectedControl(opts.timeControl || '5+3');

        // Initialize controller
        App.game = new GameController({
            mode: opts.mode,
            difficulty: opts.difficulty || 'intermediate',
            playerColor: opts.playerColor || 'white',
            timeControl: opts.timeControl || '5+3',
            callbacks: {
                onGameStart: () => {
                    SoundManager.gameStart();
                    App.board.syncFromLogic(App.game.logic);
                    App.board.setOption('sideToMove', App.game.logic.currentPlayer);
                    updateGameUI();
                },
                onMoveMade: (mv) => {
                    if (mv.captured) SoundManager.capture(); else SoundManager.move();
                    if (App.game.logic.isInCheck(App.game.logic.currentPlayer)) SoundManager.check();
                    App.board.animateMove(mv.from.row, mv.from.col, mv.to.row, mv.to.col, mv.promotion);
                    App.board.syncFromLogic(App.game.logic);
                    App.board.highlightLastMove(mv.from, mv.to);
                    if (App.game.logic.isInCheck(App.game.logic.currentPlayer)) {
                        App.board.highlightCheck(App.game.logic.currentPlayer);
                    } else {
                        App.board.clearCheck();
                    }
                    App.board.setOption('sideToMove', App.game.logic.currentPlayer);
                    updateGameUI();
                },
                onGameOver: (info) => {
                    SoundManager.gameStart();
                    showGameOverModal(info);
                    updateGameUI();
                },
                onPromotionRequest: (fr, fc, tr, tc) => {
                    showPromotionDialog(fr, fc, tr, tc);
                },
                onAiThinking: (thinking) => {
                    App.board.setOption('interactive', !thinking);
                },
                onDrawOffer: () => {
                    showDrawOfferDialog();
                },
                onStateChange: () => {
                    updateGameUI();
                },
            },
        });
        App.game.bindClock(App.clock);

        // Resume or start new
        if (inProgress && !App._startedNew) {
            App.game.loadState(inProgress);
            App.board.syncFromLogic(App.game.logic);
            if (inProgress.moveRecords.length) {
                const last = inProgress.moveRecords[inProgress.moveRecords.length - 1];
                App.board.highlightLastMove(last.from, last.to);
            }
        } else {
            App.game.startNewGame();
        }
        App._startedNew = false;

        // Control bindings
        $('#flip-btn', screen).addEventListener('click', () => {
            App.board.setFlipped(!App.board.options.flipped);
        });
        $('#undo-btn', screen).addEventListener('click', () => { if (App.game) App.game.undo(); });
        $('#redo-btn', screen).addEventListener('click', () => { if (App.game) App.game.redo(); });
        $('#resign-btn', screen).addEventListener('click', () => {
            showConfirm('Resign this game?', () => { if (App.game) App.game.resign(); });
        });
        $('#draw-btn', screen).addEventListener('click', () => { if (App.game) App.game.offerDraw(); });
        $('#new-game-btn', screen).addEventListener('click', () => {
            App._startedNew = true;
            App.playOptions = null;
            renderGame(screen);
        });
        $('#pause-btn', screen).addEventListener('click', () => { if (App.clock) App.clock.pause(); });
        $('#resume-btn', screen).addEventListener('click', () => { if (App.clock) App.clock.resume(); });
        $('#reset-clock-btn', screen).addEventListener('click', () => { if (App.clock) App.clock.reset(); });
        $('#time-control-select', screen).addEventListener('change', e => {
            if (App.clock) { App.clock.setSelectedControl(e.target.value); App.clock.reset(); }
        });

        updateGameUI();
    }

    function updateGameUI() {
        if (!App.game) return;
        const g = App.game;
        const statusEl = $('#game-status');
        if (statusEl) {
            if (g.isGameOver) {
                statusEl.textContent = g.logic.gameStatus || 'Game Over';
            } else {
                const turn = g.logic.currentPlayer === 'white' ? 'White' : 'Black';
                const check = g.logic.isInCheck(g.logic.currentPlayer) ? ' — Check!' : '';
                statusEl.textContent = turn + "'s turn" + check;
            }
        }
        // Move list
        const ml = $('#move-list');
        if (ml) {
            ml.innerHTML = '';
            for (let i = 0; i < g.moveRecords.length; i += 2) {
                const row = el('div', 'move-row');
                const num = el('span', 'move-num', (i / 2 + 1) + '.');
                const white = el('span', 'move-san' + (i === g.moveRecords.length - 1 ? ' current' : ''), g.moveRecords[i].san);
                row.appendChild(num); row.appendChild(white);
                if (g.moveRecords[i + 1]) {
                    const black = el('span', 'move-san' + (i + 1 === g.moveRecords.length - 1 ? ' current' : ''), g.moveRecords[i + 1].san);
                    row.appendChild(black);
                }
                ml.appendChild(row);
            }
            ml.scrollTop = ml.scrollHeight;
        }
        // Captured pieces
        renderCaptured('captured-top', g.captured[g.logic.currentPlayer === 'white' ? 'black' : 'white'] || []);
        renderCaptured('captured-bottom', g.captured[g.logic.currentPlayer === 'white' ? 'white' : 'black'] || []);
        // Undo/redo buttons
        const undoBtn = $('#undo-btn');
        const redoBtn = $('#redo-btn');
        if (undoBtn) undoBtn.disabled = !g.canUndo();
        if (redoBtn) redoBtn.disabled = !g.canRedo();
        // Pause/resume
        const pauseBtn = $('#pause-btn');
        const resumeBtn = $('#resume-btn');
        if (pauseBtn && resumeBtn) {
            pauseBtn.classList.toggle('hidden', !g.clock || g.clock.paused);
            resumeBtn.classList.toggle('hidden', !g.clock || !g.clock.paused);
        }
    }

    function renderCaptured(containerId, pieces) {
        const c = document.getElementById(containerId);
        if (!c) return;
        c.innerHTML = '';
        const map = { wP: 'fa-chess-pawn', wN: 'fa-chess-knight', wB: 'fa-chess-bishop', wR: 'fa-chess-rook', wQ: 'fa-chess-queen', bP: 'fa-chess-pawn', bN: 'fa-chess-knight', bB: 'fa-chess-bishop', bR: 'fa-chess-rook', bQ: 'fa-chess-queen' };
        for (const p of pieces) {
            const icon = document.createElement('i');
            icon.className = 'fa-solid ' + map[p];
            icon.classList.add(p.startsWith('w') ? 'piece-white' : 'piece-black');
            c.appendChild(icon);
        }
    }

    function showPromotionDialog(fr, fc, tr, tc) {
        const color = App.game.logic.currentPlayer;
        const content = el('div');
        content.innerHTML = '<h2 class="text-center mb-16">Promote to</h2>';
        const row = el('div', 'flex gap-12');
        row.style.justifyContent = 'center';
        for (const p of ['Q', 'R', 'B', 'N']) {
            const btn = el('button', 'btn btn-secondary btn-icon');
            btn.style.width = '56px'; btn.style.height = '56px'; btn.style.fontSize = '28px';
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-chess-' + (p === 'Q' ? 'queen' : p === 'R' ? 'rook' : p === 'B' ? 'bishop' : 'knight');
            btn.appendChild(icon);
            btn.addEventListener('click', () => {
                closeModal();
                App.game.completePromotion(p);
            });
            row.appendChild(btn);
        }
        content.appendChild(row);
        showModal(content);
    }

    function showGameOverModal(info) {
        const resultText = info.result === 'win' ? 'Victory!' : info.result === 'loss' ? 'Defeat' : 'Draw';
        const reasonText = {
            checkmate: 'Checkmate', stalemate: 'Stalemate', repetition: 'Threefold repetition',
            fifty: 'Fifty-move rule', material: 'Insufficient material', resign: 'Resignation',
            timeout: 'Time out', draw_agreement: 'Draw by agreement',
        }[info.reason] || '';
        const content = el('div');
        content.innerHTML =
            '<div class="text-center">' +
            '<i class="fa-solid ' + (info.result === 'win' ? 'fa-trophy' : info.result === 'loss' ? 'fa-flag' : 'fa-handshake') + '" style="font-size:48px;color:' + (info.result === 'win' ? 'var(--gold)' : info.result === 'loss' ? 'var(--red)' : 'var(--yellow)') + '"></i>' +
            '<h2 class="mt-8">' + resultText + '</h2>' +
            '<p class="subtitle">' + reasonText + ' &middot; ' + info.moves.length + ' moves</p>' +
            '</div>';
        const btnRow = el('div', 'flex gap-8 mt-16');
        const againBtn = el('button', 'btn btn-primary', 'Play Again');
        againBtn.addEventListener('click', () => { closeModal(); App._startedNew = true; App.playOptions = null; navigate('play'); });
        const reviewBtn = el('button', 'btn btn-secondary', 'Review');
        reviewBtn.addEventListener('click', () => { closeModal(); navigate('review'); });
        btnRow.appendChild(againBtn); btnRow.appendChild(reviewBtn);
        content.appendChild(btnRow);
        showModal(content);
    }

    function showDrawOfferDialog() {
        const content = el('div');
        content.innerHTML = '<h2 class="text-center mb-16">Offer Draw?</h2><p class="subtitle text-center">Your opponent will be asked to accept.</p>';
        const row = el('div', 'flex gap-8 mt-16');
        const sendBtn = el('button', 'btn btn-primary', 'Send Offer');
        sendBtn.addEventListener('click', () => { closeModal(); toast('Draw offer sent'); if (App.game && App.game.mode === 'local') App.game.acceptDraw(); });
        const cancelBtn = el('button', 'btn btn-secondary', 'Cancel');
        cancelBtn.addEventListener('click', closeModal);
        row.appendChild(sendBtn); row.appendChild(cancelBtn);
        content.appendChild(row);
        showModal(content);
    }

    function showConfirm(msg, onYes) {
        const content = el('div');
        content.innerHTML = '<h2 class="mb-16">' + escapeHtml(msg) + '</h2>';
        const row = el('div', 'flex gap-8');
        const yesBtn = el('button', 'btn btn-danger', 'Yes');
        yesBtn.addEventListener('click', () => { closeModal(); onYes(); });
        const noBtn = el('button', 'btn btn-secondary', 'Cancel');
        noBtn.addEventListener('click', closeModal);
        row.appendChild(yesBtn); row.appendChild(noBtn);
        content.appendChild(row);
        showModal(content);
    }

    // ============================================================
    // SCREEN: PUZZLES
    // ============================================================
    function renderPuzzles(screen) {
        screen.innerHTML = '';
        const wrap = el('div');
        wrap.style.padding = '16px';
        wrap.innerHTML = '<h1 class="mb-16">Puzzles</h1>';

        // Daily challenge banner
        const daily = App._dailyPuzzle || getDailyPuzzle();
        if (daily) {
            const banner = el('div', 'card card-interactive mb-16');
            banner.style.borderColor = 'var(--gold)';
            banner.innerHTML =
                '<div class="flex items-center gap-12">' +
                '<i class="fa-solid fa-calendar-day" style="font-size:24px;color:var(--gold)"></i>' +
                '<div><h3>Daily Challenge</h3><p class="subtitle">' + escapeHtml(daily.title) + '</p></div>' +
                '</div>';
            banner.addEventListener('click', () => startPuzzle(daily));
            wrap.appendChild(banner);
            App._dailyPuzzle = null;
        }

        // Filter
        const filterCard = el('div', 'card mb-16');
        filterCard.innerHTML = '<label class="form-label">Category</label>';
        const filterRow = el('div', 'flex gap-8');
        filterRow.style.flexWrap = 'wrap';
        const categories = [
            { id: 'all', label: 'All' }, { id: 'mate', label: 'Checkmate' },
        ];
        App._puzzleFilter = App._puzzleFilter || 'all';
        for (const c of categories) {
            const b = el('button', 'btn btn-sm ' + (App._puzzleFilter === c.id ? 'btn-primary' : 'btn-secondary'), c.label);
            b.addEventListener('click', () => { App._puzzleFilter = c.id; renderPuzzles(screen); });
            filterRow.appendChild(b);
        }
        filterCard.appendChild(filterRow);
        wrap.appendChild(filterCard);

        // Puzzle list
        const progress = DB.getPuzzleProgress();
        const list = el('div');
        const puzzles = (window.PUZZLES || []).filter(p => App._puzzleFilter === 'all' || p.category === App._puzzleFilter);
        if (puzzles.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-puzzle-piece"></i><p>No puzzles available.</p></div>';
        }
        for (const p of puzzles) {
            const solved = progress[p.id] && progress[p.id].solved;
            const card = el('div', 'puzzle-card' + (solved ? ' solved' : ''));
            const diffStars = '★'.repeat(p.difficulty) + '☆'.repeat(5 - p.difficulty);
            card.innerHTML =
                '<div class="puzzle-header"><span class="puzzle-title">' + escapeHtml(p.title) + '</span>' +
                '<span class="puzzle-rating">' + diffStars + ' ' + p.rating + '</span></div>' +
                '<div class="puzzle-meta">' + (solved ? '<span class="badge badge-green">Solved</span>' : '<span class="badge badge-gray">Unsolved</span>') + ' &middot; Mate in ' + Math.ceil(p.solution.length / 2) + '</div>';
            card.addEventListener('click', () => startPuzzle(p));
            list.appendChild(card);
        }
        wrap.appendChild(list);
        screen.appendChild(wrap);
    }

    function startPuzzle(puzzle) {
        const screen = $('#screen-puzzles');
        screen.innerHTML = '';
        const wrap = el('div');
        wrap.style.padding = '16px';

        // Header
        const header = el('div', 'flex items-center gap-12 mb-16');
        const backBtn = el('button', 'btn btn-ghost btn-icon', '<i class="fa-solid fa-arrow-left"></i>');
        backBtn.addEventListener('click', () => renderPuzzles(screen));
        header.appendChild(backBtn);
        const title = el('div');
        title.innerHTML = '<h2>' + escapeHtml(puzzle.title) + '</h2><p class="subtitle">Rating ' + puzzle.rating + '</p>';
        header.appendChild(title);
        wrap.appendChild(header);

        // Status
        const status = el('div', 'card mb-12');
        status.style.cssText = 'padding:12px;text-align:center;font-weight:600;';
        status.id = 'puzzle-status';
        status.textContent = 'Your move — find the winning line';
        wrap.appendChild(status);

        // Board
        const boardWrap = el('div');
        boardWrap.style.width = '100%';
        boardWrap.style.maxWidth = '480px';
        boardWrap.style.margin = '0 auto';
        wrap.appendChild(boardWrap);

        // Hint button
        const hintBtn = el('button', 'btn btn-secondary btn-sm mt-16');
        hintBtn.innerHTML = '<i class="fa-solid fa-lightbulb"></i> Hint';
        hintBtn.addEventListener('click', () => {
            const state = App.puzzleState;
            if (state && puzzle.hint) toast(puzzle.hint);
        });
        wrap.appendChild(hintBtn);

        screen.appendChild(wrap);

        // Initialize puzzle state
        const logic = new GameLogic();
        // Load FEN
        const fenParts = puzzle.fen.split(/\s+/);
        const rows = fenParts[0].split('/');
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) logic.boardState[r][c] = null;
            let col = 0;
            for (const ch of rows[r]) {
                if (/\d/.test(ch)) { col += +ch; }
                else {
                    logic.boardState[r][col] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
                    col++;
                }
            }
        }
        logic.currentPlayer = fenParts[1] === 'w' ? 'white' : 'black';

        App.puzzleState = {
            puzzle, logic, solutionIndex: 0, over: false,
        };

        App.board = new ChessBoard(boardWrap, {
            theme: App.settings.board_theme || 'green',
            pieceSet: App.settings.piece_set || 'classic',
            coordinates: App.settings.coordinates !== false,
            animations: App.settings.animations !== false,
            interactive: true,
            sideToMove: logic.currentPlayer,
            getLegalMoves: (r, c) => logic.getValidMoves(r, c),
            onMove: (fr, fc, tr, tc) => handlePuzzleMove(fr, fc, tr, tc),
        });
        App.board.syncFromLogic(logic);
    }

    function handlePuzzleMove(fr, fc, tr, tc) {
        const state = App.puzzleState;
        if (!state || state.over) return;
        const { puzzle, logic } = state;
        const expected = puzzle.solution[state.solutionIndex];
        if (!expected) return;

        const isCorrect = expected.from[0] === fr && expected.from[1] === fc && expected.to[0] === tr && expected.to[1] === tc;

        if (isCorrect) {
            // Play the move
            const promotion = expected.promotion || null;
            logic.makeMove(fr, fc, tr, tc, promotion);
            App.board.animateMove(fr, fc, tr, tc, promotion);
            App.board.syncFromLogic(logic);
            state.solutionIndex++;
            SoundManager.move();

            if (state.solutionIndex >= puzzle.solution.length) {
                // Puzzle solved!
                state.over = true;
                DB.savePuzzleResult(puzzle.id, true);
                SoundManager.gameStart();
                const status = $('#puzzle-status');
                if (status) { status.textContent = 'Correct! Puzzle solved.'; status.style.color = 'var(--green)'; }
                toast('Puzzle solved!', 'success');
                setTimeout(() => {
                    const content = el('div');
                    content.innerHTML = '<div class="text-center"><i class="fa-solid fa-trophy" style="font-size:48px;color:var(--gold)"></i><h2 class="mt-8">Solved!</h2><p class="subtitle">' + escapeHtml(puzzle.explanation) + '</p></div>';
                    const row = el('div', 'flex gap-8 mt-16');
                    const nextBtn = el('button', 'btn btn-primary', 'Next Puzzle');
                    nextBtn.addEventListener('click', () => { closeModal(); renderPuzzles($('#screen-puzzles')); });
                    const doneBtn = el('button', 'btn btn-secondary', 'Done');
                    doneBtn.addEventListener('click', () => { closeModal(); renderPuzzles($('#screen-puzzles')); });
                    row.appendChild(nextBtn); row.appendChild(doneBtn);
                    content.appendChild(row);
                    showModal(content);
                }, 800);
            } else {
                // Play opponent's reply
                const status = $('#puzzle-status');
                if (status) status.textContent = 'Correct! Opponent replies...';
                setTimeout(() => {
                    const reply = puzzle.solution[state.solutionIndex];
                    if (reply) {
                        logic.makeMove(reply.from[0], reply.from[1], reply.to[0], reply.to[1], reply.promotion || null);
                        App.board.animateMove(reply.from[0], reply.from[1], reply.to[0], reply.to[1], reply.promotion || null);
                        App.board.syncFromLogic(logic);
                        state.solutionIndex++;
                        if (status) status.textContent = 'Your move — continue the line';
                    }
                }, 500);
            }
        } else {
            // Wrong move
            SoundManager.uiClick();
            const status = $('#puzzle-status');
            if (status) { status.textContent = 'Not quite — try again'; status.style.color = 'var(--red)'; }
            setTimeout(() => { if (status) { status.textContent = 'Your move — find the winning line'; status.style.color = ''; } }, 1500);
            toast('Incorrect move', 'error');
        }
    }

    // ============================================================
    // SCREEN: LEARN
    // ============================================================
    function renderLearn(screen) {
        screen.innerHTML = '';
        const wrap = el('div');
        wrap.style.padding = '16px';
        wrap.innerHTML = '<h1 class="mb-16">Learn</h1>';

        const progress = DB.getLessonProgress();
        const lessons = window.LESSONS || [];
        const path = el('div', 'lesson-path');

        lessons.forEach((lesson, i) => {
            const isCompleted = progress[lesson.id];
            const isUnlocked = i === 0 || progress[lessons[i - 1].id];
            const node = el('div', 'lesson-node' + (isCompleted ? ' completed' : '') + (!isUnlocked ? ' locked' : ''));
            const iconClass = isCompleted ? 'done' : isUnlocked ? 'available' : 'locked';
            const iconContent = isCompleted ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-chess"></i>';
            node.innerHTML =
                '<div class="lesson-icon ' + iconClass + '">' + iconContent + '</div>' +
                '<div class="lesson-info"><div class="lesson-title">' + escapeHtml(lesson.title) + '</div>' +
                '<div class="lesson-meta">' + lesson.category + ' &middot; ' + '★'.repeat(lesson.difficulty) + '</div></div>' +
                (isUnlocked ? '<i class="fa-solid fa-chevron-right" style="color:var(--text-muted)"></i>' : '<i class="fa-solid fa-lock" style="color:var(--text-muted)"></i>');
            if (isUnlocked) {
                node.addEventListener('click', () => startLesson(lesson));
            }
            path.appendChild(node);
        });
        wrap.appendChild(path);
        screen.appendChild(wrap);
    }

    function startLesson(lesson) {
        const screen = $('#screen-learn');
        screen.innerHTML = '';
        const wrap = el('div');
        wrap.style.padding = '16px';

        // Header
        const header = el('div', 'flex items-center gap-12 mb-16');
        const backBtn = el('button', 'btn btn-ghost btn-icon', '<i class="fa-solid fa-arrow-left"></i>');
        backBtn.addEventListener('click', () => renderLearn(screen));
        header.appendChild(backBtn);
        const title = el('div');
        title.innerHTML = '<h2>' + escapeHtml(lesson.title) + '</h2>';
        header.appendChild(title);
        wrap.appendChild(header);

        // Content
        const contentCard = el('div', 'card mb-16');
        contentCard.innerHTML = lesson.content;
        wrap.appendChild(contentCard);

        // Demo board
        if (lesson.demo) {
            const demoLabel = el('h3', 'mb-8');
            demoLabel.textContent = lesson.demo.caption || 'Interactive demo';
            wrap.appendChild(demoLabel);
            const boardWrap = el('div');
            boardWrap.style.width = '100%';
            boardWrap.style.maxWidth = '400px';
            boardWrap.style.margin = '0 auto';
            wrap.appendChild(boardWrap);

            // Demo controls
            const demoControls = el('div', 'flex gap-8 mt-12');
            demoControls.style.justifyContent = 'center';
            const prevBtn = el('button', 'btn btn-secondary btn-sm', '<i class="fa-solid fa-chevron-left"></i> Prev');
            const nextBtn = el('button', 'btn btn-secondary btn-sm', 'Next <i class="fa-solid fa-chevron-right"></i>');
            const resetBtn = el('button', 'btn btn-secondary btn-sm', '<i class="fa-solid fa-rotate-left"></i> Reset');
            demoControls.appendChild(prevBtn); demoControls.appendChild(nextBtn); demoControls.appendChild(resetBtn);
            wrap.appendChild(demoControls);

            // Build demo logic
            const logic = new GameLogic();
            const fenParts = lesson.demo.fen.split(/\s+/);
            const rows = fenParts[0].split('/');
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) logic.boardState[r][c] = null;
                let col = 0;
                for (const ch of rows[r]) {
                    if (/\d/.test(ch)) { col += +ch; }
                    else { logic.boardState[r][col] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase(); col++; }
                }
            }
            logic.currentPlayer = fenParts[1] === 'w' ? 'white' : 'black';

            App.lessonState = { lesson, logic, moveIndex: 0, moves: lesson.demo.moves || [] };

            App.board = new ChessBoard(boardWrap, {
                theme: App.settings.board_theme || 'green',
                pieceSet: App.settings.piece_set || 'classic',
                coordinates: true,
                animations: true,
                interactive: false,
            });
            App.board.syncFromLogic(logic);

            nextBtn.addEventListener('click', () => {
                const st = App.lessonState;
                if (!st || st.moveIndex >= st.moves.length) return;
                const mv = st.moves[st.moveIndex];
                logic.makeMove(mv.from[0], mv.from[1], mv.to[0], mv.to[1], mv.promotion || null);
                App.board.animateMove(mv.from[0], mv.from[1], mv.to[0], mv.to[1], mv.promotion || null);
                App.board.syncFromLogic(logic);
                st.moveIndex++;
            });
            prevBtn.addEventListener('click', () => {
                const st = App.lessonState;
                if (!st || st.moveIndex <= 0) return;
                st.moveIndex--;
                // Replay from start
                const fresh = new GameLogic();
                const fp = st.lesson.demo.fen.split(/\s+/);
                const rs = fp[0].split('/');
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) fresh.boardState[r][c] = null;
                    let col = 0;
                    for (const ch of rs[r]) {
                        if (/\d/.test(ch)) { col += +ch; }
                        else { fresh.boardState[r][col] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase(); col++; }
                    }
                }
                fresh.currentPlayer = fp[1] === 'w' ? 'white' : 'black';
                for (let i = 0; i < st.moveIndex; i++) {
                    const mv = st.moves[i];
                    fresh.makeMove(mv.from[0], mv.from[1], mv.to[0], mv.to[1], mv.promotion || null);
                }
                st.logic = fresh;
                App.board.syncFromLogic(fresh);
            });
            resetBtn.addEventListener('click', () => {
                const st = App.lessonState;
                if (!st) return;
                st.moveIndex = 0;
                const fresh = new GameLogic();
                const fp = st.lesson.demo.fen.split(/\s+/);
                const rs = fp[0].split('/');
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) fresh.boardState[r][c] = null;
                    let col = 0;
                    for (const ch of rs[r]) {
                        if (/\d/.test(ch)) { col += +ch; }
                        else { fresh.boardState[r][col] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase(); col++; }
                    }
                }
                fresh.currentPlayer = fp[1] === 'w' ? 'white' : 'black';
                st.logic = fresh;
                App.board.syncFromLogic(fresh);
            });
        }

        // Key points
        if (lesson.keyPoints && lesson.keyPoints.length) {
            const kpCard = el('div', 'card mb-16');
            kpCard.innerHTML = '<h3 class="mb-8">Key Points</h3>';
            const ul = el('div');
            ul.style.cssText = 'padding-left:20px;color:var(--text-secondary);font-size:14px;line-height:1.8;';
            for (const kp of lesson.keyPoints) {
                ul.innerHTML += '<li>' + escapeHtml(kp) + '</li>';
            }
            kpCard.appendChild(ul);
            wrap.appendChild(kpCard);
        }

        // Complete button
        const completeBtn = el('button', 'btn btn-primary');
        completeBtn.style.padding = '16px';
        completeBtn.innerHTML = '<i class="fa-solid fa-check"></i> Mark Complete';
        completeBtn.addEventListener('click', () => {
            DB.saveLessonComplete(lesson.id);
            SoundManager.gameStart();
            toast('Lesson completed!', 'success');
            renderLearn(screen);
        });
        wrap.appendChild(completeBtn);

        screen.appendChild(wrap);
    }

    // ============================================================
    // SCREEN: REVIEW
    // ============================================================
    function renderReview(screen) {
        screen.innerHTML = '';
        const wrap = el('div');
        wrap.style.padding = '16px';
        wrap.innerHTML = '<h1 class="mb-16">Game Review</h1>';

        const games = DB.getUserGames(Auth.currentUser.id);
        if (games.length === 0) {
            wrap.innerHTML += '<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><p>No games to review yet.<br>Play a game first!</p></div>';
            screen.appendChild(wrap);
            return;
        }

        // Game list
        const list = el('div');
        for (const g of games.slice(0, 20)) {
            const card = el('div', 'card card-interactive mb-8');
            const resultColor = g.result === 'win' ? 'var(--green)' : g.result === 'loss' ? 'var(--red)' : 'var(--yellow)';
            card.innerHTML =
                '<div class="flex items-center gap-12">' +
                '<div class="flex-1"><div style="font-weight:600">' + (g.opponent_type === 'ai' ? 'vs Computer' : 'vs Human') + '</div>' +
                '<div class="subtitle">' + new Date(g.played_at).toLocaleDateString() + ' &middot; ' + (g.time_control || 'No clock') + '</div></div>' +
                '<span class="badge" style="background:' + resultColor + ';color:#111">' + g.result + '</span>' +
                '</div>';
            card.addEventListener('click', () => startReview(g));
            list.appendChild(card);
        }
        wrap.appendChild(list);

        // Import PGN
        const importBtn = el('button', 'btn btn-secondary mt-16');
        importBtn.innerHTML = '<i class="fa-solid fa-file-import"></i> Import PGN';
        importBtn.addEventListener('click', showImportPGN);
        wrap.appendChild(importBtn);

        screen.appendChild(wrap);
    }

    function startReview(game) {
        const screen = $('#screen-review');
        screen.innerHTML = '';
        const wrap = el('div');
        wrap.style.padding = '16px';

        // Header
        const header = el('div', 'flex items-center gap-12 mb-16');
        const backBtn = el('button', 'btn btn-ghost btn-icon', '<i class="fa-solid fa-arrow-left"></i>');
        backBtn.addEventListener('click', () => renderReview(screen));
        header.appendChild(backBtn);
        const title = el('div');
        title.innerHTML = '<h2>Game Review</h2><p class="subtitle">' + (game.opponent_type === 'ai' ? 'vs Computer' : 'vs Human') + ' &middot; ' + new Date(game.played_at).toLocaleDateString() + '</p>';
        header.appendChild(title);
        wrap.appendChild(header);

        // Layout: board + eval bar + controls
        const mainArea = el('div');
        mainArea.style.display = 'flex';
        mainArea.style.gap = '12px';
        mainArea.style.alignItems = 'flex-start';

        // Eval bar
        const evalBar = el('div', 'eval-bar');
        evalBar.innerHTML = '<div class="eval-fill" id="eval-fill" style="height:50%"></div>';
        const evalLabel = el('div', 'eval-label', '0.0');
        evalLabel.id = 'eval-label';
        mainArea.appendChild(evalBar);

        // Board
        const boardWrap = el('div');
        boardWrap.style.flex = '1';
        boardWrap.style.maxWidth = '480px';
        mainArea.appendChild(boardWrap);
        wrap.appendChild(mainArea);

        // Move list
        const moveCard = el('div', 'card mt-12');
        moveCard.innerHTML = '<h3 class="mb-8">Moves</h3>';
        const moveList = el('div', 'move-list');
        moveList.id = 'review-move-list';
        moveCard.appendChild(moveList);
        wrap.appendChild(moveCard);

        // Controls
        const controls = el('div', 'game-controls mt-12');
        controls.innerHTML =
            '<button id="first-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-backward-fast"></i></button>' +
            '<button id="prev-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-chevron-left"></i></button>' +
            '<button id="next-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-chevron-right"></i></button>' +
            '<button id="last-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-forward-fast"></i></button>' +
            '<button id="replay-btn" class="btn btn-primary btn-sm"><i class="fa-solid fa-play"></i> Replay</button>';
        wrap.appendChild(controls);

        // Export
        const exportBtn = el('button', 'btn btn-secondary btn-sm mt-8');
        exportBtn.innerHTML = '<i class="fa-solid fa-download"></i> Export PGN';
        exportBtn.addEventListener('click', () => {
            const moves = parseMoveHistory(game.moves_history);
            const pgn = ChessNotation.gameToPGN(moves, {
                white: Auth.currentUser.username,
                black: game.opponent_type === 'ai' ? 'Computer' : 'Opponent',
                result: game.result === 'win' ? '1-0' : game.result === 'loss' ? '0-1' : '1/2-1/2',
                time_control: game.time_control,
            });
            // Copy to clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(pgn).then(() => toast('PGN copied to clipboard', 'success'));
            }
            // Also show in modal
            const content = el('div');
            content.innerHTML = '<h3 class="mb-8">PGN</h3>';
            const pre = el('div');
            pre.style.cssText = 'background:var(--bg-elevated);padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow-y:auto;';
            pre.textContent = pgn;
            content.appendChild(pre);
            const copyBtn = el('button', 'btn btn-primary mt-8', 'Copy to Clipboard');
            copyBtn.addEventListener('click', () => {
                if (navigator.clipboard) navigator.clipboard.writeText(pgn).then(() => toast('Copied!', 'success'));
            });
            content.appendChild(copyBtn);
            showModal(content);
        });
        wrap.appendChild(exportBtn);

        screen.appendChild(wrap);

        // Replay the game
        const logic = new GameLogic();
        const moves = parseMoveHistory(game.moves_history);
        App.reviewState = { logic, moves, index: 0, game };

        App.board = new ChessBoard(boardWrap, {
            theme: App.settings.board_theme || 'green',
            pieceSet: App.settings.piece_set || 'classic',
            coordinates: true,
            animations: true,
            interactive: false,
        });
        App.board.syncFromLogic(logic);
        updateReviewUI();

        // Control bindings
        $('#first-btn', screen).addEventListener('click', () => { App.reviewState.index = 0; replayToIndex(); });
        $('#prev-btn', screen).addEventListener('click', () => { if (App.reviewState.index > 0) { App.reviewState.index--; replayToIndex(); } });
        $('#next-btn', screen).addEventListener('click', () => { if (App.reviewState.index < App.reviewState.moves.length) { App.reviewState.index++; replayToIndex(); } });
        $('#last-btn', screen).addEventListener('click', () => { App.reviewState.index = App.reviewState.moves.length; replayToIndex(); });
        $('#replay-btn', screen).addEventListener('click', () => {
            App.reviewState.index = 0;
            replayToIndex();
            const interval = setInterval(() => {
                if (App.reviewState.index >= App.reviewState.moves.length) { clearInterval(interval); return; }
                App.reviewState.index++;
                replayToIndex();
            }, 800);
        });
    }

    function parseMoveHistory(history) {
        // Parse coordinate notation like "e2e4 e7e5" into move records
        if (!history) return [];
        const moves = [];
        const tokens = history.trim().split(/\s+/);
        const logic = new GameLogic();
        for (const token of tokens) {
            if (token.length < 4) continue;
            const fromCol = 'abcdefgh'.indexOf(token[0]);
            const fromRow = 8 - parseInt(token[1], 10);
            const toCol = 'abcdefgh'.indexOf(token[2]);
            const toRow = 8 - parseInt(token[3], 10);
            if (fromCol < 0 || fromRow < 0 || toCol < 0 || toRow < 0) continue;
            const promotion = token.length > 4 ? token[4].toUpperCase() : null;
            moves.push({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, promotion });
            logic.makeMove(fromRow, fromCol, toRow, toCol, promotion);
        }
        return moves;
    }

    function replayToIndex() {
        const st = App.reviewState;
        if (!st) return;
        const logic = new GameLogic();
        for (let i = 0; i < st.index; i++) {
            const mv = st.moves[i];
            if (mv) logic.makeMove(mv.from.row, mv.from.col, mv.to.row, mv.to.col, mv.promotion);
        }
        st.logic = logic;
        App.board.syncFromLogic(logic);
        if (st.index > 0) {
            const last = st.moves[st.index - 1];
            App.board.highlightLastMove(last.from, last.to);
        }
        updateReviewUI();
    }

    function updateReviewUI() {
        const st = App.reviewState;
        if (!st) return;
        // Move list
        const ml = $('#review-move-list');
        if (ml) {
            ml.innerHTML = '';
            for (let i = 0; i < st.moves.length; i += 2) {
                const row = el('div', 'move-row');
                const num = el('span', 'move-num', (i / 2 + 1) + '.');
                const white = el('span', 'move-san' + (i === st.index - 1 ? ' current' : ''), sanFromMove(st.moves[i], i));
                row.appendChild(num); row.appendChild(white);
                if (st.moves[i + 1]) {
                    const black = el('span', 'move-san' + (i + 1 === st.index - 1 ? ' current' : ''), sanFromMove(st.moves[i + 1], i + 1));
                    row.appendChild(black);
                }
                ml.appendChild(row);
            }
        }
        // Eval
        const evalScore = gameAI.evaluateBoard(st.logic);
        const evalPct = Math.max(5, Math.min(95, 50 + evalScore * 0.5));
        const fill = $('#eval-fill');
        const label = $('#eval-label');
        if (fill) fill.style.height = evalPct + '%';
        if (label) label.textContent = (evalScore / 100).toFixed(1);
    }

    function sanFromMove(mv, index) {
        // Reconstruct SAN by replaying
        const logic = new GameLogic();
        const st = App.reviewState;
        for (let i = 0; i < index; i++) {
            const m = st.moves[i];
            if (m) logic.makeMove(m.from.row, m.from.col, m.to.row, m.to.col, m.promotion);
        }
        return ChessNotation.moveToSAN(logic, mv.from.row, mv.from.col, mv.to.row, mv.to.col, mv.promotion) || '?';
    }

    function showImportPGN() {
        const content = el('div');
        content.innerHTML = '<h3 class="mb-8">Import PGN</h3>';
        const textarea = el('textarea', 'form-input');
        textarea.style.minHeight = '150px';
        textarea.style.fontFamily = 'monospace';
        textarea.style.fontSize = '12px';
        textarea.placeholder = 'Paste PGN here...';
        content.appendChild(textarea);
        const btnRow = el('div', 'flex gap-8 mt-8');
        const importBtn = el('button', 'btn btn-primary', 'Import');
        importBtn.addEventListener('click', () => {
            try {
                const result = ChessNotation.parsePGN(textarea.value);
                closeModal();
                toast('Imported ' + result.moves.length + ' moves', 'success');
                // Start review with imported game
                const screen = $('#screen-review');
                screen.innerHTML = '';
                const wrap = el('div');
                wrap.style.padding = '16px';
                wrap.innerHTML = '<h1 class="mb-16">Imported Game</h1>';
                const boardWrap = el('div');
                boardWrap.style.width = '100%';
                boardWrap.style.maxWidth = '480px';
                wrap.appendChild(boardWrap);
                const moveCard = el('div', 'card mt-12');
                const moveList = el('div', 'move-list');
                moveList.id = 'review-move-list';
                moveCard.appendChild(moveList);
                wrap.appendChild(moveCard);
                const controls = el('div', 'game-controls mt-12');
                controls.innerHTML =
                    '<button id="first-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-backward-fast"></i></button>' +
                    '<button id="prev-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-chevron-left"></i></button>' +
                    '<button id="next-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-chevron-right"></i></button>' +
                    '<button id="last-btn" class="btn btn-secondary btn-sm"><i class="fa-solid fa-forward-fast"></i></button>';
                wrap.appendChild(controls);
                screen.appendChild(wrap);
                const logic = new GameLogic();
                App.reviewState = { logic, moves: result.moves, index: 0, game: null };
                App.board = new ChessBoard(boardWrap, { theme: App.settings.board_theme || 'green', pieceSet: App.settings.piece_set || 'classic', coordinates: true, animations: true, interactive: false });
                App.board.syncFromLogic(logic);
                updateReviewUI();
                $('#first-btn', screen).addEventListener('click', () => { App.reviewState.index = 0; replayToIndex(); });
                $('#prev-btn', screen).addEventListener('click', () => { if (App.reviewState.index > 0) { App.reviewState.index--; replayToIndex(); } });
                $('#next-btn', screen).addEventListener('click', () => { if (App.reviewState.index < App.reviewState.moves.length) { App.reviewState.index++; replayToIndex(); } });
                $('#last-btn', screen).addEventListener('click', () => { App.reviewState.index = App.reviewState.moves.length; replayToIndex(); });
            } catch (e) {
                toast('Invalid PGN: ' + e.message, 'error');
            }
        });
        const cancelBtn = el('button', 'btn btn-secondary', 'Cancel');
        cancelBtn.addEventListener('click', closeModal);
        btnRow.appendChild(importBtn); btnRow.appendChild(cancelBtn);
        content.appendChild(btnRow);
        showModal(content);
    }

    // ============================================================
    // SCREEN: STATS
    // ============================================================
    function renderStats(screen) {
        screen.innerHTML = '';
        const wrap = el('div');
        wrap.style.padding = '16px';
        wrap.innerHTML = '<h1 class="mb-16">Statistics</h1>';

        const games = DB.getUserGames(Auth.currentUser.id);
        const stats = DB.getUserStats(Auth.currentUser.id);
        const puzzleStats = DB.getPuzzleStats();
        const lessonStats = DB.getLessonStats();

        // Date filter
        const filterCard = el('div', 'card mb-16');
        filterCard.innerHTML = '<label class="form-label">Time Period</label>';
        const filterRow = el('div', 'flex gap-8');
        const periods = [
            { id: 7, label: '7 days' }, { id: 30, label: '30 days' },
            { id: 90, label: '90 days' }, { id: 0, label: 'All time' },
        ];
        App._statsPeriod = App._statsPeriod || 0;
        for (const p of periods) {
            const b = el('button', 'btn btn-sm ' + (App._statsPeriod === p.id ? 'btn-primary' : 'btn-secondary'), p.label);
            b.addEventListener('click', () => { App._statsPeriod = p.id; renderStats(screen); });
            filterRow.appendChild(b);
        }
        filterCard.appendChild(filterRow);
        wrap.appendChild(filterCard);

        // Filter games by period
        const cutoff = App._statsPeriod > 0 ? Date.now() - App._statsPeriod * 86400000 : 0;
        const filteredGames = games.filter(g => !cutoff || new Date(g.played_at).getTime() >= cutoff);
        const filteredStats = {
            win: filteredGames.filter(g => g.result === 'win').length,
            loss: filteredGames.filter(g => g.result === 'loss').length,
            draw: filteredGames.filter(g => g.result === 'draw').length,
        };
        const total = filteredStats.win + filteredStats.loss + filteredStats.draw;
        const winRate = total ? Math.round((filteredStats.win / total) * 100) : 0;

        // Overview
        const overview = el('div', 'stat-grid');
        const overviewStats = [
            { value: total, label: 'Games', color: 'var(--text)' },
            { value: filteredStats.win, label: 'Wins', color: 'var(--green)' },
            { value: filteredStats.loss, label: 'Losses', color: 'var(--red)' },
            { value: filteredStats.draw, label: 'Draws', color: 'var(--yellow)' },
            { value: winRate + '%', label: 'Win Rate', color: 'var(--green)' },
            { value: calculateStreak(games), label: 'Current Streak', color: 'var(--gold)' },
        ];
        for (const s of overviewStats) {
            const c = el('div', 'stat-card');
            c.innerHTML = '<div class="stat-value" style="color:' + s.color + '">' + s.value + '</div><div class="stat-label">' + s.label + '</div>';
            overview.appendChild(c);
        }
        wrap.appendChild(overview);

        // Results chart
        if (total > 0) {
            const chartCard = el('div', 'chart-container');
            chartCard.innerHTML = '<h3>Results</h3>';
            const chartData = [
                { label: 'Wins', value: filteredStats.win, color: 'var(--green)' },
                { label: 'Losses', value: filteredStats.loss, color: 'var(--red)' },
                { label: 'Draws', value: filteredStats.draw, color: 'var(--yellow)' },
            ];
            for (const d of chartData) {
                const pct = total ? Math.round((d.value / total) * 100) : 0;
                const bar = el('div', 'chart-bar');
                bar.innerHTML = '<span class="bar-label">' + d.label + '</span>' +
                    '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + d.color + '"></div></div>' +
                    '<span class="bar-value">' + d.value + '</span>';
                chartCard.appendChild(bar);
            }
            wrap.appendChild(chartCard);
        }

        // By opponent
        const byOpp = el('div', 'chart-container');
        byOpp.innerHTML = '<h3>By Opponent</h3>';
        const aiGames = filteredGames.filter(g => g.opponent_type === 'ai').length;
        const humanGames = filteredGames.filter(g => g.opponent_type === 'human').length;
        const oppData = [
            { label: 'Computer', value: aiGames, color: 'var(--green)' },
            { label: 'Human', value: humanGames, color: 'var(--blue)' },
        ];
        for (const d of oppData) {
            const pct = total ? Math.round((d.value / total) * 100) : 0;
            const bar = el('div', 'chart-bar');
            bar.innerHTML = '<span class="bar-label">' + d.label + '</span>' +
                '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + d.color + '"></div></div>' +
                '<span class="bar-value">' + d.value + '</span>';
            byOpp.appendChild(bar);
        }
        wrap.appendChild(byOpp);

        // Puzzles & Lessons
        const learnCard = el('div', 'chart-container');
        learnCard.innerHTML = '<h3>Learning</h3>';
        const learnData = [
            { label: 'Puzzles Solved', value: puzzleStats.solved, color: 'var(--violet)' },
            { label: 'Puzzle Success', value: puzzleStats.success_rate + '%', color: 'var(--violet)' },
            { label: 'Lessons Done', value: lessonStats.completed, color: 'var(--cyan)' },
        ];
        for (const d of learnData) {
            const bar = el('div', 'chart-bar');
            bar.innerHTML = '<span class="bar-label">' + d.label + '</span>' +
                '<div class="bar-track"><div class="bar-fill" style="width:' + (typeof d.value === 'string' ? d.value : Math.min(100, d.value * 10)) + '%;background:' + d.color + '"></div></div>' +
                '<span class="bar-value">' + d.value + '</span>';
            learnCard.appendChild(bar);
        }
        wrap.appendChild(learnCard);

        // Empty state
        if (total === 0) {
            wrap.innerHTML += '<div class="empty-state"><i class="fa-solid fa-chart-line"></i><p>No games in this period.<br>Play some games to see stats!</p></div>';
        }

        screen.appendChild(wrap);
    }

    function calculateStreak(games) {
        if (!games.length) return 0;
        const sorted = [...games].sort((a, b) => new Date(b.played_at) - new Date(a.played_at));
        let streak = 0;
        for (const g of sorted) {
            if (g.result === 'win') streak++;
            else break;
        }
        return streak;
    }

    // ============================================================
    // Screen renderer registry
    // ============================================================
    const SCREEN_RENDERERS = {
        home: renderHome,
        play: renderPlay,
        game: renderGame,
        puzzles: renderPuzzles,
        learn: renderLearn,
        review: renderReview,
        stats: renderStats,
        login: renderLogin,
    };

    // ============================================================
    // Initialization
    // ============================================================
    function init() {
        SoundManager.init();
        buildNav();
        const route = (location.hash || '#/home').replace('#/', '');
        navigate(ROUTES.includes(route) ? route : 'home');
    }

    // Handle Android back button via hash navigation
    window.addEventListener('popstate', () => {
        const route = (location.hash || '#/home').replace('#/', '');
        if (route !== App.currentRoute) navigate(route);
    });

    // Save clock state on page hide
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && App.clock) App.clock.saveState();
    });
    window.addEventListener('beforeunload', () => {
        if (App.clock) App.clock.saveState();
    });

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
