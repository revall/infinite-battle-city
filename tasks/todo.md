# Battle City — Task List

## Phase 1 — Foundation
- [x] T1: Monorepo scaffold (pnpm, Vite, TypeScript, ESLint, Vitest)
- [x] T2: Shared types + constants (GameState, Tank, Bullet, Tile, Player, grid constants)
- [x] T3: Jazz schema (GameStateMap CoMap, PlayerInputStream CoStream, RoomMap CoMap)

## Phase 2 — Core Game Logic
- [x] T4: Procedural map generation (128×128, terrain clusters, 40 spawn points)
- [x] T5: Physics engine (movement, collision, bullet trajectory, tile destruction)
- [x] T6: Host loop tick function (inputs → new GameState, kills, respawn, round timer)

### CHECKPOINT A: all unit tests pass, 80%+ coverage on shared + hostLoop

## Phase 3 — Walking Skeleton
- [x] T7: Client foundation (React entry, Jazz provider, routing, blank canvas)
- [x] T8: Lobby screen (name entry → join global room → first player generates map)
- [x] T9: Game canvas + renderer (terrain, tanks, bullets, camera follow)
- [x] T10: Input handler + host bootstrap (keyboard → CoStream; host runs setInterval loop)

### CHECKPOINT B: one player can enter name, move tank, shoot bullets

## Phase 4 — Full Gameplay
- [x] T11: Bullet-terrain collision + destruction (brick destroyed, synced to all clients)
- [x] T12: Tank-tank collision + kill scoring (death, score++, respawn after 3 s)
- [x] T13: HUD (score, kills, respawn timer, round timer)
- [x] T14: Round lifecycle (timer → leaderboard → rematch vote → new round)

### CHECKPOINT C: full game loop works end-to-end with 2 players

## Phase 5 — Multiplayer & Scale
- [x] T15: Multi-player rendering (all tanks visible, distinct colors, disconnect cleanup)
- [x] T16: Host migration (host disconnect → next player takes over loop)
- [x] T17: Scale validation (10-player test, tick < 8 ms, sync < 150 ms)

### CHECKPOINT D: ship gate — smoke test checklist signed off

## Post-launch fixes
- [x] T18: URL-based room sharing — room ID in `?room=<id>` so players can share a link
- [x] T19: Loading state — show spinner while Jazz initialises; show room URL once ready
