# Chess Game

A fully-featured chess game built with HTML, CSS, and JavaScript. Play against an AI opponent or challenge a friend in hotseat mode.

## Live Site

**https://sufiyan-sabeel.github.io/Chess-Game/**

## Features

- **Play vs Computer** — AI opponent with evaluation-based move selection
- **Play vs Human** — Hotseat mode for local multiplayer on the same device
- **Full Chess Rules** — Check, checkmate, stalemate, castling, en passant, pawn promotion
- **Move Highlights** — Visual indicators for valid moves and captures
- **Sound Effects** — Move, capture, check, and game start sounds
- **Dark Theme** — Sleek responsive design with Tailwind CSS
- **User System** — Login/signup with localStorage persistence
- **Game History** — Track wins, losses, and draws per profile
- **Admin Panel** — Dashboard to manage registered users

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Home — choose game mode |
| `login.html` | Login / Sign up |
| `game.html?mode=ai` | Play vs Computer |
| `game.html?mode=hotseat` | Play vs Human |
| `profile.html` | User profile and game history |
| `admin/login.html` | Admin login (default: admin / admin123) |
| `admin/index.html` | Admin dashboard |
| `admin/users.html` | Manage users |

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript
- Tailwind CSS (CDN)
- Font Awesome icons (CDN)
- localStorage for data persistence

## License

MIT
