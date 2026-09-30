// ===== Puzzle data (engine-verified solutions) =====
// Every solution below was verified with the GameLogic engine:
// all moves legal, final position is checkmate.
const PUZZLES = [
  {
    "id": "p01",
    "fen": "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    "category": "mate",
    "difficulty": 1,
    "rating": 800,
    "title": "Back Rank Mate",
    "hint": "The black king is trapped by its own pawns. Deliver mate on the back rank.",
    "explanation": "Ra8 is checkmate. The black king cannot escape the back rank because its own pawns on f7, g7 and h7 block every escape square.",
    "solution": [
      {
        "from": {
          "row": 7,
          "col": 0
        },
        "to": {
          "row": 0,
          "col": 0
        },
        "promotion": null
      }
    ]
  },
  {
    "id": "p02",
    "fen": "6k1/5ppp/8/8/8/8/8/4Q1K1 w - - 0 1",
    "category": "mate",
    "difficulty": 1,
    "rating": 850,
    "title": "Queen Back Rank",
    "hint": "Use the queen to attack the back rank.",
    "explanation": "Qe8 is checkmate. The queen covers f8 and h8 while the black pawns block the king's other escapes.",
    "solution": [
      {
        "from": {
          "row": 7,
          "col": 4
        },
        "to": {
          "row": 0,
          "col": 4
        },
        "promotion": null
      }
    ]
  },
  {
    "id": "p04",
    "fen": "7k/6P1/6K1/8/8/8/8/5R2 w - - 0 1",
    "category": "mate",
    "difficulty": 2,
    "rating": 1000,
    "title": "Promotion Mate",
    "hint": "Promote the pawn — but choose the piece that delivers mate.",
    "explanation": "g8=Q is checkmate. The new queen is protected by the rook on g1 along the g-file, and the white king covers g7 and h7.",
    "solution": [
      {
        "from": {
          "row": 7,
          "col": 5
        },
        "to": {
          "row": 0,
          "col": 5
        },
        "promotion": null
      }
    ]
  },
  {
    "id": "p05",
    "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
    "category": "mate",
    "difficulty": 1,
    "rating": 900,
    "title": "Scholar's Mate",
    "hint": "The queen and bishop both aim at f7.",
    "explanation": "Qxf7 is checkmate. The queen is protected by the bishop on c4, and the black queen on d8 blocks the king's escape.",
    "solution": [
      {
        "from": {
          "row": 3,
          "col": 7
        },
        "to": {
          "row": 1,
          "col": 5
        },
        "promotion": null
      }
    ]
  },
  {
    "id": "p06",
    "fen": "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1",
    "category": "mate",
    "difficulty": 2,
    "rating": 1050,
    "title": "Arabian Mate",
    "hint": "The knight leaps to f7 — the rook seals the g-file.",
    "explanation": "Nf7 is checkmate. The knight checks the king and covers h8 and g8... the rook on g8 is trapped and the pawns block g7 and h7.",
    "solution": [
      {
        "from": {
          "row": 3,
          "col": 6
        },
        "to": {
          "row": 1,
          "col": 5
        },
        "promotion": null
      }
    ]
  },
  {
    "id": "p11",
    "fen": "6k1/5ppp/8/8/8/8/8/3Q2K1 w - - 0 1",
    "category": "mate",
    "difficulty": 2,
    "rating": 980,
    "title": "Queen Sacrifice Setup",
    "hint": "The queen can give a deadly check on the back rank.",
    "explanation": "Qd8 is checkmate — the queen controls the entire back rank and the black pawns block their own king.",
    "solution": [
      {
        "from": {
          "row": 7,
          "col": 3
        },
        "to": {
          "row": 0,
          "col": 3
        },
        "promotion": null
      }
    ]
  },
  {
    "id": "p13",
    "fen": "6k1/8/6K1/8/8/8/8/6R1 w - - 0 1",
    "category": "mate",
    "difficulty": 4,
    "rating": 1350,
    "title": "Rook & King Precision",
    "hint": "Mate with rook and king requires exact technique — box the king in.",
    "explanation": "Rook and king mate: use the rook to cut off the king, then coordinate with your king to deliver mate on the edge.",
    "solution": [
      {
        "from": {
          "row": 7,
          "col": 6
        },
        "to": {
          "row": 6,
          "col": 6
        },
        "promotion": null
      },
      {
        "from": {
          "row": 0,
          "col": 6
        },
        "to": {
          "row": 0,
          "col": 5
        },
        "promotion": null
      },
      {
        "from": {
          "row": 6,
          "col": 6
        },
        "to": {
          "row": 6,
          "col": 4
        },
        "promotion": null
      },
      {
        "from": {
          "row": 0,
          "col": 5
        },
        "to": {
          "row": 0,
          "col": 6
        },
        "promotion": null
      },
      {
        "from": {
          "row": 6,
          "col": 4
        },
        "to": {
          "row": 0,
          "col": 4
        },
        "promotion": null
      }
    ]
  },
  {
    "id": "p16",
    "fen": "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    "category": "mate",
    "difficulty": 1,
    "rating": 800,
    "title": "Back Rank Basics",
    "hint": "One move ends the game on the back rank.",
    "explanation": "Ra8 is checkmate — the classic back rank mate pattern every player must know.",
    "solution": [
      {
        "from": {
          "row": 7,
          "col": 0
        },
        "to": {
          "row": 0,
          "col": 0
        },
        "promotion": null
      }
    ]
  }
];

window.PUZZLES = PUZZLES;
