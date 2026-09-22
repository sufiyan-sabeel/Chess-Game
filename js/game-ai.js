const gameAI = {
    pieceValues: { 'P': 10, 'N': 30, 'B': 30, 'R': 50, 'Q': 90, 'K': 900 },

    evaluateBoard: function(logic) {
        let totalScore = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = logic.getPieceAt(row, col);
                if (piece) {
                    const value = this.pieceValues[logic.getPieceType(piece)];
                    totalScore += (logic.getPieceColor(piece) === 'black' ? value : -value);
                }
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
