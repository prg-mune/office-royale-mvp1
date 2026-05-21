# Office Royale - God View MVP

## Current Playable

- Static browser prototype: `index.html`, `styles.css`, `game.js`
- One human player plus 49 simulated participants
- 2D top-down survival arena: disappearing meeting-room floor panels
- Outer edge fall-off, fixed walls, moving sweep-bar obstacles, and rotating bars
- Randomized room layout each match: wall set, moving bars, rotating bars, speeds, and angles
- Desktop controls: WASD / arrow keys, hold and release Space burst
- Mobile controls: virtual joystick, hold and release burst button
- Live HUD: alive count, rank, timer
- Event notifications for burst hits, eliminations, and remaining-player milestones
- Results screen with rank, survival time, burst hits, push-outs, award, and restart flow

## Team Split

### Game Core

- Owns game loop, player movement, collision, elimination, bot behavior
- Next focus: better bot personalities, push tuning, round scoring

### UX / Event Flow

- Owns title, lobby, results, scoreboard, event-friendly copy
- Next focus: nickname input, department selection, funny awards

### Visual / Game Feel

- Owns arena art direction, player readability, animations, effects
- Next focus: office objects, stronger elimination feedback, victory effects

### Multiplayer Foundation

- Owns future real-time room architecture
- Next focus: WebSocket server, room codes, host screen, reconnect behavior

## MVP Direction

The first real product milestone should prove that a corporate event audience immediately understands the premise, can play from a phone, and wants to retry after a short match.

Keep one match under 3 minutes. Keep controls to movement plus one action until the game feel is stable.
