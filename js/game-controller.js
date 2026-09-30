// ===== Game controller: orchestrates engine + clock + AI + persistence =====
// Wraps GameLogic with full draw detection (checkmate, stalemate, threefold
// repetition, fifty-move rule, insufficient material), chess clock, AI turns,
// in-progress save/resume, and undo/redo for practice mode.
class GameController {
    constructor(options = {}) {
        this.mode = options.mode || 'local';           // 'ai' | 'local' | 'practice'
        this.difficulty = options.difficulty || 'intermediate';
        this.playerColor = options.playerColor || 'white'; // human side in ai/practice
        this.timeControl = options.timeControl || '5+3';
        this.callbacks = options.callbacks || {};

        this.logic = new GameLogic();
        this.clock = null;
        this.isGameOver = false;
        this.result = null;          // 'win' | 'loss' | 'draw' (from player's perspective)
        this.endReason = null;       // 'checkmate' | 'stalemate' | 'repetition' | 'fifty' | 'material' | 'resign' | 'timeout' | 'draw_agreement'
        this.moveRecords = [];        // {from,to,promotion,san,captured,color}
        this.captured = { white: [], black: [] };
        this.positionCounts = {};
        this.halfmoveClock = 0;
        this._history = [];           // snapshots for undo
        this._future = [];            // snapshots for redo
        this._pendingPromotion = null;
        this._aiThinking = false;
        this._started = false;
    }

    // ---------- lifecycle ----------
    startNewGame() {
        this.logic = new GameLogic();
        this.isGameOver = false;
        this.result = null;
        this.endReason = null;
        this.moveRecords = [];
        this.captured = { white: [], black: [] };
        this.positionCounts = {};
        this.halfmoveClock = 0;
        this._history = [];
        this._future = [];
        this._pendingPromotion = null;
        this._aiThinking = false;
        this._recordPosition();
        this._started = true;

        if (this.clock) {
            this.clock.setSelectedControl(this.timeControl);
            this.clock.startGame();
        }
        if (this.callbacks.onGameStart) this.callbacks.onGameStart();
        this._emitState();
        this._saveState();
        this._maybeAiMove();
    }

    bindClock(clock) { this.clock = clock; }

    // ---------- move execution ----------
    // Returns true if the move was executed (or is pending promotion).
    makeMove(fromRow, fromCol, toRow, toCol, promotion = null) {
        if (this.isGameOver || this._aiThinking) return false;
        const piece = this.logic.getPieceAt(fromRow, fromCol);
        if (!piece) return false;

        const isPromotion = this.logic.isPawnPromotion(piece, toRow);
        if (isPromotion && !promotion) {
            // Ask the UI to show the promotion dialog first.
            this._pendingPromotion = { fromRow, fromCol, toRow, toCol };
            if (this.callbacks.onPromotionRequest) {
                this.callbacks.onPromotionRequest(fromRow, fromCol, toRow, toCol);
            }
            return 'pending';
        }
        return this._executeMove(fromRow, fromCol, toRow, toCol, promotion);
    }

    completePromotion(piece) {
        if (!this._pendingPromotion) return false;
        const p = this._pendingPromotion;
        this._pendingPromotion = null;
        return this._executeMove(p.fromRow, p.fromCol, p.toRow, p.toCol, piece);
    }

    cancelPromotion() {
        this._pendingPromotion = null;
        if (this.callbacks.onPromotionCancel) this.callbacks.onPromotionCancel();
    }

    _executeMove(fromRow, fromCol, toRow, toCol, promotion) {
        const piece = this.logic.getPieceAt(fromRow, fromCol);
        const color = this.logic.getPieceColor(piece);
        const captured = this.logic.getPieceAt(toRow, toCol);
        const isEnPassant = !captured && this.logic.getPieceType(piece) === 'P' && fromCol !== toCol;

        // Snapshot for undo (before applying)
        this._pushHistory();

        const san = ChessNotation.moveToSAN(this.logic, fromRow, fromCol, toRow, toCol, promotion);
        const ok = this.logic.makeMove(fromRow, fromCol, toRow, toCol, promotion);
        if (!ok) { this._history.pop(); return false; }

        // Track captured pieces (en passant pawn sits off-target)
        let capturedPiece = captured;
        if (isEnPassant) capturedPiece = this.logic.getPieceAt(fromRow, toCol) || 'bP';
        if (capturedPiece) {
            const victimColor = this.logic.getPieceColor(capturedPiece);
            this.captured[victimColor].push(capturedPiece);
        }

        this.moveRecords.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            promotion: promotion, san: san,
            captured: capturedPiece, color: color,
        });

        // Draw-rule bookkeeping
        if (this.logic.getPieceType(piece) === 'P' || capturedPiece) this.halfmoveClock = 0;
        else this.halfmoveClock++;
        this._recordPosition();

        // Clock
        if (this.clock && this._started) this.clock.onMoveCompleted(color);

        if (this.callbacks.onMoveMade) {
            this.callbacks.onMoveMade({
                from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol },
                promotion, san, captured: capturedPiece, color,
            });
        }

        this._checkGameEnd();
        this._emitState();
        this._saveState();
        this._maybeAiMove();
        return true;
    }

    // ---------- game end / draw rules ----------
    _checkGameEnd() {
        const toMove = this.logic.currentPlayer;

        if (this.logic.isCheckmate(toMove)) {
            const winner = this.logic.getOpponentColor(toMove);
            this._endGame('checkmate', winner);
            return;
        }
        if (this.logic.isStalemate(toMove)) {
            this._endGame('stalemate', null);
            return;
        }
        if (this._isThreefoldRepetition()) {
            this._endGame('repetition', null);
            return;
        }
        if (this.halfmoveClock >= 100) {
            this._endGame('fifty', null);
            return;
        }
        if (this._isInsufficientMaterial()) {
            this._endGame('material', null);
            return;
        }
    }

    _endGame(reason, winnerColor) {
        this.isGameOver = true;
        this.endReason = reason;
        if (this.clock) this.clock.stop();

        // Result from the human player's perspective
        if (reason === 'checkmate') {
            const playerWon = winnerColor === this.playerColor;
            this.result = playerWon ? 'win' : 'loss';
        } else if (reason === 'resign' || reason === 'timeout') {
            this.result = this._resignedOrTimedOutColor === this.playerColor ? 'loss' : 'win';
        } else {
            this.result = 'draw';
        }

        if (this.callbacks.onGameOver) {
            this.callbacks.onGameOver({
                reason, result: this.result,
                winner: winnerColor,
                moves: this.moveRecords,
            });
        }
        this._clearState();
    }

    resign() {
        if (this.isGameOver) return;
        this._resignedOrTimedOutColor = this.playerColor;
        if (this.clock) this.clock.forceStop();
        this._endGame('resign', this.logic.getOpponentColor(this.playerColor));
    }

    // Draw by agreement (local / practice modes)
    offerDraw() {
        if (this.callbacks.onDrawOffer) this.callbacks.onDrawOffer();
    }

    acceptDraw() {
        if (this.isGameOver) return;
        if (this.clock) this.clock.forceStop();
        this._endGame('draw_agreement', null);
    }

    handleTimeout(loserColor) {
        if (this.isGameOver) return;
        this._resignedOrTimedOutColor = loserColor;
        this._endGame('timeout', this.logic.getOpponentColor(loserColor));
    }

    // ---------- draw detection helpers ----------
    _positionKey() {
        let key = this.logic.currentPlayer === 'white' ? 'w' : 'b';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                key += this.logic.boardState[r][c] || '-';
            }
        }
        return key;
    }

    _recordPosition() {
        const key = this._positionKey();
        this.positionCounts[key] = (this.positionCounts[key] || 0) + 1;
    }

    _isThreefoldRepetition() {
        return (this.positionCounts[this._positionKey()] || 0) >= 3;
    }

    _isInsufficientMaterial() {
        const pieces = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.logic.boardState[r][c];
                if (p && this.logic.getPieceType(p) !== 'K') {
                    pieces.push({ type: this.logic.getPieceType(p), color: this.logic.getPieceColor(p), row: r, col: c });
                }
            }
        }
        if (pieces.length === 0) return true;                       // K vs K
        if (pieces.length === 1 && (pieces[0].type === 'B' || pieces[0].type === 'N')) return true;
        if (pieces.length === 2 &&
            pieces[0].type === 'B' && pieces[1].type === 'B' &&
            pieces[0].color !== pieces[1].color &&
            (pieces[0].row + pieces[0].col) % 2 === (pieces[1].row + pieces[1].col) % 2) return true;
        return false;
    }

    // ---------- AI ----------
    _maybeAiMove() {
        if (!this._started || this.isGameOver) return;
        if (this.mode !== 'ai' && this.mode !== 'practice') return;
        if (this.logic.currentPlayer === this.playerColor) return;

        this._aiThinking = true;
        if (this.callbacks.onAiThinking) this.callbacks.onAiThinking(true);

        const delay = 350 + Math.random() * 400;
        setTimeout(() => {
            if (this.isGameOver || !this._started) { this._aiThinking = false; return; }
            const aiColor = this.logic.currentPlayer;
            const move = gameAI.findBestMoveForDifficulty(this.logic, aiColor, this.difficulty);
            this._aiThinking = false;
            if (!move) return;
            if (this.callbacks.onAiThinking) this.callbacks.onAiThinking(false);
            this._executeMove(move.from.row, move.from.col, move.to.row, move.to.col, null);
        }, delay);
    }

    // ---------- undo / redo (practice mode) ----------
    canUndo() { return this._history.length > 0 && !this._aiThinking; }
    canRedo() { return this._future.length > 0 && !this._aiThinking; }

    undo() {
        if (!this.canUndo()) return false;
        // In AI modes, roll back to the player's turn (up to 2 plies)
        let steps = 1;
        if (this.mode !== 'local' && this._history.length >= 2) {
            const lastRecord = this.moveRecords[this.moveRecords.length - 1];
            if (lastRecord && lastRecord.color !== this.playerColor) steps = 2;
        }
        for (let i = 0; i < steps && this._history.length; i++) {
            this._future.push(this._snapshot());
            this._restore(this._history.pop());
        }
        this._afterHistoryChange();
        return true;
    }

    redo() {
        if (!this.canRedo()) return false;
        let steps = 1;
        if (this.mode !== 'local' && this._future.length >= 2) {
            const nextRecord = this._future[this._future.length - 1].moveRecords.slice(-1)[0];
            if (nextRecord && nextRecord.color !== this.playerColor) steps = 2;
        }
        for (let i = 0; i < steps && this._future.length; i++) {
            this._history.push(this._snapshot());
            this._restore(this._future.pop());
        }
        this._afterHistoryChange();
        return true;
    }

    _afterHistoryChange() {
        this.isGameOver = false;
        this.result = null;
        this.endReason = null;
        if (this.clock) this.clock.reset();
        if (this.callbacks.onStateChange) this.callbacks.onStateChange();
        this._emitState();
        this._saveState();
    }

    _snapshot() {
        return {
            boardState: JSON.parse(JSON.stringify(this.logic.boardState)),
            currentPlayer: this.logic.currentPlayer,
            moveRecords: JSON.parse(JSON.stringify(this.moveRecords)),
            captured: JSON.parse(JSON.stringify(this.captured)),
            positionCounts: JSON.parse(JSON.stringify(this.positionCounts)),
            halfmoveClock: this.halfmoveClock,
            isGameOver: this.isGameOver,
            result: this.result,
            endReason: this.endReason,
            whiteTime: this.clock ? this.clock.whiteTime : 0,
            blackTime: this.clock ? this.clock.blackTime : 0,
        };
    }

    _restore(snap) {
        this.logic.boardState = JSON.parse(JSON.stringify(snap.boardState));
        this.logic.currentPlayer = snap.currentPlayer;
        this.logic.moveHistory = snap.moveRecords.map(m => ({
            piece: this.logic.boardState[m.to.row][m.to.col] || 'wP',
            from: { fromRow: m.from.row, fromCol: m.from.col },
            to: { toRow: m.to.row, toCol: m.to.col },
            captured: m.captured, promotion: m.promotion,
        }));
        this.moveRecords = JSON.parse(JSON.stringify(snap.moveRecords));
        this.captured = JSON.parse(JSON.stringify(snap.captured));
        this.positionCounts = JSON.parse(JSON.stringify(snap.positionCounts));
        this.halfmoveClock = snap.halfmoveClock;
        this.isGameOver = snap.isGameOver;
        this.result = snap.result;
        this.endReason = snap.endReason;
        if (this.clock) {
            this.clock.whiteTime = snap.whiteTime;
            this.clock.blackTime = snap.blackTime;
            this.clock._render();
        }
    }

    _pushHistory() {
        this._history.push(this._snapshot());
        if (this._history.length > 100) this._history.shift();
        this._future = [];
    }

    // ---------- persistence ----------
    _saveState() {
        if (this.isGameOver || !this._started) return;
        DB.saveInProgress({
            mode: this.mode,
            difficulty: this.difficulty,
            playerColor: this.playerColor,
            timeControl: this.timeControl,
            boardState: this.logic.boardState,
            currentPlayer: this.logic.currentPlayer,
            moveRecords: this.moveRecords,
            captured: this.captured,
            positionCounts: this.positionCounts,
            halfmoveClock: this.halfmoveClock,
            savedAt: new Date().toISOString(),
        });
    }

    loadState(state) {
        this.mode = state.mode || 'local';
        this.difficulty = state.difficulty || 'intermediate';
        this.playerColor = state.playerColor || 'white';
        this.timeControl = state.timeControl || '5+3';
        this.logic.boardState = state.boardState;
        this.logic.currentPlayer = state.currentPlayer;
        this.moveRecords = state.moveRecords || [];
        this.captured = state.captured || { white: [], black: [] };
        this.positionCounts = state.positionCounts || {};
        this.halfmoveClock = state.halfmoveClock || 0;
        this.isGameOver = false;
        this.result = null;
        this._history = [];
        this._future = [];
        this._started = true;
        if (this.clock) {
            this.clock.setSelectedControl(this.timeControl);
            this.clock.reset();
        }
        if (this.callbacks.onGameStart) this.callbacks.onGameStart();
        this._emitState();
        this._maybeAiMove();
    }

    _clearState() {
        DB.clearInProgress();
        // Persist the completed game to the user's history
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn() && this.moveRecords.length > 0) {
            const opponentType = (this.mode === 'ai' || this.mode === 'practice') ? 'ai' : 'human';
            DB.addGame(Auth.currentUser.id, opponentType, this.result || 'draw',
                this.moveRecords.map(m => m.san).join(' '), {
                    time_control: this.timeControl,
                    difficulty: this.mode === 'ai' ? this.difficulty : null,
                    mode: this.mode,
                });
        }
    }

    // ---------- state emission ----------
    _emitState() {
        if (!this.callbacks.onStateChange) return;
        const toMove = this.logic.currentPlayer;
        this.callbacks.onStateChange({
            boardState: this.logic.boardState,
            currentPlayer: toMove,
            isGameOver: this.isGameOver,
            inCheck: this.logic.isInCheck(toMove),
            lastMove: this.moveRecords.length ? {
                from: this.moveRecords[this.moveRecords.length - 1].from,
                to: this.moveRecords[this.moveRecords.length - 1].to,
            } : null,
            captured: this.captured,
            moveRecords: this.moveRecords,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
        });
    }

    getLegalMovesFor(row, col) {
        return this.logic.getValidMoves(row, col);
    }

    destroy() {
        this._started = false;
        if (this.clock) this.clock.forceStop();
    }
}

window.GameController = GameController;
