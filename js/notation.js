// ===== Chess notation: SAN generation, PGN export/import =====
// Depends on GameLogic (global). All functions operate on a GameLogic instance.
const ChessNotation = {
    FILES: 'abcdefgh',

    squareName(row, col) { return this.FILES[col] + (8 - row); },

    parseSquare(name) {
        if (!name || name.length < 2) return null;
        const col = this.FILES.indexOf(name[0]);
        const row = 8 - parseInt(name[1], 10);
        if (col < 0 || row < 0 || row > 7) return null;
        return { row, col };
    },

    // Generate SAN for a move, given the position BEFORE the move is applied.
    moveToSAN(logic, fromRow, fromCol, toRow, toCol, promotion = null) {
        const piece = logic.getPieceAt(fromRow, fromCol);
        if (!piece) return null;
        const type = logic.getPieceType(piece);
        const color = logic.getPieceColor(piece);
        const dest = this.squareName(toRow, toCol);
        const isCapture = !!logic.getPieceAt(toRow, toCol) ||
            (type === 'P' && fromCol !== toCol); // en passant

        let san = '';

        // Castling
        if (type === 'K' && Math.abs(fromCol - toCol) === 2) {
            san = toCol > fromCol ? 'O-O' : 'O-O-O';
        } else {
            if (type !== 'P') {
                san += type;
                san += this._disambiguation(logic, fromRow, fromCol, toRow, toCol, type, color);
            } else if (isCapture) {
                san += this.FILES[fromCol]; // pawn captures include origin file
            }
            if (isCapture) san += 'x';
            san += dest;
            if (promotion) san += '=' + promotion;
        }

        // Check / mate suffix: apply the move on a clone and inspect.
        const clone = this._cloneForSAN(logic);
        clone.makeMove(fromRow, fromCol, toRow, toCol, promotion);
        const opponent = logic.getOpponentColor(color);
        if (clone.isInCheck(opponent)) {
            san += clone.isCheckmate(opponent) ? '#' : '+';
        }
        return san;
    },

    // Standard SAN disambiguation: file, rank, or full square as needed.
    _disambiguation(logic, fromRow, fromCol, toRow, toCol, type, color) {
        const others = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (r === fromRow && c === fromCol) continue;
                const p = logic.getPieceAt(r, c);
                if (p && logic.getPieceType(p) === type && logic.getPieceColor(p) === color) {
                    const moves = logic.getValidMoves(r, c);
                    if (moves.some(m => m.row === toRow && m.col === toCol)) others.push({ row: r, col: c });
                }
            }
        }
        if (others.length === 0) return '';
        const sameFile = others.some(o => o.col === fromCol);
        const sameRank = others.some(o => o.row === fromRow);
        if (!sameFile) return this.FILES[fromCol];
        if (!sameRank) return String(8 - fromRow);
        return this.squareName(fromRow, fromCol);
    },

    _cloneForSAN(logic) {
        const clone = new GameLogic();
        clone.boardState = JSON.parse(JSON.stringify(logic.boardState));
        clone.currentPlayer = logic.currentPlayer;
        clone.moveHistory = JSON.parse(JSON.stringify(logic.moveHistory));
        clone.isGameOver = logic.isGameOver;
        return clone;
    },

    // Parse a SAN string into a move for the current position, or null.
    sanToMove(logic, san) {
        if (!san) return null;
        const clean = san.replace(/[+#!?]+$/,'').trim();
        const moves = this._allLegalMovesWithSAN(logic);
        // Exact match first
        let matches = moves.filter(m => m.san === clean);
        if (matches.length === 0) {
            // Tolerate promotion written without '=' (e.g. "e8Q" vs "e8=Q")
            matches = moves.filter(m => m.san.replace('=', '') === clean.replace('=', ''));
        }
        return matches.length === 1 ? matches[0] : null;
    },

    _allLegalMovesWithSAN(logic) {
        const result = [];
        const color = logic.currentPlayer;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = logic.getPieceAt(r, c);
                if (!piece || logic.getPieceColor(piece) !== color) continue;
                const validMoves = logic.getValidMoves(r, c);
                for (const m of validMoves) {
                    let promotion = null;
                    if (logic.getPieceType(piece) === 'P' && (m.row === 0 || m.row === 7)) {
                        promotion = 'Q'; // default; PGN import always promotes to queen unless specified
                    }
                    const san = this.moveToSAN(logic, r, c, m.row, m.col, promotion);
                    result.push({ from: { row: r, col: c }, to: { row: m.row, col: m.col }, promotion, san });
                }
            }
        }
        return result;
    },

    // Build a PGN string from a list of move records.
    // moves: [{ from:{row,col}, to:{row,col}, promotion }] in order.
    gameToPGN(moves, metadata = {}) {
        const headers = [
            '[Event "' + (metadata.event || 'CheckMate Game') + '"]',
            '[Site "CheckMate App"]',
            '[Date "' + (metadata.date || new Date().toISOString().slice(0, 10)) + '"]',
            '[White "' + (metadata.white || 'Player') + '"]',
            '[Black "' + (metadata.black || 'Computer') + '"]',
            '[Result "' + (metadata.result || '*') + '"]',
        ];
        if (metadata.time_control) headers.push('[TimeControl "' + metadata.time_control + '"]');

        // Replay to build numbered SAN movetext.
        const logic = new GameLogic();
        let body = '';
        let moveNum = 1;
        for (let i = 0; i < moves.length; i++) {
            const mv = moves[i];
            const san = this.moveToSAN(logic, mv.from.row, mv.from.col, mv.to.row, mv.to.col, mv.promotion);
            if (!san) break;
            if (logic.currentPlayer === 'white') {
                body += moveNum + '. ';
                moveNum++;
            }
            body += san + ' ';
            logic.makeMove(mv.from.row, mv.from.col, mv.to.row, mv.to.col, mv.promotion);
        }
        body += metadata.result || '*';
        return headers.join('\n') + '\n\n' + body.trim() + '\n';
    },

    // Parse a PGN string. Returns { moves: [...], metadata: {...} } or throws.
    parsePGN(pgn) {
        if (!pgn || typeof pgn !== 'string') throw new Error('Empty PGN.');

        const metadata = {};
        const movetext = [];
        const lines = pgn.split(/\r?\n/);
        let inHeaders = true;

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) { inHeaders = false; continue; }
            if (line.startsWith('[') && line.endsWith(']')) {
                const m = line.match(/^\[(\w+)\s+"(.*)"\]$/);
                if (m) metadata[m[1].toLowerCase()] = m[2];
                continue;
            }
            inHeaders = false;
            // Strip comments {…} and variations (…)
            let cleaned = line.replace(/\{[^}]*\}/g, ' ').replace(/\([^)]*\)/g, ' ');
            // Strip move numbers and result tokens
            cleaned = cleaned.replace(/\b\d+\.+/g, ' ').replace(/1-0|0-1|1\/2-1\/2|\*/g, ' ');
            for (const token of cleaned.split(/\s+/)) {
                if (token) movetext.push(token);
            }
        }

        const logic = new GameLogic();
        const moves = [];
        for (const token of movetext) {
            const move = this.sanToMove(logic, token);
            if (!move) throw new Error('Could not parse move: "' + token + '"');
            moves.push({
                from: move.from, to: move.to, promotion: move.promotion,
            });
            logic.makeMove(move.from.row, move.from.col, move.to.row, move.to.col, move.promotion);
        }
        return { moves, metadata };
    },
};

window.ChessNotation = ChessNotation;
