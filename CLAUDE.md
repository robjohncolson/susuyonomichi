# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Susuyomichi (煤夜道) is a perfume formulation project containing lab tools and formula documentation for creating an animalic leather chypre/aromatic fougère fragrance.

## Files

| File | Description |
|------|-------------|
| `pipette_tracker.html` | Single-file web app for tracking pipette tip locations in two 96-well boxes |
| `susuyomichi_current.tex` | LaTeX formula document with ingredients by category |
| `src/tip-tracker.js` | Testable core logic for tip management |
| `src/pong-game.js` | Testable core logic for Pong game |
| `docs/STATE_MACHINES.md` | State machine documentation for all components |

## Development

### Pipette Tracker
No build step. Open `pipette_tracker.html` directly in a browser. Data persists via localStorage.

**Two Storage Boxes:**
- **10µL box**: Rows A-H, Columns 1-12 (coord format: `A1`, `H12`)
- **100µL box**: Columns A-L, Rows 1-8 (coord format: `A1`, `L8`)

The same coordinate (e.g., `D8`) can exist in both boxes since they're separate physical storage.

**Pong Mini-game**: Reward system for cataloging tips. Every 5 tips added earns 1 game token. Click "Play Pong!" to play against a challenging AI (first to 5 wins). Uses W/S or Arrow keys.

### Running Tests
```bash
npm install
npm test              # Run all tests
npm run test:watch    # Watch mode
```

### Formula Document
Compile with any LaTeX distribution:
```bash
pdflatex susuyomichi_current.tex
```
Requires packages: array, booktabs, longtable, geometry, xcolor, fancyhdr.

## Architecture

### Coordinate System
The grid is 8 rows × 12 columns physically, but labeled differently per box:

```
10µL:  Row (A-H) + Column (1-12)  → "D8" means row D, column 8
100µL: Column (A-L) + Row (1-8)   → "D8" means column D, row 8
```

Both map to the same physical grid positions; the app transposes 100µL entries when rendering.

### State Persistence (localStorage)
- `pipetteTips` - Array of tip objects
- `pongTokens` - Current game token count
- `tipsAddedCount` - Lifetime tips added (for token calculation)

### Key Functions
- `addTip()` - Validates, checks for duplicates within same box, saves, awards tokens
- `deleteTip(coord, tipSize)` - Removes tip from specific box
- `renderGrid()` - Draws 8×12 grid, looks up tips by both conventions
- `updateCoordLabels()` - Swaps Row/Column labels when tip size changes

### Pong Game Phases
1. **countdown** - 3-2-1-GO display
2. **playing** - Active game loop with physics
3. **finished** - Result display, token consumed, auto-close

See `docs/STATE_MACHINES.md` for detailed state transition diagrams.

## Testing

Test files in `tests/`:
- `tip-tracker.test.js` - Coordinate parsing, tip CRUD, token system
- `pong-game.test.js` - Physics, collision detection, game flow

Run specific test:
```bash
npx vitest run tests/tip-tracker.test.js
```
