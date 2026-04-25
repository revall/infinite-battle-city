# Battle City — Online Multiplayer: Specification

## 1. Objective

Browser-based online multiplayer free-for-all remake of NES Battle City.
Players join public rooms or create private rooms shared via invite link, fight on a large destructible map, and compete for most kills.
Target users: casual gamers wanting a quick nostalgic competitive session in a browser tab.

---

## 2. Core Features

### Lobby
- Single screen: enter a name, then choose a room
- **Two room modes:**
  - **Public rooms** — auto-created by the server when all existing rooms are full (max 40 players each); player can browse a live room list and pick one, or click "Auto-assign" to be placed in the least-full available room
  - **Private rooms** — player clicks "Create private room"; server generates a short random code (e.g. `ABC-123`); player shares the URL `/?room=ABC-123` to invite others; room does not appear in the public room list
- Game starts as soon as the first player connects to a room; latecomers spawn in mid-round
- Map is generated once when the first player connects to a room; persists until round ends
- A room is dissolved when all players have left

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
- **Sync**: Native WebSockets; `ws` library on the server, native `WebSocket` on the client
- **Architecture**: server-authoritative — `packages/server` runs one Node.js process; each room runs its own `setInterval` game loop at 20 Hz with 3 physics sub-ticks (60 Hz physics resolution); clients send `InputEvent` messages, receive `GameState` snapshots, and render; rooms are kept in a server-side `Map` and dissolved when empty
- **Deployment**: client as static site (Vite → any static host); server as a persistent Node.js process on any host that supports long-lived TCP connections (Fly.io, Railway, Render, a VPS, bare metal, etc.); server address configured via `VITE_WS_URL` env var on the client
- **Monorepo**: `packages/shared` (pure types, physics, `tickGame`), `packages/client` (React + WebSocket), `packages/server` (Node.js + `ws`, room manager, game loops)

---

## 4. Code Style

- TypeScript strict mode, no `any`
- Shared types in `packages/shared` only — no browser or Node APIs there
- Plain objects + pure functions for game entities and physics (no classes)
- Message protocol is JSON with a `type` discriminant; defined in `packages/shared` and imported by both client and server
- Single `requestAnimationFrame` loop on the client; no React state updates inside draw loop

---

## 5. Testing

- Vitest unit tests on `packages/shared` (physics, collision, tile destruction, `tickGame`, map generation)
- 80% coverage target on `packages/shared`
- No browser automation for v1 — manual smoke test checklist

---

## 6. Boundaries

### Always
- All game state mutations run in the PartyKit server (Durable Object); clients are display-only
- Validate incoming client messages in `onMessage` before applying to state
- Keep `packages/shared` free of browser/Node APIs so it runs in both the browser and the Cloudflare Worker runtime

### Ask first
- Database or persistent accounts
- Game engine (Phaser, Pixi)
- Private room host controls (kick, manual round start, settings)
- Mobile/touch, spectator mode, team/co-op modes

### Never
- Trust client-reported positions or scores
- Store PII — rooms are anonymous

---

## 7. Out of Scope (v1)

Persistent accounts, level editor, mobile controls, sound, chat, AI tanks, team modes
