// A simple AI for the CheckMate Web App
// This AI uses a basic evaluation function and looks one move ahead.
const gameAI = {
    // Piece values for evaluation
    pieceValues: {
        'P': 10,
        'N': 30,
        'B': 30,
        'R': 50,
        'Q': 90,
        'K': 900
    },

    /**
     * Evaluates the current state of the board from the AI's perspective (black).
     * @param {GameLogic} logic - The game logic instance.
     * @returns {number} The score of the board state. Positive is good for black, negative is good for white.
     */
    evaluateBoard: function(logic) {
        let totalScore = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = logic.getPieceAt(row, col);
                if (piece) {
                    const value = this.pieceValues[logic.getPieceType(piece)];
                    const color = logic.getPieceColor(piece);
                    totalScore += (color === 'black' ? value : -value);
                }
            }
        }
        return totalScore;
    },

    /**
     * Finds the best move for the current player (always black for this AI).
     * @param {GameLogic} logic - The current game logic instance.
     * @returns {object|null} The best move object {from: {row, col}, to: {row, col}} or null if no moves.
     */
    findBestMove: function(logic) {
        let bestMove = null;
        let bestValue = -Infinity;
        const allMoves = this.getAllPossibleMoves(logic, 'black');
        
        // If no moves, return null (stalemate or checkmate)
        if (allMoves.length === 0) {
            return null;
        }
        
        // Shuffle moves to add randomness to equally good choices
        this.shuffleArray(allMoves);

        for (const move of allMoves) {
            // Simulate the move
            const tempLogic = this.cloneLogic(logic);
            tempLogic.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
            
            // Evaluate the board after the move
            const boardValue = this.evaluateBoard(tempLogic);

            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        }
        
        // If no good move was found (e.g., all lead to a worse state), pick a random one
        if (!bestMove) {
            return allMoves[0];
        }

        return bestMove;
    },

    /**
     * Gets all possible moves for a given color.
     * @param {GameLogic} logic - The game logic instance.
     * @param {string} color - 'white' or 'black'.
     * @returns {array} An array of move objects.
     */
    getAllPossibleMoves: function(logic, color) {
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = logic.getPieceAt(r, c);
                if (piece && logic.getPieceColor(piece) === color) {
                    // Temporarily set current player to get valid moves
                    const originalPlayer = logic.currentPlayer;
                    logic.currentPlayer = color;
                    const validMoves = logic.getValidMoves(r, c);
                    logic.currentPlayer = originalPlayer;
                    
                    if (validMoves.length > 0) {
                        validMoves.forEach(move => {
                           moves.push({
                               from: { row: r, col: c },
                               to: { row: move.row, col: move.col }
                           });
                        });
                    }
                }
            }
        }
        return moves;
    },
    
    /**
     * Creates a deep copy of the game logic instance to simulate moves without affecting the actual game.
     * @param {GameLogic} logic - The original logic instance.
     * @returns {GameLogic} A new, cloned GameLogic instance.
     */
    cloneLogic: function(logic) {
        const newLogic = new GameLogic();
        newLogic.boardState = JSON.parse(JSON.stringify(logic.boardState));
        newLogic.currentPlayer = logic.currentPlayer;
        newLogic.moveHistory = JSON.parse(JSON.stringify(logic.moveHistory));
        newLogic.isGameOver = logic.isGameOver;
        return newLogic;
    },
    
    /**
     * Shuffles an array in place. (Fisher-Yates shuffle)
     * @param {array} array The array to shuffle.
     */
    shuffleArray: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};

// Make it available globally on the window object so GameUI can access it.
window.gameAI = gameAI;