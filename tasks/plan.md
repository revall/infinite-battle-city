# Battle City — Multi-Room Migration Plan

## Context

The game currently runs on PartyKit (`party/index.ts`) with a single hardcoded room.
This plan migrates to a plain Node.js + `ws` server and adds two-mode room support:
- **Public rooms** — auto-created; browseable list + auto-assign
- **Private rooms** — created on demand; joined via invite URL `/?room=CODE`

---

## Current State (what already exists)

| Location | What it does |
|---|---|
| `party/index.ts` | PartyKit server: single room, 20 Hz game loop, `tickGame` |
| `packages/client/src/ws/useGameSocket.ts` | Uses `PartySocket`, hardcoded `ROOM = 'main'` |
| `packages/client/src/store/roomStore.ts` | Holds `playerName` + `roomId` (roomId unused) |
| `packages/client/src/components/Lobby.tsx` | Name entry only — no room selection |
| `packages/shared` | Pure game logic — unchanged by this plan |

---

## Dependency Graph

```
packages/shared  (+ RoomInfo type, update ServerMsg union)
       ↓
packages/server  (Node.js + ws, RoomInstance, RoomManager, HTTP API)
       ↓
useGameSocket    (native WebSocket, VITE_WS_URL, accepts roomId)
       ↓
roomStore        (room list, room type, roomId state)
       ↓
Lobby.tsx        (mode select → browse / auto-assign / create private)
       ↓
App.tsx          (?room=CODE URL param → bypass lobby for invite links)
       ↓
[cleanup]        (delete party/, remove partysocket dep)
```

---

## Phase 1 — New Server (single room, drop-in replacement)

### T1: Bootstrap `packages/server`

Create `packages/server` as a new workspace package. Port `party/index.ts` logic into
`packages/server/src/index.ts` as a self-contained Node.js + `ws` process.

**What to build:**
- `RoomInstance` class — owns a `GameState`, `setInterval` game loop, `Map<connId, WebSocket>`, and `inputs` map; extracted 1:1 from `party/index.ts`
- Entry point creates one `RoomInstance` with id `"main"` and a `WebSocketServer` on `process.env.PORT ?? 3001`
- Message protocol unchanged (`welcome`, `join`, `input`, `rematch`, `state`) — no client changes needed yet

**Acceptance criteria:**
- `node packages/server/dist/index.js` starts without errors
- A client using native WebSocket (`new WebSocket('ws://localhost:3001?room=main')`) can connect and play a full round

**Verification:** Temporarily set `VITE_WS_URL=ws://localhost:3001` and open the game in a browser. Tank appears, moves, shoots.

---

### T2: Replace `PartySocket` with native WebSocket in client

Update `useGameSocket.ts` to use the browser's native `WebSocket` instead of `PartySocket`.
The server URL comes from `import.meta.env.VITE_WS_URL`.

**What to build:**
- Remove `partysocket` import; use `new WebSocket(\`${VITE_WS_URL}?room=${roomId}\`)`
- `roomId` parameter (defaults to `"main"` for now — wired properly in T5)
- Reconnect on close (simple: retry after 1 s, max 5 attempts)
- All existing message handling (`welcome`, `state`) unchanged

**Acceptance criteria:**
- Game connects and plays through `packages/server` (no PartyKit)
- Console shows no PartySocket references

**Verification:** `pnpm dev` in client with `VITE_WS_URL` set; full game works.

---

### CHECKPOINT 1
**Gate:** Full game works end-to-end through the new Node.js server. PartyKit is no longer required to run.

---

## Phase 2 — Room Manager (server side)

### T3: Add `RoomInfo` type to shared

Add to `packages/shared/src/types.ts`:

```ts
export interface RoomInfo {
  id: string
  playerCount: number
  phase: RoundPhase
  isPrivate: boolean
}
```

Add to the server→client message union (also in shared):
```ts
{ type: 'rooms'; rooms: RoomInfo[] }
```

**Acceptance criteria:** Strict TypeScript build passes. No browser/Node APIs in shared.

---

### T4: `RoomManager` + multi-room server

Replace the single hardcoded room with a `RoomManager` that holds `Map<string, RoomInstance>`.

**What to build:**
- `RoomManager`:
  - `getOrCreatePublic()` — returns the least-full public room that has < 40 players; creates a new public room if none exists
  - `createPrivate()` — generates a 6-char alphanumeric code, creates a `RoomInstance` with `isPrivate: true`, returns the code
  - `get(id)` — returns `RoomInstance | undefined`
  - `publicRooms()` — returns `RoomInfo[]` for non-private rooms only
  - On connection: parse `?room=<id>` from the WebSocket upgrade URL; if id present route to that room; otherwise route to `getOrCreatePublic()`
  - On room empty: dissolve the `RoomInstance` (clear interval, delete from map)
- HTTP server on same port (`/rooms` GET, `/rooms` POST) via Node's built-in `http.createServer`; `ws.Server` is attached to the same `http.Server`

**HTTP API:**
- `GET /rooms` → `200 { rooms: RoomInfo[] }` (public rooms only)
- `POST /rooms` → `201 { roomId: string }` (creates private room, returns code)

**Acceptance criteria:**
- Two clients connecting to different room IDs maintain completely independent game states
- `GET /rooms` returns only public rooms
- `POST /rooms` creates a private room not visible in `GET /rooms`
- Empty room is dissolved (no memory leak after all players leave)

**Verification:**
- `curl http://localhost:3001/rooms` returns `[]` when idle
- Open two browser tabs with different `?room=` values; they cannot see each other's tanks

---

### CHECKPOINT 2
**Gate:** Server manages multiple rooms. HTTP API returns correct room metadata.

---

## Phase 3 — Lobby UI and Room Selection

### T5: Update `roomStore`

Extend `packages/client/src/store/roomStore.ts`:

```ts
interface RoomState {
  playerName: string
  roomId: string | null
  roomType: 'public' | 'private' | null
  rooms: RoomInfo[]          // fetched public room list
  setPlayerName: (name: string) => void
  setRoom: (id: string, type: 'public' | 'private') => void
  setRooms: (rooms: RoomInfo[]) => void
}
```

**Acceptance criteria:** TypeScript strict build passes; `roomId` and `roomType` flow to `useGameSocket`.

---

### T6: Update `useGameSocket` to use `roomId` from store

Wire `roomId` from `roomStore` into `useGameSocket`. When `roomId` is null, don't connect.

**Acceptance criteria:** Socket connects only after `roomId` is set; reconnects if `roomId` changes.

---

### T7: Lobby room-selection UI

Replace the current single-step Lobby with a two-step flow:

**Step 1 — Name entry** (existing screen, unchanged)

**Step 2 — Room mode** (new screen, shown after name submit):
- **"AUTO-JOIN"** button — calls `GET /rooms`, picks least-full room, falls back to auto-assign via server; sets `roomId` in store; navigates to `/game`
- **"BROWSE ROOMS"** button — shows a table of public rooms (`id`, player count, phase); player clicks a row to join; "REFRESH" button re-fetches; "BACK" goes to mode screen
- **"CREATE PRIVATE ROOM"** button — calls `POST /rooms`; receives code; shows "Share this link: `/?room=CODE`" with a copy button; then navigates to `/game` with that room

**Acceptance criteria:**
- Auto-join places player in an existing room if one has space
- Browse list shows live room states (re-fetch on each visit to screen)
- Private room creation shows the invite URL before navigating to game
- Error states shown if server unreachable

**Verification:** Manual test all three paths. Verify two players can both join the same browsed room and see each other's tanks.

---

### CHECKPOINT 3
**Gate:** All three join paths work. Two players in the same room see each other. Two players in different rooms do not.

---

## Phase 4 — Invite URL Routing

### T8: `/?room=CODE` invite link support

When the client loads with `?room=CODE` in the URL, skip the lobby entirely and join
that room directly — the user only needs to enter their name.

**What to build:**
- In `App.tsx`, read `new URLSearchParams(window.location.search).get('room')` on mount
- If present: show a "name entry only" variant of the lobby (no room selection), then navigate to `/game` with that `roomId`
- If the room no longer exists the server will send an `error` message (`{ type: 'error', message: string }`) — show it on screen and redirect to the full lobby

**Acceptance criteria:**
- Pasting `http://localhost:5173/play/?room=ABC123` in a new tab: only asks for name, then joins the game
- Joining a non-existent room shows an error and redirects to lobby

**Verification:** Create a private room; copy the URL; open in a new incognito tab; enter a name; both players see each other.

---

## Phase 5 — Cleanup

### T9: Remove PartyKit

- Delete `party/` directory
- Remove `partysocket` from `packages/client/package.json`
- Remove `partykit` devDependency from root `package.json` (if present)
- Verify `pnpm build` succeeds with no PartyKit references

**Acceptance criteria:** `grep -r partykit .` (excluding node_modules) returns nothing. `pnpm build` passes.

---

### CHECKPOINT 4 (done)
**Gate:** Full smoke test passes. All room paths work. No PartyKit. `pnpm build` clean.

---

## Manual Smoke Test Checklist

- [ ] Auto-join places player in a room; tank appears and moves
- [ ] Browse rooms list shows running rooms with correct player counts
- [ ] Two players join same room via Browse; see each other's tanks
- [ ] Private room created; share URL opens in new tab; both players in same room
- [ ] Private room not visible in Browse list
- [ ] Room dissolves when last player leaves (verify via `GET /rooms`)
- [ ] Full round plays to completion; scoreboard shows; rematch works
- [ ] `VITE_WS_URL` env var controls server address with no code changes
