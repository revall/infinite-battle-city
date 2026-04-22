import { describe, it, expect } from 'vitest'
import { tickGame } from './hostLoop'
import { generateMap, ROUND_DURATION_TICKS, TILE_SIZE } from '@battle-city/shared'
import type { GameState, Tank, Bullet, InputEvent } from '@battle-city/shared'

const PLAYER_COUNT = 10

function buildState(): GameState {
  const { tiles, spawnPoints } = generateMap(1)
  const tanks: Record<string, Tank> = {}
  for (let i = 0; i < PLAYER_COUNT; i++) {
    const sp = spawnPoints[i]
    tanks[`p${i}`] = {
      id: `p${i}`,
      x: sp.x * TILE_SIZE,
      y: sp.y * TILE_SIZE,
      direction: 'right',
      alive: true,
      respawnTick: 0,
      score: 0,
      kills: 0,
    }
  }
  // Pre-populate one bullet per player
  const bullets: Record<string, Bullet> = {}
  for (let i = 0; i < PLAYER_COUNT; i++) {
    bullets[`b${i}`] = { id: `b${i}`, ownerId: `p${i}`, x: 200 + i * 32, y: 200, direction: 'right' }
  }
  return {
    tick: 0,
    roundPhase: 'playing',
    roundEndsAt: ROUND_DURATION_TICKS,
    map: tiles,
    spawnPoints: spawnPoints.map((sp) => ({ x: sp.x * TILE_SIZE, y: sp.y * TILE_SIZE })),
    tanks,
    bullets,
    players: Object.fromEntries(
      Array.from({ length: PLAYER_COUNT }, (_, i) => [`p${i}`, { id: `p${i}`, name: `Player${i}`, joinedAt: i }]),
    ),
    hostId: 'p0',
  }
}

function buildInputs(state: GameState): InputEvent[] {
  return Object.keys(state.tanks).map((id) => ({
    playerId: id,
    tick: state.tick,
    moveDir: 'right' as const,
    shoot: true,
  }))
}

describe('hostLoop performance', () => {
  it(`processes a ${PLAYER_COUNT}-player tick in under 8 ms on average`, () => {
    let state = buildState()
    const WARMUP = 20
    const MEASURE = 200

    // Warm up JIT
    for (let i = 0; i < WARMUP; i++) state = tickGame(state, buildInputs(state))

    const start = performance.now()
    for (let i = 0; i < MEASURE; i++) state = tickGame(state, buildInputs(state))
    const avgMs = (performance.now() - start) / MEASURE

    expect(avgMs).toBeLessThan(8)
  })

  it('handles 40-player tick without error', () => {
    const { tiles, spawnPoints } = generateMap(2)
    const tanks: Record<string, Tank> = {}
    for (let i = 0; i < 40; i++) {
      const sp = spawnPoints[i]
      tanks[`p${i}`] = { id: `p${i}`, x: sp.x * TILE_SIZE, y: sp.y * TILE_SIZE, direction: 'right', alive: true, respawnTick: 0, score: 0, kills: 0 }
    }
    const state: GameState = {
      tick: 0, roundPhase: 'playing', roundEndsAt: ROUND_DURATION_TICKS,
      map: tiles,
      spawnPoints: spawnPoints.map((sp) => ({ x: sp.x * TILE_SIZE, y: sp.y * TILE_SIZE })),
      tanks, bullets: {},
      players: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`p${i}`, { id: `p${i}`, name: `P${i}`, joinedAt: i }])),
      hostId: 'p0',
    }
    const inputs: InputEvent[] = Object.keys(tanks).map((id) => ({ playerId: id, tick: 0, moveDir: 'right', shoot: true }))
    expect(() => tickGame(state, inputs)).not.toThrow()
  })
})
