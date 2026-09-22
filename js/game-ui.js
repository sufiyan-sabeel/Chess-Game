class GameUI {
    constructor() {
        this.logic = new GameLogic();
        this.boardElement = document.getElementById('chessboard');
        this.statusElement = document.getElementById('status-area');
        this.gameMode = 'hotseat';
        this.selectedPiece = null;
        this.highlightedSquares = [];
        this.moveHistoryString = '';

        this.clock = null;

        this.pieceMap = {
            'wK': 'fa-chess-king', 'wQ': 'fa-chess-queen', 'wR': 'fa-chess-rook', 'wB': 'fa-chess-bishop', 'wN': 'fa-chess-knight', 'wP': 'fa-chess-pawn',
            'bK': 'fa-chess-king', 'bQ': 'fa-chess-queen', 'bR': 'fa-chess-rook', 'bB': 'fa-chess-bishop', 'bN': 'fa-chess-knight', 'bP': 'fa-chess-pawn',
        };
    }

    initialize(gameMode) {
        this.gameMode = gameMode;
        this.createBoard();
        this.renderBoard();
        this.attachEventListeners();
        this.updateStatus();
        this._initClock();
    }

    _initClock() {
        if (typeof ChessClock === 'undefined') return;
        this.clock = new ChessClock();
        this.clock.bindDOM('clock-white', 'clock-black', 'label-white', 'label-black');
        this.clock.setOnTimeout((loser) => this.handleTimeout(loser));

        const restored = this.clock.restoreState();
        if (!restored) {
            this.clock.reset();
        }
    }

    createBoard() {
        this.boardElement.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.dataset.row = row;
                square.dataset.col = col;
                square.classList.add('flex', 'items-center', 'justify-center', 'w-full', 'h-full', 'aspect-square');
                square.classList.add((row + col) % 2 === 0 ? 'bg-gray-400' : 'bg-gray-700');
                this.boardElement.appendChild(square);
            }
        }
    }

    renderBoard() {
        const squares = this.boardElement.children;
        for (let i = 0; i < squares.length; i++) {
            const square = squares[i];
            square.innerHTML = '';
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.logic.getPieceAt(row, col);
            if (piece) {
                const icon = document.createElement('i');
                icon.classList.add('fa-solid', this.pieceMap[piece], 'text-4xl', 'md:text-5xl', 'cursor-pointer');
                icon.classList.add(piece.startsWith('w') ? 'text-white' : 'text-gray-900');
                icon.style.textShadow = '2px 2px 4px rgba(0,0,0,0.4)';
                square.appendChild(icon);
            }
        }
    }

    attachEventListeners() {
        this.boardElement.addEventListener('click', (e) => this.handleSquareClick(e));
        document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('resign-btn').addEventListener('click', () => this.resignGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startNewGame());

        const pauseBtn = document.getElementById('pause-btn');
        const resumeBtn = document.getElementById('resume-btn');
        const resetClockBtn = document.getElementById('reset-clock-btn');
        const timeControlSelect = document.getElementById('time-control-select');

        if (pauseBtn) pauseBtn.addEventListener('click', () => this.pauseGame());
        if (resumeBtn) resumeBtn.addEventListener('click', () => this.resumeGame());
        if (resetClockBtn) resetClockBtn.addEventListener('click', () => this.resetClock());
        if (timeControlSelect) {
            timeControlSelect.value = this.clock ? this.clock.getSelectedControl() : '5+3';
            timeControlSelect.addEventListener('change', (e) => {
                if (this.clock) {
                    this.clock.setSelectedControl(e.target.value);
                    if (!this.clock.gameStarted) this.clock.reset();
                }
            });
        }
    }

    startNewGame() {
        this.logic.resetGame();
        this.selectedPiece = null;
        this.clearHighlights();
        this.renderBoard();
        this.updateStatus();
        this.moveHistoryString = '';
        document.getElementById('game-controls').classList.remove('hidden');
        document.getElementById('game-over-section').classList.add('hidden');

        if (this.clock) {
            const tcSelect = document.getElementById('time-control-select');
            if (tcSelect) this.clock.setSelectedControl(tcSelect.value);
            this.clock.startGame();
        }

        this._updatePauseResumeUI(false);
    }

    resignGame() {
        if (this.logic.isGameOver) return;
        this.logic.isGameOver = true;
        const winner = this.logic.getOpponentColor(this.logic.currentPlayer);
        this.statusElement.textContent = `You resigned. ${winner.charAt(0).toUpperCase() + winner.slice(1)} wins.`;
        const result = this.logic.currentPlayer === 'white' ? 'loss' : 'win';

        if (this.clock) this.clock.forceStop();
        this.endGame(result);
    }

    endGame(result) {
        document.getElementById('game-controls').classList.add('hidden');
        const gameOverSection = document.getElementById('game-over-section');
        gameOverSection.classList.remove('hidden');
        const resultText = document.getElementById('game-result-text');
        if (result === 'win') {
            resultText.textContent = 'Congratulations! You won!';
            resultText.className = 'mb-4 text-green-400 font-bold';
        } else if (result === 'loss') {
            resultText.textContent = 'Game Over. You lost.';
            resultText.className = 'mb-4 text-red-400 font-bold';
        } else {
            resultText.textContent = "Game Over. It's a draw.";
            resultText.className = 'mb-4 text-yellow-400 font-bold';
        }

        if (this.clock) this.clock.stop();

        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const opponentType = this.gameMode === 'ai' ? 'ai' : 'human';
            DB.addGame(Auth.currentUser.id, opponentType, result, this.moveHistoryString.trim());
        }
    }

    handleSquareClick(event) {
        if (this.logic.isGameOver) return;
        const square = event.target.closest('[data-row]');
        if (!square) return;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = this.logic.getPieceAt(row, col);

        if (this.selectedPiece) {
            const fromRow = this.selectedPiece.row;
            const fromCol = this.selectedPiece.col;
            const selectedPieceType = this.logic.getPieceAt(fromRow, fromCol);
            if (this.logic.isPawnPromotion(selectedPieceType, row)) {
                this.promptForPromotion(fromRow, fromCol, row, col);
            } else {
                this.tryMove(fromRow, fromCol, row, col);
            }
            this.clearHighlights();
            this.selectedPiece = null;
        } else if (piece && this.logic.getPieceColor(piece) === this.logic.currentPlayer) {
            this.selectedPiece = { row, col, element: square };
            this.highlightValidMoves(row, col);
        }
    }

    tryMove(fromRow, fromCol, toRow, toCol, promotionPiece = null) {
        const moveColor = this.logic.currentPlayer;
        const moveSuccessful = this.logic.makeMove(fromRow, fromCol, toRow, toCol, promotionPiece);
        if (moveSuccessful) {
            this.addToMoveHistory(fromRow, fromCol, toRow, toCol, promotionPiece);
            this.renderBoard();
            this.updateStatus();

            if (this.clock) {
                this.clock.onMoveCompleted(moveColor);
            }

            if (this.logic.isGameOver) { this.handleGameOver(); return; }

            if (this.gameMode === 'ai' && this.logic.currentPlayer === 'black') {
                this.boardElement.style.pointerEvents = 'none';
                setTimeout(() => {
                    const aiMove = window.gameAI.findBestMove(this.logic);
                    if (aiMove) {
                        const aiColor = this.logic.currentPlayer;
                        this.logic.makeMove(aiMove.from.row, aiMove.from.col, aiMove.to.row, aiMove.to.col);
                        this.addToMoveHistory(aiMove.from.row, aiMove.from.col, aiMove.to.row, aiMove.to.col, null);
                        this.renderBoard();
                        this.updateStatus();

                        if (this.clock) {
                            this.clock.onMoveCompleted(aiColor);
                        }

                        if (this.logic.isGameOver) this.handleGameOver();
                    }
                    this.boardElement.style.pointerEvents = 'auto';
                }, 500);
            }
        }
    }

    handleGameOver() {
        const status = this.logic.gameStatus;
        let result;
        if (status.includes('White wins')) result = 'win';
        else if (status.includes('Black wins')) result = 'loss';
        else result = 'draw';
        this.endGame(result);
    }

    handleTimeout(loserColor) {
        this.logic.isGameOver = true;
        const winner = this.logic.getOpponentColor(loserColor);
        this.statusElement.textContent = `${loserColor.charAt(0).toUpperCase() + loserColor.slice(1)} ran out of time. ${winner.charAt(0).toUpperCase() + winner.slice(1)} wins by timeout!`;

        if (loserColor === 'white') {
            this.endGame('loss');
        } else {
            this.endGame('win');
        }
    }

    pauseGame() {
        if (this.clock) {
            this.clock.pause();
            this._updatePauseResumeUI(true);
        }
    }

    resumeGame() {
        if (this.clock) {
            this.clock.resume();
            this._updatePauseResumeUI(false);
        }
    }

    resetClock() {
        if (this.clock) {
            this.clock.reset();
            this._updatePauseResumeUI(false);
        }
    }

    _updatePauseResumeUI(isPaused) {
        const pauseBtn = document.getElementById('pause-btn');
        const resumeBtn = document.getElementById('resume-btn');
        if (pauseBtn) pauseBtn.classList.toggle('hidden', isPaused);
        if (resumeBtn) resumeBtn.classList.toggle('hidden', !isPaused);
    }

    addToMoveHistory(fromRow, fromCol, toRow, toCol, promotion) {
        const colMap = 'abcdefgh';
        let move = `${colMap[fromCol]}${8 - fromRow}${colMap[toCol]}${8 - toRow}`;
        if (promotion) move += promotion;
        this.moveHistoryString += move + ' ';
    }

    updateStatus() { this.statusElement.textContent = this.logic.gameStatus; }

    highlightValidMoves(row, col) {
        this.clearHighlights();
        const validMoves = this.logic.getValidMoves(row, col);
        const selectedSquare = this.boardElement.querySelector(`[data-row='${row}'][data-col='${col}']`);
        selectedSquare.style.backgroundColor = '#b7791f';
        this.highlightedSquares.push(selectedSquare);

        validMoves.forEach(move => {
            const moveSquare = this.boardElement.querySelector(`[data-row='${move.row}'][data-col='${move.col}']`);
            const highlight = document.createElement('div');
            highlight.classList.add('w-1/3', 'h-1/3', 'rounded-full', 'opacity-50');
            if (this.logic.getPieceAt(move.row, move.col)) {
                moveSquare.style.outline = '4px solid rgba(229, 62, 62, 0.7)';
                moveSquare.style.outlineOffset = '-4px';
            } else {
                highlight.style.backgroundColor = 'rgba(0,0,0,0.3)';
                moveSquare.appendChild(highlight);
            }
            this.highlightedSquares.push(moveSquare);
        });
    }

    clearHighlights() {
        this.highlightedSquares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            square.style.backgroundColor = (row + col) % 2 === 0 ? '#CBD5E0' : '#718096';
            square.style.outline = 'none';
            const highlightCircle = square.querySelector('div');
            if (highlightCircle) square.removeChild(highlightCircle);
        });
        this.highlightedSquares = [];
    }

    promptForPromotion(fromRow, fromCol, toRow, toCol) {
        const promotionContainer = document.createElement('div');
        promotionContainer.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background-color:#2d3748;padding:2rem;border-radius:0.5rem;z-index:100;display:flex;gap:1rem;border:2px solid #4a5568;';
        const color = this.logic.currentPlayer;
        ['Q', 'R', 'B', 'N'].forEach(p => {
            const pieceCode = color.charAt(0) + p;
            const btn = document.createElement('button');
            const icon = document.createElement('i');
            icon.classList.add('fa-solid', this.pieceMap[pieceCode], 'text-5xl');
            icon.classList.add(color === 'white' ? 'text-white' : 'text-gray-900');
            btn.appendChild(icon);
            btn.onclick = () => {
                this.tryMove(fromRow, fromCol, toRow, toCol, p);
                document.body.removeChild(promotionContainer);
            };
            promotionContainer.appendChild(btn);
        });
        document.body.appendChild(promotionContainer);
    }
}
