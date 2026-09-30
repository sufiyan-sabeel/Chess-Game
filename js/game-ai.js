const gameAI = {
    pieceValues: { 'P': 10, 'N': 30, 'B': 30, 'R': 50, 'Q': 90, 'K': 900 },

    // Piece-square tables (from white's perspective, row 0 = rank 8).
    // Encourage central control, knight/bishop development, pawn advancement.
    PST: {
        P: [
            [ 0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [ 5,  5, 10, 25, 25, 10,  5,  5],
            [ 0,  0,  0, 20, 20,  0,  0,  0],
            [ 5, -5,-10,  0,  0,-10, -5,  5],
            [ 5, 10, 10,-20,-20, 10, 10,  5],
            [ 0,  0,  0,  0,  0,  0,  0,  0],
        ],
        N: [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50],
        ],
        B: [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  5,  0,  0,  5,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20],
        ],
        R: [
            [ 0,  0,  0,  0,  0,  0,  0,  0],
            [ 5, 10, 10, 10, 10, 10, 10,  5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [ 0,  0,  0,  5,  5,  0,  0,  0],
        ],
        Q: [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [ -5,  0,  5,  5,  5,  5,  0, -5],
            [  0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20],
        ],
        K: [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [ 20, 20,  0,  0,  0,  0, 20, 20],
            [ 20, 30, 10,  0,  0, 10, 30, 20],
        ],
    },

    // Difficulty presets map to real search depths.
    DIFFICULTIES: {
        beginner:     { depth: 1, randomness: 0.35, label: 'Beginner' },
        intermediate: { depth: 2, randomness: 0.08, label: 'Intermediate' },
        advanced:     { depth: 3, randomness: 0.0,  label: 'Advanced' },
        expert:       { depth: 4, randomness: 0.0,  label: 'Expert' },
    },

    // Static evaluation from BLACK's perspective (positive = good for black).
    // Combines material count with piece-square positional bonuses.
    evaluateBoard: function(logic) {
        let totalScore = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = logic.getPieceAt(row, col);
                if (!piece) continue;
                const type = logic.getPieceType(piece);
                const isBlack = logic.getPieceColor(piece) === 'black';
                const material = this.pieceValues[type];
                // PST rows are written from white's perspective (row 0 = rank 8).
                const pstRow = isBlack ? row : 7 - row;
                const positional = (this.PST[type] || [])[pstRow][col] || 0;
                const score = (material + positional) / 10;
                totalScore += isBlack ? score : -score;
            }
        }
        return totalScore;
    },

    findBestMove: function(logic) {
        let bestMove = null;
        let bestValue = -Infinity;
        const allMoves = this.getAllPossibleMoves(logic, 'black');
        if (allMoves.length === 0) return null;
        this.shuffleArray(allMoves);

        for (const move of allMoves) {
            const tempLogic = this.cloneLogic(logic);
            tempLogic.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
            const boardValue = this.evaluateBoard(tempLogic);
            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        }
        return bestMove || allMoves[0];
    },

    // Negamax with alpha-beta pruning. `color` is the side to move.
    // Returns { score, move } where score is from `color`'s perspective.
    _search: function(logic, depth, alpha, beta, color) {
        if (depth === 0) {
            const evalScore = this.evaluateBoard(logic);
            return { score: color === 'black' ? evalScore : -evalScore, move: null };
        }

        const moves = this.getAllPossibleMoves(logic, color);
        if (moves.length === 0) {
            // Checkmate or stalemate: side to move has no moves.
            if (logic.isInCheck(color)) {
                // Mated: very bad for the side to move. Prefer faster mates.
                return { score: -100000 - depth, move: null };
            }
            return { score: 0, move: null }; // stalemate
        }

        let bestMove = null;
        for (const move of moves) {
            const tempLogic = this.cloneLogic(logic);
            tempLogic.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
            const result = this._search(tempLogic, depth - 1, alpha, beta, logic.getOpponentColor(color));
            const score = -result.score;
            if (score > alpha) {
                alpha = score;
                bestMove = move;
            }
            if (alpha >= beta) break; // beta cutoff
        }
        return { score: alpha, move: bestMove };
    },

    // Find the best move for `color` at a given search depth.
    // randomness: probability of picking a random legal move instead (weaker play).
    findBestMoveAtDepth: function(logic, color, depth, randomness = 0) {
        const moves = this.getAllPossibleMoves(logic, color);
        if (moves.length === 0) return null;

        if (randomness > 0 && Math.random() < randomness) {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        this.shuffleArray(moves);
        let bestMove = null;
        let bestScore = -Infinity;
        for (const move of moves) {
            const tempLogic = this.cloneLogic(logic);
            tempLogic.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
            // Immediate checkmate is the best possible outcome
            if (tempLogic.isCheckmate(logic.getOpponentColor(color))) return move;
            const result = this._search(tempLogic, depth - 1, -Infinity, Infinity, logic.getOpponentColor(color));
            const score = -result.score;
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        return bestMove || moves[0];
    },

    // Convenience: pick a move for a named difficulty preset.
    findBestMoveForDifficulty: function(logic, color, difficultyKey) {
        const preset = this.DIFFICULTIES[difficultyKey] || this.DIFFICULTIES.intermediate;
        return this.findBestMoveAtDepth(logic, color, preset.depth, preset.randomness);
    },

    getAllPossibleMoves: function(logic, color) {
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = logic.getPieceAt(r, c);
                if (piece && logic.getPieceColor(piece) === color) {
                    const originalPlayer = logic.currentPlayer;
                    logic.currentPlayer = color;
                    const validMoves = logic.getValidMoves(r, c);
                    logic.currentPlayer = originalPlayer;
                    validMoves.forEach(move => moves.push({ from: { row: r, col: c }, to: { row: move.row, col: move.col } }));
                }
            }
        }
        return moves;
    },

    cloneLogic: function(logic) {
        const newLogic = new GameLogic();
        newLogic.boardState = JSON.parse(JSON.stringify(logic.boardState));
        newLogic.currentPlayer = logic.currentPlayer;
        newLogic.moveHistory = JSON.parse(JSON.stringify(logic.moveHistory));
        newLogic.isGameOver = logic.isGameOver;
        return newLogic;
    },

    shuffleArray: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};

window.gameAI = gameAI;
