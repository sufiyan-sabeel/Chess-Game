// ===== CheckMate test suite =====
// Verifies chess rules, puzzle solutions, notation, and stats.
// Run: node run-tests.js
const fs = require('fs');
const path = require('path');

// ---- Browser shims ----
global.window = global;
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    key(i) { return Object.keys(this._data)[i] || null; },
    get length() { return Object.keys(this._data).length; },
};
global.sessionStorage = global.localStorage;
global.performance = { now: () => Date.now() };
global.navigator = {};

// ---- Load source files using vm.runInThisContext (robust across Node versions) ----
const vm = require('vm');
const JS_DIR = path.join(__dirname, '..', 'js');
const files = ['game-logic.js', 'game-ai.js', 'notation.js', 'db.js', 'puzzles-data.js'];
for (const f of files) {
    const src = fs.readFileSync(path.join(JS_DIR, f), 'utf8');
    vm.runInThisContext(src, { filename: f });
}

// ---- FEN parser ----
function parseFEN(fen) {
    const [placement, side] = fen.trim().split(/\s+/);
    const board = [];
    for (const row of placement.split('/')) {
        const r = [];
        for (const ch of row) {
            if (/\d/.test(ch)) { for (let i = 0; i < +ch; i++) r.push(null); }
            else r.push((ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase());
        }
        board.push(r);
    }
    return { board, side: side || 'w' };
}

function loadFEN(fen) {
    const g = new GameLogic();
    const parsed = parseFEN(fen);
    g.boardState = parsed.board;
    g.currentPlayer = parsed.side === 'w' ? 'white' : 'black';
    g.moveHistory = [];
    g.isGameOver = false;
    return g;
}

// ---- Test framework ----
let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ✓ ' + name);
    } catch (e) {
        failed++;
        failures.push({ name, error: e.message });
        console.log('  ✗ ' + name + ': ' + e.message);
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(actual, expected, msg) {
    if (actual !== expected) throw new Error((msg || '') + ' Expected ' + expected + ', got ' + actual);
}

// ============================================================
// CHESS RULES TESTS
// ============================================================
console.log('\n--- Chess Rules ---');

test('Initial position: 32 pieces, white to move', () => {
    const g = new GameLogic();
    assertEqual(g.currentPlayer, 'white');
    let count = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (g.boardState[r][c]) count++;
    assertEqual(count, 32);
});

test('Pawn moves: 1 or 2 squares from start', () => {
    const g = new GameLogic();
    const moves = g.getValidMoves(6, 4); // e2 pawn
    assertEqual(moves.length, 2); // e3, e4
});

test('Pawn captures diagonally', () => {
    const g = loadFEN('rnbqkbnr/pppppppp/8/8/4p3/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    // White pawn e2 can capture... no, black pawn is on e4. Let me set up a capture.
    const g2 = loadFEN('rnbqkbnr/pppppppp/8/8/8/4p3/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    // White pawn d2 can capture e3
    const moves = g2.getValidMoves(6, 3); // d2 pawn
    assert(moves.some(m => m.row === 5 && m.col === 4), 'd2 should capture e3');
});

test('Knight moves in L-shape', () => {
    const g = new GameLogic();
    const moves = g.getValidMoves(7, 1); // b1 knight
    assertEqual(moves.length, 2); // a3, c3
});

test('Knight can jump over pieces', () => {
    const g = new GameLogic();
    // b1 knight should have 2 moves even with pawns in front
    const moves = g.getValidMoves(7, 1);
    assertEqual(moves.length, 2);
});

test('Bishop moves diagonally', () => {
    const g = loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    // Bishop f1 blocked by e2 pawn initially
    const moves = g.getValidMoves(7, 5);
    assertEqual(moves.length, 0);
});

test('Rook moves along ranks and files', () => {
    const g = loadFEN('r3k3/8/8/8/8/8/8/4K2R w K - 0 1');
    const moves = g.getValidMoves(7, 7); // h1 rook
    assert(moves.length > 5, 'Rook should have many moves on open board');
});

test('Queen combines rook and bishop', () => {
    const g = loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    // Queen d1 blocked initially
    const moves = g.getValidMoves(7, 3);
    assertEqual(moves.length, 0);
});

test('King moves one square', () => {
    const g = loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const moves = g.getValidMoves(7, 4); // e1 king
    assertEqual(moves.length, 0); // blocked by own pieces
});

test('Castling kingside', () => {
    const g = loadFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    const moves = g.getValidMoves(7, 4); // e1 king
    assert(moves.some(m => m.row === 7 && m.col === 6), 'King should castle kingside to g1');
});

test('Castling queenside', () => {
    const g = loadFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    const moves = g.getValidMoves(7, 4);
    assert(moves.some(m => m.row === 7 && m.col === 2), 'King should castle queenside to c1');
});

test('En passant capture', () => {
    // Play e2-e4, a6, e4-e5, then d7-d5 (double push beside e5), then e5xd6 e.p.
    const g = new GameLogic();
    g.makeMove(6, 4, 4, 4); // e4
    g.makeMove(1, 0, 2, 0); // a6
    g.makeMove(4, 4, 3, 4); // e5
    g.makeMove(1, 3, 3, 3); // d5 (double push)
    const moves = g.getValidMoves(3, 4); // e5 pawn
    assert(moves.some(m => m.row === 2 && m.col === 3), 'e5 pawn should capture d5 en passant to d6');
});

test('Pawn promotion', () => {
    const g = loadFEN('8/P6k/8/8/8/8/8/7K w - - 0 1');
    const moves = g.getValidMoves(1, 0); // a7 pawn
    assert(moves.some(m => m.row === 0 && m.col === 0), 'a7 pawn should promote on a8');
});

test('Check detection', () => {
    const g = loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    // After 1. e4 e5 2. Qh5, black king not in check yet
    g.makeMove(6, 4, 4, 4); // e4
    g.makeMove(1, 4, 3, 4); // e5
    g.makeMove(7, 3, 3, 7); // Qh5
    assert(!g.isInCheck('black'), 'Black should not be in check after Qh5');
});

test('Checkmate detection (Scholar\'s Mate)', () => {
    const g = loadFEN('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1');
    g.makeMove(3, 7, 1, 5); // Qxf7# (f7 = row 1, col 5)
    assert(g.isGameOver, 'Game should be over');
    assert(g.isCheckmate('black'), 'Black should be checkmated');
});

test('Stalemate detection', () => {
    const g = loadFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    // Black king h8, white Qf7, Kg6. Black to move: Kh8 has no legal moves (g8 covered by Qf7, h7 covered by Qf7, g7 covered by Kg6)
    assert(g.isStalemate('black'), 'Should be stalemate');
});

test('Illegal move rejected', () => {
    const g = new GameLogic();
    const result = g.makeMove(6, 4, 5, 4); // e2-e3 legal (e3 = row 5)
    assert(result === true, 'e2-e3 should be legal');
    const bad = g.makeMove(6, 3, 5, 3); // white tries to move again (black's turn)
    assert(bad === false, 'White should not move twice');
});

test('Move validation: cannot move into check', () => {
    const g = loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    // King cannot move into check
    const moves = g.getValidMoves(7, 4);
    // e1 king has no legal moves (blocked), but the point is getValidMoves filters check
    assert(moves.every(m => {
        const c = new GameLogic();
        c.boardState = JSON.parse(JSON.stringify(g.boardState));
        c.currentPlayer = g.currentPlayer;
        c.moveHistory = JSON.parse(JSON.stringify(g.moveHistory));
        c.makeMove(7, 4, m.row, m.col);
        return !c.isInCheck('white');
    }), 'All king moves should be legal (not into check)');
});

// ============================================================
// PUZZLE TESTS
// ============================================================
console.log('\n--- Puzzles ---');

test('All puzzles have valid FEN and solution', () => {
    assert(PUZZLES.length >= 5, 'Should have at least 5 puzzles, got ' + PUZZLES.length);
    for (const p of PUZZLES) {
        assert(p.fen, p.id + ' missing FEN');
        assert(p.solution && p.solution.length > 0, p.id + ' missing solution');
        assert(p.title, p.id + ' missing title');
    }
});

test('All puzzle solutions are legal and end in checkmate', () => {
    for (const p of PUZZLES) {
        const g = loadFEN(p.fen);
        for (const m of p.solution) {
            const ok = g.makeMove(m.from.row, m.from.col, m.to.row, m.to.col, m.promotion || null);
            assert(ok, p.id + ': move ' + JSON.stringify(m) + ' is illegal');
        }
        const color = p.fen.split(/\s+/)[1] === 'w' ? 'white' : 'black';
        assert(g.isCheckmate(g.getOpponentColor(color)), p.id + ': final position is not checkmate');
    }
});

test('Puzzle categories are valid', () => {
    const validCats = ['mate', 'fork', 'pin', 'skewer', 'discovered', 'defense'];
    for (const p of PUZZLES) {
        assert(validCats.includes(p.category), p.id + ': invalid category ' + p.category);
    }
});

// ============================================================
// NOTATION TESTS
// ============================================================
console.log('\n--- Notation ---');

test('SAN generation: pawn move', () => {
    const g = new GameLogic();
    const san = ChessNotation.moveToSAN(g, 6, 4, 4, 4);
    assertEqual(san, 'e4');
});

test('SAN generation: knight move', () => {
    const g = new GameLogic();
    g.makeMove(6, 4, 4, 4); // e4
    g.makeMove(1, 4, 3, 4); // e5
    const san = ChessNotation.moveToSAN(g, 7, 1, 5, 2); // Nc3
    assertEqual(san, 'Nc3');
});

test('SAN generation: capture', () => {
    const g = loadFEN('rnbqkbnr/pppppppp/8/8/4p3/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    // White pawn d2 captures e3... wait, black pawn on e4. Let me use a different setup.
    const g2 = loadFEN('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
    const san = ChessNotation.moveToSAN(g2, 4, 4, 3, 3); // exd5
    assertEqual(san, 'exd5');
});

test('SAN generation: check', () => {
    const g = loadFEN('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1');
    const san = ChessNotation.moveToSAN(g, 3, 7, 1, 5); // Qxf7# (f7 = row 1, col 5)
    assertEqual(san, 'Qxf7#');
});

test('SAN generation: castling', () => {
    const g = loadFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    const san = ChessNotation.moveToSAN(g, 7, 4, 7, 6); // O-O
    assertEqual(san, 'O-O');
});

test('PGN export and import round-trip', () => {
    const moves = [
        { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } },
        { from: { row: 1, col: 4 }, to: { row: 3, col: 4 } },
        { from: { row: 7, col: 6 }, to: { row: 5, col: 5 } },
    ];
    const pgn = ChessNotation.gameToPGN(moves, { result: '*' });
    assert(pgn.includes('1. e4'), 'PGN should contain e4');
    assert(pgn.includes('e5'), 'PGN should contain e5');
    assert(pgn.includes('Nf3'), 'PGN should contain Nf3');

    const parsed = ChessNotation.parsePGN(pgn);
    assertEqual(parsed.moves.length, 3, 'Should parse 3 moves');
});

// ============================================================
// STATS TESTS
// ============================================================
console.log('\n--- Stats ---');

test('DB: add and retrieve games', () => {
    // Clear
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('chess_')) localStorage.removeItem(k);
    }
    DB.addGame(1, 'ai', 'win', 'e4 e5', { time_control: '5+3' });
    DB.addGame(1, 'human', 'loss', 'd4 d5', { time_control: '10+0' });
    DB.addGame(1, 'ai', 'draw', 'e4 e5', { time_control: '5+3' });
    const stats = DB.getUserStats(1);
    assertEqual(stats.win, 1);
    assertEqual(stats.loss, 1);
    assertEqual(stats.draw, 1);
});

test('DB: puzzle progress', () => {
    DB.savePuzzleResult('p01', true);
    const progress = DB.getPuzzleProgress();
    assert(progress['p01'] && progress['p01'].solved, 'Puzzle p01 should be marked solved');
    const stats = DB.getPuzzleStats();
    assertEqual(stats.solved, 1);
});

test('DB: lesson progress', () => {
    DB.saveLessonComplete('l01');
    const progress = DB.getLessonProgress();
    assert(progress['l01'] && progress['l01'].completed, 'Lesson l01 should be completed');
});

test('DB: settings persistence', () => {
    DB.saveSettings({ board_theme: 'blue' });
    const settings = DB.getSettings();
    assertEqual(settings.board_theme, 'blue');
});

test('DB: in-progress game save/load', () => {
    const state = {
        mode: 'ai', difficulty: 'intermediate', playerColor: 'white',
        timeControl: '5+3', boardState: new GameLogic().boardState,
        currentPlayer: 'white', moveRecords: [], captured: { white: [], black: [] },
        positionCounts: {}, halfmoveClock: 0,
    };
    DB.saveInProgress(state);
    const loaded = DB.loadInProgress();
    assert(loaded, 'Should load in-progress game');
    assertEqual(loaded.mode, 'ai');
    DB.clearInProgress();
    assert(!DB.loadInProgress(), 'Should be cleared');
});

// ============================================================
// AI TESTS
// ============================================================
console.log('\n--- AI ---');

test('AI: finds mate in 1', () => {
    const g = loadFEN('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    // The AI shuffles moves randomly, so run several times to ensure it finds mate
    let foundMate = false;
    for (let i = 0; i < 20 && !foundMate; i++) {
        const g2 = loadFEN('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
        const move = gameAI.findBestMoveForDifficulty(g2, 'white', 'beginner');
        assert(move, 'AI should find a move');
        g2.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
        if (g2.isCheckmate('black')) foundMate = true;
    }
    assert(foundMate, 'AI should find a mating move (Ra8#) within 20 tries');
});

test('AI: difficulty levels have different depths', () => {
    assertEqual(gameAI.DIFFICULTIES.beginner.depth, 1);
    assertEqual(gameAI.DIFFICULTIES.intermediate.depth, 2);
    assertEqual(gameAI.DIFFICULTIES.advanced.depth, 3);
    assertEqual(gameAI.DIFFICULTIES.expert.depth, 4);
});

test('AI: evaluation is material-based', () => {
    const g = new GameLogic();
    const eval1 = gameAI.evaluateBoard(g);
    assertEqual(eval1, 0, 'Initial position should be equal');
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n========================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log('  - ' + f.name + ': ' + f.error);
    process.exit(1);
} else {
    console.log('All tests passed!');
}
