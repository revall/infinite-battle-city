# Battle City — Implementation Plan

## Dependency Graph

```
Monorepo scaffold
  └── packages/shared (types, constants)
        ├── Physics (pure functions)
        ├── Map generation (pure functions)
        └── Jazz schema (CoMap/CoStream definitions)
              ├── Host loop (tick: inputs → new state)
              └── Client foundation (React, Jazz provider)
                    ├── Lobby screen (name entry)
                    ├── Game canvas + renderer
                    ├── Input handler
                    └── HUD / Scoreboard
```

---

## Phase 1 — Foundation

### T1: Monorepo scaffold
Set up pnpm workspaces with `packages/shared` and `packages/client`. Configure TypeScript strict mode, Vite, ESLint, Prettier, and Vitest in each package.

**Acceptance criteria:**
- `pnpm build` compiles both packages without errors
- `pnpm test` runs Vitest in both packages (zero tests, zero failures)
- `pnpm dev` starts the Vite dev server

**Verification:** `pnpm build && pnpm test && pnpm dev` all succeed.

---

### T2: Shared types + constants
Define all plain-object types and game constants in `packages/shared/src/`.

Types: `Tile`, `TileType`, `Tank`, `Bullet`, `Player`, `GameState`, `InputEvent`, `RoundPhase`
Constants: tile size (16 px), grid size (128×128), tank speed, bullet speed, respawn delay (3 s), round duration (300 s)

**Acceptance criteria:**
- All types exported from `packages/shared`
- No browser or Node APIs imported
- `packages/client` can import types without circular deps

**Verification:** `pnpm build` passes; import a type in client — no errors.

---

### T3: Jazz schema
Define Jazz CoMap/CoStream schema in `packages/client/src/jazz/schema.ts`.

Objects: `GameStateMap` (CoMap wrapping serialized GameState), `PlayerInputStream` (CoStream of InputEvent per player), `RoomMap` (CoMap: playerList, roundPhase, hostId)

**Acceptance criteria:**
- Schema compiles against `jazz-tools` types
- No Jazz objects constructed outside `schema.ts`

**Verification:** `pnpm build` passes.

---

## Phase 2 — Core Game Logic (no UI, fully testable)

### T4: Procedural map generation
`packages/shared/src/mapGen.ts` — pure function `generateMap(seed: number): TileGrid`.

Algorithm: fill with open tiles; scatter brick clusters (random walk); place steel walls at fixed-pattern intervals; scatter water patches; add tree clusters; ice strips along corridors. Ensure border is always steel. Place 40 spawn points in open areas spread across the grid.

**Acceptance criteria:**
- Map is always 128×128
- No spawn point is blocked by a wall or water
- Spawn points are spread (no two within 8 tiles)
- Same seed produces same map
- Different seeds produce different maps

**Verification:** Vitest unit tests covering all acceptance criteria.

---

### T5: Physics engine
`packages/shared/src/physics.ts` — pure functions:
- `moveTank(tank, input, map): Tank` — 4-direction movement with collision against walls/water/other tanks
- `moveBullet(bullet, map): { bullet: Bullet, hit: HitResult }` — trajectory + tile/tank hit detection
- `destroyTile(map, x, y): TileGrid` — brick → open; steel unchanged
- `checkTankCollision(a: Tank, b: Tank): boolean`

**Acceptance criteria:**
- Tanks cannot enter wall or water tiles
- Bullets stop on steel; destroy brick on hit
- Bullet hits tank → `HitResult` identifies the tank
- All functions are pure (no mutation of input)

**Verification:** Vitest unit tests for each function, including edge cases (corner collisions, simultaneous hits).

---

### T6: Host loop
`packages/client/src/jazz/hostLoop.ts` — `tickGame(state: GameState, inputs: InputEvent[]): GameState`.

Each 60 Hz tick: collect pending inputs from all player streams, apply movement, advance bullets, resolve collisions, handle kills (increment score), trigger respawn countdown, check round timer.

**Acceptance criteria:**
- Given a state + input list, returns correct new state
- Kill increments killer's score; marks victim as dead with respawn countdown
- Round ends when timer reaches 0 → `roundPhase: 'ended'`
- Dead tanks do not move or shoot

**Verification:** Vitest tests: single-tick movement, kill detection, respawn countdown, round end transition.

---

### CHECKPOINT A
**Gate:** `pnpm test` passes on all shared + hostLoop tests, 80%+ coverage.

---

## Phase 3 — Walking Skeleton

### T7: Client foundation
React entry (`main.tsx`) with Jazz provider (Jazz Cloud credentials from env var). App router: `/` → Lobby, `/game` → Game. Blank canvas renders at full viewport.

**Acceptance criteria:**
- App loads in browser without errors
- Jazz provider connects to Jazz Cloud
- Routing works between screens

**Verification:** Open in browser; no console errors; navigate to `/game` — blank canvas visible.

---

### T8: Lobby screen
`Lobby.tsx` — text input for player name + Join button. On submit: create/join the global Jazz `RoomMap`, write player entry, navigate to `/game`.

**Acceptance criteria:**
- Empty name is rejected (inline validation)
- On valid submit, player appears in `RoomMap.playerList`
- First player to join triggers map generation (stored in `RoomMap`)

**Verification:** Open two browser tabs; both enter names; both appear in Jazz playerList (check via Jazz devtools or console log).

---

### T9: Game canvas + renderer
`renderer.ts` draws the full `GameState` onto canvas each `requestAnimationFrame`. Camera offset centers on local player's tank. Draw order: terrain → water → tanks → bullets → trees.

**Acceptance criteria:**
- Map tiles render with correct colors/patterns per type
- Local tank visible at center of viewport
- Camera scrolls as tank approaches map edges (clamped to map bounds)
- Renderer never calls React setState

**Verification:** Hard-code a static `GameState`; verify all tile types and the tank render correctly at correct positions.

---

### T10: Input handler + host bootstrap
`inputHandler.ts` captures keydown/keyup events and appends `InputEvent` to player's Jazz `CoStream`. `hostLoop.ts` activation: the player whose id matches `RoomMap.hostId` runs `setInterval` at 60 Hz, reads all input streams, calls `tickGame`, writes result to `GameStateMap`.

**Acceptance criteria:**
- Arrow key presses appear in player's CoStream
- Host's `setInterval` writes updated `GameStateMap` each tick
- Non-host clients do not run the loop
- Tank moves on screen in response to arrow keys

**Verification:** Single player in browser; press arrow keys; tank moves. Confirm in Jazz devtools that GameStateMap updates each tick.

---

### CHECKPOINT B
**Gate:** One player can enter a name, see the map, move their tank, and shoot bullets. No multiplayer yet.

---

## Phase 4 — Full Gameplay

### T11: Bullet-terrain collision + destruction
Wire `moveBullet` + `destroyTile` into the host loop. Sync updated tile grid via `GameStateMap`. Renderer reads destroyed tiles and shows them as open.

**Acceptance criteria:**
- Bullet destroys brick tile on hit; tile stays open for rest of round
- Bullet stops at steel tile (tile unchanged)
- Destruction synced to all connected clients within 200 ms

**Verification:** Shoot at brick wall; tile disappears. Shoot at steel; nothing happens.

---

### T12: Tank-tank collision + kill scoring
Wire kill detection into host loop. On bullet hitting a tank: mark tank dead, increment shooter's score, start 3-second respawn countdown.

**Acceptance criteria:**
- Dead tank disappears from canvas
- Killer's score increments by 100
- Respawn countdown appears in HUD
- After 3 s, tank respawns at random unoccupied spawn point

**Verification:** Two browser tabs; player A shoots player B; B's tank disappears; A's score increments; B respawns after 3 s.

---

### T13: HUD
DOM overlay on top of canvas. Shows: local player kill count, score, respawn countdown (when dead), round timer (MM:SS counting down from 5:00).

**Acceptance criteria:**
- Score updates within one render frame of state change
- Respawn timer counts down correctly and disappears on respawn
- Round timer visible at all times during gameplay

**Verification:** Play a round; verify all HUD elements update correctly.

---

### T14: Round lifecycle
Host loop: when round timer hits 0, set `roundPhase: 'ended'`. All clients show `Scoreboard.tsx` overlay with final kill rankings. Rematch vote: each player can vote yes/no; if majority yes within 15 s, host resets state and starts new round (new map generated).

**Acceptance criteria:**
- Scoreboard shows correct final scores in rank order
- Rematch starts new round with freshly generated map
- No-vote / timeout returns to lobby screen

**Verification:** Wait for round end (or set timer to 10 s for testing); verify scoreboard appears with correct data; vote rematch; new map loads.

---

### CHECKPOINT C
**Gate:** Full single-player game loop works. Two-player game loop works. Round starts, plays, ends, scoreboard shows, rematch works.

---

## Phase 5 — Multiplayer & Scale

### T15: Multi-player rendering
All tanks (not just local) rendered from `GameStateMap`. Other players' tanks distinguished by color (one color per player index, up to 40).

**Acceptance criteria:**
- 2+ browser tabs all see all tanks
- Each player's tank has a distinct color
- No ghost tanks from disconnected players (host removes on disconnect)

**Verification:** Three browser tabs; all see three tanks moving independently.

---

### T16: Host migration
When host disconnects, the client with the next-oldest `joinedAt` timestamp reads `RoomMap.hostId`, detects the host is gone (Jazz presence), writes itself as new host, and starts the physics loop.

**Acceptance criteria:**
- Close host tab; within 3 s another player becomes host
- Game continues without interruption (minor state freeze acceptable during handoff)
- No two clients run the loop simultaneously

**Verification:** Two tabs; close host tab; surviving tab continues updating `GameStateMap`.

---

### T17: Scale validation
Simulate 10 concurrent players (10 browser tabs or a script writing to 10 CoStreams). Measure host loop tick time and Jazz sync latency.

**Acceptance criteria:**
- Host loop tick completes in < 8 ms at 10 players (budget for 60 Hz)
- Jazz state visible to all clients within 150 ms of host tick
- No crashes or memory leaks after 10 minutes

**Verification:** Run 10-tab test; browser DevTools performance profile; check tick duration.

---

### CHECKPOINT D (ship gate)
**Gate:** 2+ players complete a full round. Host migration works. Scale test passes. Manual smoke test checklist signed off.

---

## Manual Smoke Test Checklist (Checkpoint D)

- [ ] Player enters name and joins
- [ ] Map generates and renders correctly (all terrain types visible)
- [ ] Tank moves in all 4 directions; collides with walls
- [ ] Bullet fires and destroys brick; stops at steel
- [ ] Killing another player increments score
- [ ] Respawn works after 3 seconds
- [ ] HUD shows correct score, kills, and timer
- [ ] Round ends at 5 minutes; leaderboard correct
- [ ] Rematch generates new map and resets scores
- [ ] Host tab closed; another player takes over; game continues
- [ ] 3+ players all see each other moving in real time
