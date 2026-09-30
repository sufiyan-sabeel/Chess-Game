// ===== Lesson data: structured learning path =====
// Each lesson has real content, an optional interactive board demo
// (FEN + demonstration moves), and key points. Completion is tracked.
const LESSONS = [
    {
        id: 'l01', category: 'fundamentals', title: 'The Board & Setup', difficulty: 1,
        content: '<p>Chess is played on an 8×8 board of 64 squares. Each player starts with <strong>16 pieces</strong>: 1 king, 1 queen, 2 rooks, 2 bishops, 2 knights, and 8 pawns.</p><p>The board is set up so that each player has a <strong>light square on their right-hand side</strong>. Rooks go in the corners, then knights, then bishops, with the queen on her own color and the king in the center.</p>',
        demo: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [], caption: 'The starting position. White moves first.' },
        keyPoints: ['8×8 board, 64 squares', '16 pieces per side', 'Queen on her own color', 'White moves first'],
    },
    {
        id: 'l02', category: 'movement', title: 'Pawns', difficulty: 1,
        content: '<p>Pawns move <strong>forward one square</strong>, or <strong>two squares</strong> on their first move. They capture <strong>diagonally forward</strong> one square.</p><p>Pawns are the only pieces that cannot move backward, and the only pieces that capture differently from how they move.</p>',
        demo: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [{ from: [6, 4], to: [4, 4] }, { from: [1, 0], to: [3, 0] }], caption: 'Pawns move forward 1 or 2 squares.' },
        keyPoints: ['Move forward 1 (or 2 from start)', 'Capture diagonally', 'Cannot move backward'],
    },
    {
        id: 'l03', category: 'movement', title: 'Knights', difficulty: 1,
        content: '<p>Knights move in an <strong>L-shape</strong>: two squares in one direction and one square perpendicular. They are the only pieces that can <strong>jump over</strong> other pieces.</p><p>Knights are strongest in the center of the board, where they can reach up to 8 squares.</p>',
        demo: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [{ from: [7, 1], to: [5, 2] }, { from: [0, 1], to: [2, 2] }], caption: 'Knights move in an L-shape and jump over pieces.' },
        keyPoints: ['L-shape: 2 + 1 squares', 'Can jump over pieces', 'Strongest in the center'],
    },
    {
        id: 'l04', category: 'movement', title: 'Bishops', difficulty: 1,
        content: '<p>Bishops move any number of squares <strong>diagonally</strong>. Each bishop stays on the same color square for the whole game.</p><p>A bishop on a light square can never reach a dark square, so having both bishops (one of each color) is a real advantage.</p>',
        demo: { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', moves: [{ from: [7, 5], to: [4, 2] }], caption: 'Bishops slide diagonally any distance.' },
        keyPoints: ['Move diagonally any distance', 'Stay on their own color', 'Both bishops cover all squares'],
    },
    {
        id: 'l05', category: 'movement', title: 'Rooks', difficulty: 1,
        content: '<p>Rooks move any number of squares <strong>horizontally or vertically</strong> along ranks and files.</p><p>Rooks are most powerful in the <strong>endgame</strong>, when the board is open and they can control entire files and ranks.</p>',
        demo: { fen: 'r3k3/8/8/8/8/8/8/4K2R w K - 0 1', moves: [{ from: [7, 7], to: [7, 0] }], caption: 'Rooks slide along ranks and files.' },
        keyPoints: ['Move along ranks and files', 'Powerful in open positions', 'Strongest in the endgame'],
    },
    {
        id: 'l06', category: 'movement', title: 'The Queen', difficulty: 1,
        content: '<p>The queen is the most powerful piece. She combines the moves of the <strong>rook and the bishop</strong>, moving any number of squares in any direction.</p><p>Because she is so powerful, bringing her out too early can make her a target. Develop your other pieces first.</p>',
        demo: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [{ from: [6, 4], to: [4, 4] }, { from: [1, 4], to: [3, 4] }, { from: [7, 3], to: [4, 6] }], caption: 'The queen moves like a rook and bishop combined.' },
        keyPoints: ['Moves like rook + bishop', 'Most powerful piece', 'Don\'t bring her out too early'],
    },
    {
        id: 'l07', category: 'fundamentals', title: 'The King & Check', difficulty: 1,
        content: '<p>The king moves <strong>one square in any direction</strong>. The king can never move into check.</p><p>When the king is attacked, it is in <strong>check</strong> and must escape — by moving, blocking, or capturing the attacker. If it cannot escape, it is <strong>checkmate</strong> and the game is over.</p>',
        demo: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [], caption: 'The king moves one square in any direction.' },
        keyPoints: ['Moves one square any direction', 'Cannot move into check', 'Checkmate ends the game'],
    },
    {
        id: 'l08', category: 'checkmate', title: 'Checkmate Patterns', difficulty: 2,
        content: '<p>The most common checkmate is the <strong>back rank mate</strong>: a rook or queen delivers mate on the 8th rank while the king is trapped by its own pawns.</p><p>Another classic is <strong>Scholar\'s Mate</strong>: the queen and bishop combine to attack the weak f7 square.</p>',
        demo: { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1', moves: [{ from: [4, 7], to: [1, 4] }], caption: 'Scholar\'s Mate: Qxf7# — the queen is protected by the bishop.' },
        keyPoints: ['Back rank mate traps the king', 'f7 is the weakest square', 'Queen + bishop is a deadly pair'],
    },
    {
        id: 'l09', category: 'special', title: 'Castling', difficulty: 2,
        content: '<p><strong>Castling</strong> moves the king two squares toward a rook, and the rook jumps over to the other side. It is the only move that moves two pieces at once.</p><p>You can castle only if: the king and rook have <strong>not moved</strong>, the squares between them are <strong>empty</strong>, and the king is not <strong>in check</strong> (and does not pass through check).</p>',
        demo: { fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', moves: [{ from: [7, 4], to: [7, 6] }], caption: 'Castling kingside: the king moves two squares, the rook jumps over.' },
        keyPoints: ['King moves two squares', 'Rook jumps over', 'Neither piece may have moved', 'Cannot castle through check'],
    },
    {
        id: 'l10', category: 'special', title: 'En Passant & Promotion', difficulty: 2,
        content: '<p><strong>En passant</strong>: when a pawn moves two squares forward and lands beside an enemy pawn, that enemy pawn can capture it as if it had moved only one square.</p><p><strong>Promotion</strong>: when a pawn reaches the far rank, it becomes a queen, rook, bishop, or knight. Most players choose a queen.</p>',
        demo: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [], caption: 'Pawns that reach the far rank must be promoted.' },
        keyPoints: ['En passant captures a double-stepped pawn', 'Promotion is mandatory', 'Queen is the usual choice'],
    },
];

window.LESSONS = LESSONS;
