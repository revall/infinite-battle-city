# Battle City — Online Multiplayer: Specification

## 1. Objective

Browser-based online multiplayer free-for-all remake of NES Battle City.
Up to 40 players connect, fight on a large destructible map, and compete for most kills.
Target users: casual gamers wanting a quick nostalgic competitive session in a browser tab.

---

## 2. Core Features

### Lobby
- Single screen: enter a name, then join immediately
- Single global room — all players share the same game
- Game starts as soon as the first player connects; latecomers spawn in mid-round
- Map is generated once when the first player connects; persists until round ends

### Gameplay
- Free-for-all: 5-minute rounds, most kills wins
- Each player controls one tank: move in 4 directions, shoot
- Respawn 3 seconds after death at a random unoccupied spawn point
- End-of-round leaderboard; rematch vote to replay

### Terrain (128×128 tile map, camera follows local player)
- Brick walls — destroyed by bullets
- Steel walls — indestructible
- Water — blocks tanks, passable by bullets
- Trees — passable by tanks, renders on top (hides tank)
- Ice — reduced friction / sliding

### Maps
- Procedurally generated each round (simple random placement of terrain clusters)

---

## 3. Tech Stack

- **Frontend**: React 18 + TypeScript, HTML5 Canvas (imperative draw loop), Zustand (local UI only), Vite
- **Sync**: [Jazz](https://jazz.tools/) (`jazz-tools`, `jazz-react`) via Jazz Cloud
- **Architecture**: host-authority — room creator runs the 60 Hz physics loop, writes `GameState` to a Jazz `CoMap`; other clients read and render; each client writes inputs to their own Jazz `CoStream`; host migration on disconnect
- **Deployment**: static site only (no server); Vite build → Vercel/Netlify
- **Monorepo**: `packages/shared` (pure types + physics), `packages/client` (React + Jazz)

---

## 4. Code Style

- TypeScript strict mode, no `any`
- Shared types in `packages/shared` only — no browser or Node APIs there
- Plain objects + pure functions for game entities and physics (no classes)
- Jazz schema defined once in `jazz/schema.ts`; no Jazz objects constructed elsewhere
- Single `requestAnimationFrame` loop; no React state updates inside draw loop

---

## 5. Testing

- Vitest unit tests on `packages/shared` (physics, collision, tile destruction)
- Vitest tests on `hostLoop.ts` (tick behavior, scoring, respawn)
- 80% coverage target on both
- No browser automation for v1 — manual smoke test checklist

---

## 6. Boundaries

### Always
- All game state mutations run in the host's physics loop; other clients are display-only
- Validate Jazz input stream entries in the host loop before applying
- Keep `packages/shared` free of browser/Node APIs

### Ask first
- Database or persistent accounts
- Game engine (Phaser, Pixi)
- Dedicated Node.js server
- Mobile/touch, spectator mode, team/co-op modes

### Never
- Trust client-reported positions or scores
- Store PII — rooms are anonymous

---

## 7. Out of Scope (v1)

Persistent accounts, level editor, mobile controls, sound, chat, AI tanks, team modes
