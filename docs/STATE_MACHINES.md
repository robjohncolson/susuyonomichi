# State Machines Documentation

This document describes the state machines and component behaviors in the Pipette Tip Tracker application.

## Table of Contents
1. [Tip Management System](#1-tip-management-system)
2. [Grid Coordinate System](#2-grid-coordinate-system)
3. [Token Reward System](#3-token-reward-system)
4. [Pong Game State Machine](#4-pong-game-state-machine)
5. [UI Component States](#5-ui-component-states)

---

## 1. Tip Management System

### 1.1 Tip Data Model
```
Tip {
  ingredient: string      // Name of the perfume ingredient
  tipSize: 10 | 100      // Tip size in µL (determines which box)
  row: string            // First coordinate part (entered by user)
  col: string            // Second coordinate part (entered by user)
  coord: string          // Combined coordinate (row + col)
  date: ISO8601 string   // When the tip was added
}
```

### 1.2 Add Tip Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                         ADD TIP FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Input                                                     │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────┐                                                    │
│  │ Validate │──────► Missing fields? ──► alert() ──► STOP      │
│  │  Input   │                                                   │
│  └────┬────┘                                                    │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────┐                                               │
│  │ Check if     │                                               │
│  │ coord+tipSize│──► Exists? ──► confirm() ──► Cancel? ──► STOP│
│  │ exists       │                    │                          │
│  └──────┬───────┘                    │                          │
│         │                            ▼                          │
│         │                     Remove existing                   │
│         │                            │                          │
│         ▼                            │                          │
│  ┌─────────────┐◄────────────────────┘                          │
│  │  Add tip    │                                                │
│  │  to array   │                                                │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                                │
│  │    save()   │──► localStorage.setItem('pipetteTips')        │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ├──► renderTable()                                      │
│         ├──► renderGrid()                                       │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────┐                                            │
│  │ Increment       │                                            │
│  │ tipsAddedCount  │                                            │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│     count % 5 == 0? ──► YES ──► gameTokens++ ──► showToast()   │
│           │                                                     │
│           ▼                                                     │
│     Clear input fields                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Delete Tip Flow
```
deleteTip(coord, tipSize)
        │
        ▼
  confirm() ──► Cancel? ──► STOP
        │
        ▼
  Filter tips array (remove matching coord AND tipSize)
        │
        ├──► save()
        ├──► renderTable()
        └──► renderGrid()
```

---

## 2. Grid Coordinate System

### 2.1 Two Boxes, Two Conventions

The application supports two separate physical storage boxes with different labeling conventions:

```
┌─────────────────────────────────────────────────────────────────┐
│                    COORDINATE CONVENTIONS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  10µL BOX                          100µL BOX                    │
│  ─────────                         ──────────                   │
│  Rows: A-H (letters, vertical)     Columns: A-L (letters, horiz)│
│  Cols: 1-12 (numbers, horizontal)  Rows: 1-8 (numbers, vertical)│
│                                                                 │
│  Coordinate format: [Row][Col]     Coordinate format: [Col][Row]│
│  Example: "D8" = row D, col 8      Example: "D8" = col D, row 8 │
│                                                                 │
│  Physical grid position:           Physical grid position:      │
│  - Row index = letter index        - Row index = number - 1     │
│  - Col index = number - 1          - Col index = letter index   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Grid Rendering Logic
```
For each grid cell (r, c) where r=0..7, c=0..11:

  1. Calculate expected coord for 10µL tip:
     coord10 = rowLetters[r] + colNumbers[c]
     (e.g., r=0, c=0 → "A1")

  2. Calculate expected coord for 100µL tip:
     coord100 = colLetters[c] + rowNumbers[r]
     (e.g., r=0, c=0 → "A1"; r=7, c=11 → "L8")

  3. Search tips array for match:
     tip = tips.find(t =>
       (t.tipSize === 10 && t.coord === coord10) ||
       (t.tipSize === 100 && t.coord === coord100)
     )

  4. Render cell (empty or with tip info)
```

### 2.3 Input Label Swapping
```
┌──────────────────────────────────────────────────────────────┐
│                   updateCoordLabels()                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  tipSize === '10'                tipSize === '100'           │
│  ─────────────────               ──────────────────          │
│  Label 1: "Row"                  Label 1: "Column"           │
│  Label 2: "Column"               Label 2: "Row"              │
│  Input 1 placeholder: "A"        Input 1 placeholder: "A"    │
│  Input 2 placeholder: "1"        Input 2 placeholder: "1"    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Token Reward System

### 3.1 Token Economy
```
┌─────────────────────────────────────────────────────────────────┐
│                      TOKEN ECONOMY                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EARNING TOKENS                                                 │
│  ──────────────                                                 │
│  • Every 5 tips added = 1 game token                            │
│  • Tracked via: tipsAddedCount (persisted in localStorage)      │
│  • Formula: tokens = floor(tipsAddedCount / 5)                  │
│                                                                 │
│  SPENDING TOKENS                                                │
│  ───────────────                                                │
│  • Playing Pong costs 1 token (consumed on game END)            │
│  • Token deducted regardless of win/lose                        │
│                                                                 │
│  PERSISTENCE                                                    │
│  ───────────                                                    │
│  • localStorage.pongTokens = current token count                │
│  • localStorage.tipsAddedCount = lifetime tips added            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Token Display State
```
                    gameTokens value
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
   gameTokens < 1                    gameTokens >= 1
        │                                   │
        ▼                                   ▼
  Button disabled                    Button enabled
  (gray, no animation)               (gradient, pulsing glow)
```

---

## 4. Pong Game State Machine

### 4.1 Game Phases
```
┌─────────────────────────────────────────────────────────────────┐
│                     PONG GAME PHASES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        startPong()                              │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      COUNTDOWN                            │   │
│  │  • countdown: 3 → 2 → 1 → 0                              │   │
│  │  • Display: "3", "2", "1", "GO!"                         │   │
│  │  • Ball stationary at center                             │   │
│  │  • Input ignored                                         │   │
│  └─────────────────────────┬────────────────────────────────┘   │
│                            │ countdown <= 0                     │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                       PLAYING                             │   │
│  │  • Ball moving, physics active                           │   │
│  │  • Player input processed (W/S/Arrows)                   │   │
│  │  • AI tracking ball                                      │   │
│  │  • Collision detection active                            │   │
│  │  • Score tracked                                         │   │
│  └─────────────────────────┬────────────────────────────────┘   │
│                            │ score reaches 5                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      FINISHED                             │   │
│  │  • Game loop stops                                       │   │
│  │  • Token consumed (gameTokens--)                         │   │
│  │  • Result overlay shown                                  │   │
│  │  • Win/Lose sound plays                                  │   │
│  │  • Auto-close after 3 seconds                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ESCAPE or closePong() at any time → immediate close            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Game Loop (pongLoop)
```
pongLoop(timestamp)
    │
    ├──► Calculate deltaTime
    │
    ├──► Phase check
    │       │
    │       ├─ COUNTDOWN: decrement countdown
    │       │             if <= 0: phase = 'playing', serveBall()
    │       │
    │       └─ PLAYING: updatePong(deltaTime)
    │
    ├──► renderPong()
    │
    └──► if phase !== 'finished': requestAnimationFrame(pongLoop)
```

### 4.3 Physics Update (updatePong)
```
updatePong(dt)
    │
    ├──► Move player paddle (based on input.up/down)
    │
    ├──► Update AI paddle (predict and track)
    │
    ├──► Move ball (x += vx, y += vy)
    │
    ├──► Check wall collisions (top/bottom)
    │       └──► Bounce if hit (reverse vy)
    │
    ├──► Check player paddle collision
    │       └──► Reflect ball, increase speed
    │
    ├──► Check AI paddle collision
    │       └──► Reflect ball, increase speed
    │
    └──► Check scoring (ball past left/right edge)
            │
            ├──► Increment score
            ├──► Check win condition
            └──► Schedule serveBall() if game continues
```

### 4.4 AI Behavior
```
┌─────────────────────────────────────────────────────────────────┐
│                      AI PADDLE LOGIC                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  if ball.vx > 0 (ball coming toward AI):                        │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────────┐                    │
│  │ Predict Y at AI's X position            │                    │
│  │ • Calculate time to reach               │                    │
│  │ • Project Y with velocity               │                    │
│  │ • Simulate bounces off walls            │                    │
│  │ • Add random offset (±15px)             │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                 │
│  else (ball going away):                                        │
│      │                                                          │
│      ▼                                                          │
│  Return to center position                                      │
│                                                                 │
│  Movement: 90% of player speed (beatable but challenging)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Input Handling
```
┌─────────────────────────────────────────────────────────────────┐
│                      INPUT HANDLING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  KEYBOARD                                                       │
│  ────────                                                       │
│  • W / w / ArrowUp    → input.up = true/false                   │
│  • S / s / ArrowDown  → input.down = true/false                 │
│  • Escape             → closePong()                             │
│                                                                 │
│  EVENT LIFECYCLE                                                │
│  ───────────────                                                │
│  startPong():                                                   │
│    document.addEventListener('keydown', pongKeyDown)            │
│    document.addEventListener('keyup', pongKeyUp)                │
│                                                                 │
│  closePong():                                                   │
│    document.removeEventListener('keydown', pongKeyDown)         │
│    document.removeEventListener('keyup', pongKeyUp)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. UI Component States

### 5.1 Table Sorting
```
sortBy(field)
    │
    ├──► Same field? Toggle sortAsc
    │
    └──► Different field? Set sortField, sortAsc = true
            │
            └──► renderTable()
```

### 5.2 Search Filtering
```
Search input.oninput
    │
    └──► renderTable()
            │
            └──► Filter tips by ingredient.toLowerCase().includes(query)
```

### 5.3 Tooltip State
```
┌───────────────────────────────────────────────────────────────┐
│                    TOOLTIP COMPONENT                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  HIDDEN (default)                                             │
│     │                                                         │
│     │ mouseenter on grid cell                                 │
│     ▼                                                         │
│  VISIBLE                                                      │
│  • position: mouse coords + offset                            │
│  • content: "{ingredient} ({tipSize}µL) @ {coord}"            │
│     │                                                         │
│     │ mouseleave                                              │
│     ▼                                                         │
│  HIDDEN                                                       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 5.4 Data Persistence
```
┌─────────────────────────────────────────────────────────────────┐
│                    localStorage KEYS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  KEY                  │ TYPE      │ DESCRIPTION                 │
│  ─────────────────────┼───────────┼─────────────────────────────│
│  pipetteTips          │ JSON[]    │ Array of tip objects        │
│  pongTokens           │ number    │ Current game token count    │
│  tipsAddedCount       │ number    │ Lifetime tips added         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix: State Transitions Summary

```
APPLICATION INITIALIZATION
──────────────────────────
1. Parse localStorage for tips, gameTokens, tipsAddedCount
2. renderTable()
3. renderGrid()
4. updateTokenDisplay()
5. Setup keyboard listeners for Enter key navigation

USER ACTIONS
────────────
• Add tip → validate → save → render → maybe award token
• Delete tip → confirm → filter → save → render
• Search → filter display (no save)
• Sort → reorder display (no save)
• Change tip size → swap input labels
• Play Pong → open overlay → game loop → consume token → close
• Export → create JSON blob → download
• Import → parse JSON → merge → save → render
• Clear all → confirm → empty → save → render
```
