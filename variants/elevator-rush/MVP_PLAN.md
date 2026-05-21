# Office Royale - Elevator Rush MVP

## Current Playable

- Static browser prototype: `index.html`, `styles.css`, `game.js`
- One human player plus 49 simulated participants
- Left-to-right elevator race battle royale
- Players rush toward the final elevator before the deadline
- Players outside the elevator, or too late for capacity, are eliminated
- Pits and side falls cause nearby respawn and brief stun instead of immediate elimination
- Outer edge fall-off, fixed walls, moving sweep-bar obstacles, and rotating bars
- Randomized room layout each match: wall set, moving bars, rotating bars, speeds, and angles
- Desktop controls: WASD / arrow keys, hold and release Space burst
- Mobile controls: virtual joystick, hold and release burst button
- Player-view camera mode with zoomed follow camera and host/god-view toggle
- Event notifications for burst hits, eliminations, boarding deadlines, and remaining-player milestones
- Results screen with rank, survival time, burst hits, push-outs, award, and restart flow

## MVP Direction

This variant tests whether the same Office Royale movement and burst controls work better with a clear objective: rush into the open elevator before the doors close.

The intended event moment is the crowd collapsing toward a few safe zones, then using burst to make space or push rivals out before the deadline.

## Next Focus

- Stronger door closing animation
- Sound effects for countdown and elevator close
- Department/team scoring
- Round intro callouts
- Host screen for venue projection
