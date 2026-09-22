class GameLogic {
    constructor() {
        this.boardState = this.getInitialBoardState();
        this.currentPlayer = 'white';
        this.isGameOver = false;
        this.gameStatus = ''; // e.g., 'check', 'checkmate', 'stalemate'
        this.moveHistory = []; // For en passant and castling checks
        this.capturedPieces = { white: [], black: [] };
    }

    getInitialBoardState() {
        return [
            ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
            ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
            ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
        ];
    }
    
    resetGame() {
        this.boardState = this.getInitialBoardState();
        this.currentPlayer = 'white';
        this.isGameOver = false;
        this.gameStatus = '';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
    }

    getPieceAt(row, col) {
        return this.boardState[row][col];
    }
    
    getPieceColor(piece) {
        if (!piece) return null;
        return piece.startsWith('w') ? 'white' : 'black';
    }
    
    getPieceType(piece) {
        if (!piece) return null;
        return piece.charAt(1);
    }

    switchPlayer() {
        this.currentPlayer = (this.currentPlayer === 'white') ? 'black' : 'white';
    }

    makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = null) {
        if (this.isGameOver) return false;

        const piece = this.getPieceAt(fromRow, fromCol);
        const validMoves = this.getValidMoves(fromRow, fromCol);
        
        const isValidMove = validMoves.some(move => move.row === toRow && move.col === toCol);

        if (!isValidMove) {
            return false;
        }

        const capturedPiece = this.getPieceAt(toRow, toCol);

        // --- SPECIAL MOVE LOGIC ---
        const moveDetails = { piece, from: {fromRow, fromCol}, to: {toRow, toCol}, captured: capturedPiece };
        
        // Handle Castling
        if (this.getPieceType(piece) === 'K' && Math.abs(fromCol - toCol) === 2) {
            const rookCol = toCol > fromCol ? 7 : 0;
            const newRookCol = toCol > fromCol ? 5 : 3;
            const rook = this.getPieceAt(fromRow, rookCol);
            this.boardState[fromRow][newRookCol] = rook;
            this.boardState[fromRow][rookCol] = null;
        }
        
        // Handle En Passant Capture
        if (this.getPieceType(piece) === 'P' && fromCol !== toCol && !capturedPiece) {
            const capturedPawnRow = fromRow;
            const capturedPawnCol = toCol;
            const capturedPawn = this.getPieceAt(capturedPawnRow, capturedPawnCol);
            moveDetails.captured = capturedPawn; // Log it as a capture
            this.boardState[capturedPawnRow][capturedPawnCol] = null;
        }

        // --- STANDARD MOVE EXECUTION ---
        this.boardState[toRow][toCol] = piece;
        this.boardState[fromRow][fromCol] = null;
        
        // Handle Pawn Promotion
        if (promotionPiece) {
            this.boardState[toRow][toCol] = this.getPieceColor(piece).charAt(0) + promotionPiece;
            moveDetails.promotion = promotionPiece;
        }

        if (moveDetails.captured) {
            const capturedColor = this.getPieceColor(moveDetails.captured);
            const opponentColor = capturedColor === 'white' ? 'black' : 'white';
            this.capturedPieces[opponentColor].push(moveDetails.captured);
        }

        this.moveHistory.push(moveDetails);
        this.switchPlayer();
        this.updateGameStatus();
        return true;
    }

    updateGameStatus() {
        const opponentColor = this.currentPlayer === 'white' ? 'black' : 'white';
        if (this.isCheckmate(this.currentPlayer)) {
            this.isGameOver = true;
            this.gameStatus = `Checkmate! ${opponentColor.charAt(0).toUpperCase() + opponentColor.slice(1)} wins.`;
        } else if (this.isStalemate(this.currentPlayer)) {
            this.isGameOver = true;
            this.gameStatus = `Stalemate! The game is a draw.`;
        } else if (this.isInCheck(this.currentPlayer)) {
            this.gameStatus = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} is in Check!`;
        } else {
            this.gameStatus = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}'s Turn`;
        }
    }
    
    getValidMoves(row, col) {
        const piece = this.getPieceAt(row, col);
        if (!piece || this.getPieceColor(piece) !== this.currentPlayer) {
            return [];
        }

        let moves;
        const type = this.getPieceType(piece);

        switch(type) {
            case 'P': moves = this.getPawnMoves(row, col); break;
            case 'R': moves = this.getRookMoves(row, col); break;
            case 'N': moves = this.getKnightMoves(row, col); break;
            case 'B': moves = this.getBishopMoves(row, col); break;
            case 'Q': moves = this.getQueenMoves(row, col); break;
            case 'K': moves = this.getKingMoves(row, col); break;
            default: moves = []; break;
        }

        // Filter out moves that would leave the king in check
        return moves.filter(move => !this.moveResultsInCheck(row, col, move.row, move.col));
    }
    
    // --- MOVE GENERATION LOGIC ---

    getPawnMoves(row, col) {
        const moves = [];
        const piece = this.getPieceAt(row, col);
        const color = this.getPieceColor(piece);
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        // 1. Forward move
        if (this.isValid(row + direction, col) && !this.getPieceAt(row + direction, col)) {
            moves.push({ row: row + direction, col: col });
            // 2. Double forward move from start
            if (row === startRow && !this.getPieceAt(row + 2 * direction, col)) {
                moves.push({ row: row + 2 * direction, col: col });
            }
        }
        // 3. Captures
        for (let c of [-1, 1]) {
            const newCol = col + c;
            const newRow = row + direction;
            if (this.isValid(newRow, newCol)) {
                const targetPiece = this.getPieceAt(newRow, newCol);
                if (targetPiece && this.getPieceColor(targetPiece) !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
        
        // 4. En Passant
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        if (lastMove && this.getPieceType(lastMove.piece) === 'P' && Math.abs(lastMove.from.fromRow - lastMove.to.toRow) === 2) {
             if (row === lastMove.to.toRow && Math.abs(col - lastMove.to.toCol) === 1) {
                moves.push({ row: row + direction, col: lastMove.to.toCol });
             }
        }

        return moves;
    }

    getRookMoves(row, col) {
        return this.getSlidingMoves(row, col, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    }

    getKnightMoves(row, col) {
        const moves = [];
        const color = this.getPieceColor(this.getPieceAt(row, col));
        const directions = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValid(newRow, newCol)) {
                const targetPiece = this.getPieceAt(newRow, newCol);
                if (!targetPiece || this.getPieceColor(targetPiece) !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
        return moves;
    }

    getBishopMoves(row, col) {
        return this.getSlidingMoves(row, col, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    }

    getQueenMoves(row, col) {
        return [...this.getRookMoves(row, col), ...this.getBishopMoves(row, col)];
    }

    getKingMoves(row, col) {
        const moves = [];
        const color = this.getPieceColor(this.getPieceAt(row, col));
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (this.isValid(newRow, newCol)) {
                    const targetPiece = this.getPieceAt(newRow, newCol);
                    if (!targetPiece || this.getPieceColor(targetPiece) !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        
        // Castling
        if (!this.hasKingMoved(color)) {
            // Kingside
            if (!this.hasRookMoved(row, 7) && !this.getPieceAt(row, 5) && !this.getPieceAt(row, 6)) {
                 if (!this.isSquareAttacked(row, col, this.getOpponentColor(color)) &&
                     !this.isSquareAttacked(row, 5, this.getOpponentColor(color)) &&
                     !this.isSquareAttacked(row, 6, this.getOpponentColor(color))) {
                    moves.push({row, col: 6});     
                 }
            }
            // Queenside
            if (!this.hasRookMoved(row, 0) && !this.getPieceAt(row, 1) && !this.getPieceAt(row, 2) && !this.getPieceAt(row, 3)) {
                 if (!this.isSquareAttacked(row, col, this.getOpponentColor(color)) &&
                     !this.isSquareAttacked(row, 2, this.getOpponentColor(color)) &&
                     !this.isSquareAttacked(row, 3, this.getOpponentColor(color))) {
                    moves.push({row, col: 2});     
                 }
            }
        }
        
        return moves;
    }

    getSlidingMoves(row, col, directions) {
        const moves = [];
        const color = this.getPieceColor(this.getPieceAt(row, col));
        for (const [dr, dc] of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            while (this.isValid(newRow, newCol)) {
                const targetPiece = this.getPieceAt(newRow, newCol);
                if (targetPiece) {
                    if (this.getPieceColor(targetPiece) !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                moves.push({ row: newRow, col: newCol });
                newRow += dr;
                newCol += dc;
            }
        }
        return moves;
    }
    
    // --- CHECK, CHECKMATE, STALEMATE LOGIC ---

    findKing(color) {
        const kingPiece = color.charAt(0) + 'K';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.boardState[r][c] === kingPiece) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }

    isSquareAttacked(row, col, byColor) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.getPieceAt(r, c);
                if (piece && this.getPieceColor(piece) === byColor) {
                    const moves = this.getRawMovesForPiece(r,c,piece); // Use raw moves, ignoring check
                    if (moves.some(move => move.row === row && move.col === col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    getRawMovesForPiece(row, col, piece) {
        // A simplified move generator that doesn't check for check itself.
        // This is necessary for isSquareAttacked to avoid infinite recursion.
        const type = this.getPieceType(piece);
        switch (type) {
            case 'P':
                const moves = [];
                const color = this.getPieceColor(piece);
                const direction = color === 'white' ? -1 : 1;
                // Only capture moves matter for attacks
                for (let c of [-1, 1]) {
                    if (this.isValid(row + direction, col + c)) {
                         moves.push({ row: row + direction, col: col + c });
                    }
                }
                return moves;
            case 'R': return this.getSlidingMoves(row, col, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
            case 'N': return this.getKnightMoves(row, col);
            case 'B': return this.getSlidingMoves(row, col, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
            case 'Q': return this.getQueenMoves(row, col);
            case 'K': return this.getKingMoves(row, col);
            default: return [];
        }
    }
    
    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        const opponentColor = this.getOpponentColor(color);
        return this.isSquareAttacked(kingPos.row, kingPos.col, opponentColor);
    }

    moveResultsInCheck(fromRow, fromCol, toRow, toCol) {
        const piece = this.getPieceAt(fromRow, fromCol);
        const targetPiece = this.getPieceAt(toRow, toCol);
        const color = this.getPieceColor(piece);

        // Simulate the move
        this.boardState[toRow][toCol] = piece;
        this.boardState[fromRow][fromCol] = null;

        const inCheck = this.isInCheck(color);

        // Revert the move
        this.boardState[fromRow][fromCol] = piece;
        this.boardState[toRow][toCol] = targetPiece;

        return inCheck;
    }

    hasAnyLegalMoves(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.getPieceAt(r, c);
                if (piece && this.getPieceColor(piece) === color) {
                    const validMoves = this.getValidMoves(r, c);
                    if (validMoves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    isCheckmate(color) {
        return this.isInCheck(color) && !this.hasAnyLegalMoves(color);
    }
    
    isStalemate(color) {
        return !this.isInCheck(color) && !this.hasAnyLegalMoves(color);
    }

    // --- UTILITY FUNCTIONS ---
    
    isValid(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    getOpponentColor(color) {
        return color === 'white' ? 'black' : 'white';
    }
    
    hasKingMoved(color) {
        const king = color.charAt(0) + 'K';
        return this.moveHistory.some(m => m.piece === king);
    }
    
    hasRookMoved(row, col) {
        const rook = this.boardState[row][col];
        if(!rook) return true; // Rook not there
        return this.moveHistory.some(m => m.piece === rook && m.from.fromRow === row && m.from.fromCol === col);
    }
    
    isPawnPromotion(piece, toRow) {
         if (this.getPieceType(piece) !== 'P') return false;
         const color = this.getPieceColor(piece);
         return (color === 'white' && toRow === 0) || (color === 'black' && toRow === 7);
    }
}