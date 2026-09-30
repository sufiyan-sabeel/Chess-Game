// ===== Premium chessboard component =====
// Renders an 8x8 board with tap-to-select AND drag-and-drop, legal-move
// indicators, last-move/check highlights, themes, piece sets, coordinates,
// board flip, smooth movement animations, and keyboard accessibility.
class ChessBoard {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        if (!this.container) throw new Error('ChessBoard: container not found');

        this.options = Object.assign({
            interactive: true,
            flipped: false,
            theme: 'green',
            pieceSet: 'classic',
            coordinates: true,
            showLegalMoves: true,
            animations: true,
            onMove: null,          // (fromRow, fromCol, toRow, toCol) => bool
            onSelect: null,        // (row, col | null) => void
            onSquareClick: null,   // (row, col) => void
        }, options);

        this.boardState = null;    // 8x8 array, mirrors GameLogic
        this.selected = null;      // {row, col}
        this.legalMoves = [];      // moves for selected piece
        this.lastMove = null;      // {from:{row,col}, to:{row,col}}
        this.checkColor = null;    // 'white' | 'black' | null
        this._pieceEls = {};       // "r,c" -> element
        this._drag = null;         // active drag state
        this._keyboardCursor = null;
        this._destroyed = false;

        this._build();
        this._bindEvents();
        this.applyOptions();
    }

    // ---------- themes & piece sets ----------
    THEMES: {
        green:    { light: '#EEEED2', dark: '#769656', name: 'Green' },
        brown:    { light: '#F0D9B5', dark: '#B58863', name: 'Brown' },
        blue:     { light: '#DEE3E6', dark: '#8CA2AD', name: 'Blue' },
        midnight: { light: '#4B4B52', dark: '#33333A', name: 'Midnight' },
    },

    PIECES: {
        classic: {
            wK: 'fa-chess-king', wQ: 'fa-chess-queen', wR: 'fa-chess-rook',
            wB: 'fa-chess-bishop', wN: 'fa-chess-knight', wP: 'fa-chess-pawn',
            bK: 'fa-chess-king', bQ: 'fa-chess-queen', bR: 'fa-chess-rook',
            bB: 'fa-chess-bishop', bN: 'fa-chess-knight', bP: 'fa-chess-pawn',
        },
        unicode: {
            wK: '♚', wQ: '♛', wR: '♜', wB: '♝', wN: '♞', wP: '♟',
            bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
        },
    },

    // ---------- DOM construction ----------
    _build() {
        this.container.classList.add('chessboard');
        this.container.setAttribute('role', 'grid');
        this.container.setAttribute('aria-label', 'Chessboard');

        this.squaresEl = document.createElement('div');
        this.squaresEl.className = 'board-squares';

        this.highlightsEl = document.createElement('div');
        this.highlightsEl.className = 'board-highlights';

        this.piecesEl = document.createElement('div');
        this.piecesEl.className = 'board-pieces';

        this.dragLayer = document.createElement('div');
        this.dragLayer.className = 'board-drag-layer';

        this.container.appendChild(this.squaresEl);
        this.container.appendChild(this.highlightsEl);
        this.container.appendChild(this.piecesEl);
        this.container.appendChild(this.dragLayer);

        this._squares = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const sq = document.createElement('div');
                sq.className = 'board-square';
                sq.dataset.row = row;
                sq.dataset.col = col;
                sq.setAttribute('role', 'gridcell');
                const name = ChessNotation.squareName(row, col);
                sq.setAttribute('aria-label', name);
                this.squaresEl.appendChild(sq);
                this._squares.push(sq);
            }
        }
    }

    _squareEl(row, col) { return this._squares[row * 8 + col]; }

    applyOptions() {
        const o = this.options;
        this.container.dataset.theme = o.theme;
        this.container.dataset.pieceset = o.pieceSet;
        this.container.classList.toggle('board-flipped', o.flipped);
        this.container.classList.toggle('board-coords', o.coordinates);
        this.container.classList.toggle('board-animations', o.animations);
        this.container.classList.toggle('board-interactive', o.interactive);
        this._renderCoordinates();
        this._renderPieces();
    }

    setOption(key, value) {
        this.options[key] = value;
        this.applyOptions();
    }

    setFlipped(flipped) { this.setOption('flipped', !!flipped); }
    setTheme(theme) { if (this.THEMES[theme]) this.setOption('theme', theme); }
    setPieceSet(set) { if (this.PIECES[set]) this.setOption('pieceSet', set); }
    setCoordinates(show) { this.setOption('coordinates', !!show); }
    setInteractive(on) { this.setOption('interactive', !!on); }

    _renderCoordinates() {
        const show = this.options.coordinates;
        const flipped = this.options.flipped;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const sq = this._squareEl(row, col);
                let label = sq.querySelector('.coord-label');
                if (show && !label) {
                    label = document.createElement('span');
                    label.className = 'coord-label';
                    sq.appendChild(label);
                }
                if (label) {
                    if (!show) { label.remove(); continue; }
                    // File letters on bottom row, rank numbers on left column.
                    const isBottom = flipped ? row === 0 : row === 7;
                    const isLeft = flipped ? col === 7 : col === 0;
                    label.textContent = isBottom ? ChessNotation.FILES[col] : (isLeft ? String(8 - row) : '');
                    label.classList.toggle('coord-file', isBottom);
                    label.classList.toggle('coord-rank', isLeft);
                }
            }
        }
    }

    // ---------- position & pieces ----------
    syncFromLogic(logic) {
        this.boardState = logic.boardState.map(r => r.slice());
        this._renderPieces();
        this._renderHighlights();
    }

    setPosition(boardState) {
        this.boardState = boardState.map(r => r.slice());
        this._renderPieces();
        this._renderHighlights();
    }

    _renderPieces() {
        if (!this.boardState) return;
        const map = this.PIECES[this.options.pieceSet] || this.PIECES.classic;
        const seen = {};

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.boardState[row][col];
                const key = row + ',' + col;
                if (piece) {
                    seen[key] = true;
                    let el = this._pieceEls[key];
                    if (!el) {
                        el = document.createElement('div');
                        el.className = 'board-piece';
                        this.piecesEl.appendChild(el);
                        this._pieceEls[key] = el;
                    }
                    el.dataset.row = row;
                    el.dataset.col = col;
                    el.className = 'board-piece piece-' + (piece.startsWith('w') ? 'white' : 'black');
                    el.innerHTML = '';
                    if (this.options.pieceSet === 'classic') {
                        const icon = document.createElement('i');
                        icon.className = 'fa-solid ' + map[piece];
                        el.appendChild(icon);
                    } else {
                        el.textContent = map[piece];
                    }
                    el.style.transform = 'translate(' + (col * 100) + '%,' + (row * 100) + '%)';
                }
            }
        }
        // Remove stale piece elements
        for (const key of Object.keys(this._pieceEls)) {
            if (!seen[key]) {
                this._pieceEls[key].remove();
                delete this._pieceEls[key];
            }
        }
    }

    // Animate a move (assumes logic already updated). Handles captures,
    // castling rook, en passant, and promotion visuals.
    animateMove(fromRow, fromCol, toRow, toCol, promotion, onDone) {
        const fromKey = fromRow + ',' + fromCol;
        const toKey = toRow + ',' + toCol;
        const pieceEl = this._pieceEls[fromKey];
        const animate = this.options.animations;

        const finish = () => {
            if (pieceEl) {
                pieceEl.dataset.row = toRow;
                pieceEl.dataset.col = toCol;
                pieceEl.style.transform = 'translate(' + (toCol * 100) + '%,' + (toRow * 100) + '%)';
                this._pieceEls[toKey] = pieceEl;
                delete this._pieceEls[fromKey];
                if (promotion) this._applyPromotionVisual(toRow, toCol, promotion);
            }
            // Captured piece (incl. en passant pawn, which sits off-target)
            const capturedKey = toRow + ',' + toCol;
            if (this._pieceEls[capturedKey] && this._pieceEls[capturedKey] !== pieceEl) {
                this._pieceEls[capturedKey].remove();
                delete this._pieceEls[capturedKey];
            }
            const epPawnKey = fromRow + ',' + toCol;
            if (this._pieceEls[epPawnKey] && this._pieceEls[epPawnKey] !== pieceEl) {
                this._pieceEls[epPawnKey].remove();
                delete this._pieceEls[epPawnKey];
            }
            // Castling: move the rook too
            const piece = this.boardState && this.boardState[toRow] ? this.boardState[toRow][toCol] : null;
            if (piece && piece.charAt(1) === 'K' && Math.abs(fromCol - toCol) === 2) {
                const rookFromCol = toCol > fromCol ? 7 : 0;
                const rookToCol = toCol > fromCol ? 5 : 3;
                const rookEl = this._pieceEls[fromRow + ',' + rookFromCol];
                if (rookEl) {
                    rookEl.dataset.col = rookToCol;
                    rookEl.style.transform = 'translate(' + (rookToCol * 100) + '%,' + (fromRow * 100) + '%)';
                    this._pieceEls[fromRow + ',' + rookToCol] = rookEl;
                    delete this._pieceEls[fromRow + ',' + rookFromCol];
                }
            }
            if (onDone) onDone();
        };

        if (!pieceEl) { finish(); return; }
        if (!animate) { finish(); return; }
        // Force reflow then transition
        pieceEl.style.transform = 'translate(' + (fromCol * 100) + '%,' + (fromRow * 100) + '%)';
        requestAnimationFrame(() => requestAnimationFrame(finish));
    }

    _applyPromotionVisual(row, col, promotion) {
        const el = this._pieceEls[row + ',' + col];
        if (!el || !this.boardState) return;
        const piece = this.boardState[row][col];
        if (!piece) return;
        const map = this.PIECES[this.options.pieceSet];
        const color = piece.startsWith('w') ? 'w' : 'b';
        el.innerHTML = '';
        if (this.options.pieceSet === 'classic') {
            const icon = document.createElement('i');
            icon.className = 'fa-solid ' + map[color + promotion];
            el.appendChild(icon);
        } else {
            el.textContent = map[color + promotion];
        }
    }

    // ---------- highlights ----------
    highlightLastMove(from, to) {
        this.lastMove = { from, to };
        this._renderHighlights();
    }

    clearLastMove() {
        this.lastMove = null;
        this._renderHighlights();
    }

    highlightCheck(color) {
        this.checkColor = color;
        this._renderHighlights();
    }

    clearCheck() {
        this.checkColor = null;
        this._renderHighlights();
    }

    _renderHighlights() {
        // Square-level highlights
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const sq = this._squareEl(row, col);
                sq.classList.toggle('sq-selected', !!this.selected && this.selected.row === row && this.selected.col === col);
                sq.classList.toggle('sq-lastmove', !!this.lastMove &&
                    ((this.lastMove.from.row === row && this.lastMove.from.col === col) ||
                     (this.lastMove.to.row === row && this.lastMove.to.col === col)));
                sq.classList.toggle('sq-legal', this.legalMoves.some(m => m.row === row && m.col === col));
                sq.classList.toggle('sq-capture', this.legalMoves.some(m => m.row === row && m.col === col) &&
                    this.boardState && this.boardState[row][col]);
                // legal dot
                let dot = sq.querySelector('.legal-dot');
                const isLegal = this.legalMoves.some(m => m.row === row && m.col === col);
                if (isLegal && !this.boardState[row][col] && !dot) {
                    dot = document.createElement('span');
                    dot.className = 'legal-dot';
                    sq.appendChild(dot);
                } else if (!isLegal && dot) {
                    dot.remove();
                }
            }
        }
        // Check highlight on the king's square
        this.highlightsEl.innerHTML = '';
        if (this.checkColor && this.boardState) {
            const kingPos = this._findKing(this.checkColor);
            if (kingPos) {
                const el = document.createElement('div');
                el.className = 'check-highlight';
                el.style.transform = 'translate(' + (kingPos.col * 100) + '%,' + (kingPos.row * 100) + '%)';
                this.highlightsEl.appendChild(el);
            }
        }
    }

    _findKing(color) {
        if (!this.boardState) return null;
        const king = color.charAt(0) + 'K';
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (this.boardState[r][c] === king) return { row: r, col: c };
        }
        return null;
    }

    // ---------- selection ----------
    selectSquare(row, col, legalMoves) {
        this.selected = { row, col };
        this.legalMoves = legalMoves || [];
        this._renderHighlights();
        if (this.options.onSelect) this.options.onSelect(row, col);
    }

    deselect() {
        this.selected = null;
        this.legalMoves = [];
        this._renderHighlights();
        if (this.options.onSelect) this.options.onSelect(null);
    }

    // ---------- events ----------
    _bindEvents() {
        this._onPointerDown = this._handlePointerDown.bind(this);
        this._onPointerMove = this._handlePointerMove.bind(this);
        this._onPointerUp = this._handlePointerUp.bind(this);
        this.squaresEl.addEventListener('pointerdown', this._onPointerDown);
        window.addEventListener('pointermove', this._onPointerMove);
        window.addEventListener('pointerup', this._onPointerUp);
        this._onKeyDown = this._handleKeyDown.bind(this);
        this.container.addEventListener('keydown', this._onKeyDown);
        this.container.setAttribute('tabindex', '0');
    }

    _eventSquare(e) {
        const t = e.target.closest('.board-square');
        if (!t) return null;
        return { row: parseInt(t.dataset.row, 10), col: parseInt(t.dataset.col, 10) };
    }

    _handlePointerDown(e) {
        if (!this.options.interactive || this._drag) return;
        const sq = this._eventSquare(e);
        if (!sq) return;
        e.preventDefault();
        this.container.focus({ preventScroll: true });
        this._drag = {
            startRow: sq.row, startCol: sq.col,
            startX: e.clientX, startY: e.clientY,
            active: false, target: null,
        };
    }

    _handlePointerMove(e) {
        if (!this._drag) return;
        const d = this._drag;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.active && Math.hypot(dx, dy) > 6) {
            d.active = true;
            this._beginDragGhost(d.startRow, d.startCol);
        }
        if (d.active) {
            this._moveDragGhost(e.clientX, e.clientY);
            d.target = this._squareFromPoint(e.clientX, e.clientY);
            this._highlightDragTarget(d.target);
        }
    }

    _handlePointerUp(e) {
        if (!this._drag) return;
        const d = this._drag;
        this._drag = null;
        this._clearDragGhost();
        this._clearDragTarget();

        if (d.active) {
            // Drag release
            const target = d.target || this._squareFromPoint(e.clientX, e.clientY);
            if (target) this._attemptMove(d.startRow, d.startCol, target.row, target.col);
            else this.deselect();
        } else {
            // Tap
            this._handleTap(d.startRow, d.startCol);
        }
    }

    _handleTap(row, col) {
        if (this.options.onSquareClick) this.options.onSquareClick(row, col);
        if (!this.options.interactive) return;

        // Tapping a legal target of the current selection => move
        if (this.selected && this.legalMoves.some(m => m.row === row && m.col === col)) {
            this._attemptMove(this.selected.row, this.selected.col, row, col);
            return;
        }
        // Tapping own piece => select
        const piece = this.boardState && this.boardState[row][col];
        if (piece && this._isPlayable(piece)) {
            if (this.selected && this.selected.row === row && this.selected.col === col) {
                this.deselect();
            } else {
                const moves = this._legalMovesFor(row, col);
                this.selectSquare(row, col, moves);
            }
        } else {
            this.deselect();
        }
    }

    _isPlayable(piece) {
        // A piece is playable if it belongs to the side to move (controller sets this)
        return this.options.sideToMove && piece && piece.startsWith(this.options.sideToMove.charAt(0));
    }

    _legalMovesFor(row, col) {
        if (this.options.getLegalMoves) return this.options.getLegalMoves(row, col) || [];
        return [];
    }

    _attemptMove(fromRow, fromCol, toRow, toCol) {
        const wasSelected = this.selected;
        this.deselect();
        if (this.options.onMove) {
            this.options.onMove(fromRow, fromCol, toRow, toCol);
        }
    }

    // ---------- drag ghost ----------
    _beginDragGhost(row, col) {
        const piece = this.boardState && this.boardState[row][col];
        if (!piece) return;
        const map = this.PIECES[this.options.pieceSet] || this.PIECES.classic;
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost piece-' + (piece.startsWith('w') ? 'white' : 'black');
        if (this.options.pieceSet === 'classic') {
            const icon = document.createElement('i');
            icon.className = 'fa-solid ' + map[piece];
            ghost.appendChild(icon);
        } else {
            ghost.textContent = map[piece];
        }
        this.dragLayer.appendChild(ghost);
        this._dragGhost = ghost;
        // Dim the origin piece
        const originEl = this._pieceEls[row + ',' + col];
        if (originEl) originEl.classList.add('piece-dragging');
    }

    _moveDragGhost(x, y) {
        if (!this._dragGhost) return;
        const rect = this.container.getBoundingClientRect();
        this._dragGhost.style.left = (x - rect.left) + 'px';
        this._dragGhost.style.top = (y - rect.top) + 'px';
    }

    _squareFromPoint(x, y) {
        const rect = this.container.getBoundingClientRect();
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
        const col = Math.min(7, Math.max(0, Math.floor((x - rect.left) / rect.width * 8)));
        const row = Math.min(7, Math.max(0, Math.floor((y - rect.top) / rect.height * 8)));
        return { row, col };
    }

    _highlightDragTarget(target) {
        this._clearDragTarget();
        if (!target) return;
        const sq = this._squareEl(target.row, target.col);
        if (sq) sq.classList.add('sq-dragtarget');
    }

    _clearDragTarget() {
        this.container.querySelectorAll('.sq-dragtarget').forEach(el => el.classList.remove('sq-dragtarget'));
    }

    _clearDragGhost() {
        if (this._dragGhost) { this._dragGhost.remove(); this._dragGhost = null; }
        this.container.querySelectorAll('.piece-dragging').forEach(el => el.classList.remove('piece-dragging'));
    }

    // ---------- keyboard accessibility ----------
    _handleKeyDown(e) {
        if (!this.options.interactive) return;
        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape'];
        if (!keys.includes(e.key)) return;
        e.preventDefault();
        if (!this._keyboardCursor) {
            this._keyboardCursor = { row: 0, col: 0 };
        }
        const c = this._keyboardCursor;
        if (e.key === 'ArrowUp') c.row = Math.max(0, c.row - 1);
        if (e.key === 'ArrowDown') c.row = Math.min(7, c.row + 1);
        if (e.key === 'ArrowLeft') c.col = Math.max(0, c.col - 1);
        if (e.key === 'ArrowRight') c.col = Math.min(7, c.col + 1);
        if (e.key === 'Enter' || e.key === ' ') this._handleTap(c.row, c.col);
        if (e.key === 'Escape') this.deselect();
        this._renderKeyboardCursor();
    }

    _renderKeyboardCursor() {
        this.container.querySelectorAll('.sq-kbcursor').forEach(el => el.classList.remove('sq-kbcursor'));
        if (!this._keyboardCursor) return;
        const sq = this._squareEl(this._keyboardCursor.row, this._keyboardCursor.col);
        if (sq) sq.classList.add('sq-kbcursor');
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this.squaresEl.removeEventListener('pointerdown', this._onPointerDown);
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        this.container.removeEventListener('keydown', this._onKeyDown);
        this.container.innerHTML = '';
    }
}

window.ChessBoard = ChessBoard;
