# Battle City — Task List (Multi-Room Migration)

## Phase 1 — New Server (drop-in replacement)
- [x] T1: Bootstrap `packages/server` — Node.js + `ws`, port `party/index.ts` to `RoomInstance`, single hardcoded room
- [x] T2: Replace `PartySocket` with native `WebSocket` in `useGameSocket.ts`

### CHECKPOINT 1: full game works through new Node.js server, no PartyKit required

## Phase 2 — Room Manager
- [x] T3: Add `RoomInfo` type + `rooms` server message to `packages/shared`
- [x] T4: `RoomManager` — multi-room Map, auto-create public, create private, HTTP API (`GET /rooms`, `POST /rooms`), dissolve empty rooms

### CHECKPOINT 2: server manages multiple independent rooms; HTTP API returns room metadata

## Phase 3 — Lobby UI
- [x] T5: Extend `roomStore` — add `roomType`, `rooms[]`, `setRoom`
- [x] T6: Wire `roomId` from store into `useGameSocket` (connect only when roomId set)
- [x] T7: Lobby two-step UI — auto-join, browse rooms table, create private room with invite URL

### CHECKPOINT 3: all three join paths work; two players in same room see each other

## Phase 4 — Invite URL
- [x] T8: `/?room=CODE` invite link support — read URL param on load, skip room-select step

## Phase 5 — Cleanup
- [ ] T9: Remove `party/`, `partysocket` dep; `pnpm build` clean

### CHECKPOINT 4 (done): smoke test passes, no PartyKit, build clean
