import { describe, it, expect } from 'vitest'
import { tickGame, spawnTankForPlayer } from './gameLoop'
import { generateMap, ROUND_DURATION_TICKS, TILE_SIZE } from '.'
import type { GameState, InputEvent } from './types'

function buildState(n: number): GameState {
  const { tiles, spawnPoints } = generateMap(1)
  let state: GameState = {
    tick: 0, roundPhase: 'playing', roundEndsAt: ROUND_DURATION_TICKS,
    map: tiles,
    spawnPoints: spawnPoints.map((sp) => ({ x: sp.x * TILE_SIZE, y: sp.y * TILE_SIZE })),
    tanks: {}, bullets: {},
    players: Object.fromEntries(Array.from({ length: n }, (_, i) => [`p${i}`, { id: `p${i}`, name: `P${i}`, joinedAt: i }])),
    hostId: 'server',
  }
  for (let i = 0; i < n; i++) state = spawnTankForPlayer(`p${i}`, state)
  return state
}

describe('gameLoop performance', () => {
  it('processes a 10-player tick in under 8 ms on average', () => {
    let state = buildState(10)
    const inputs: InputEvent[] = Array.from({ length: 10 }, (_, i) => ({
      playerId: `p${i}`, tick: 0, moveDir: 'right' as const, shoot: true,
    }))

    for (let i = 0; i < 20; i++) state = tickGame(state, inputs)  // warmup

    const start = performance.now()
    for (let i = 0; i < 200; i++) state = tickGame(state, inputs)
    expect((performance.now() - start) / 200).toBeLessThan(8)
  })

  it('handles 40-player tick without error', () => {
    let state = buildState(40)
    const inputs: InputEvent[] = Array.from({ length: 40 }, (_, i) => ({
      playerId: `p${i}`, tick: 0, moveDir: 'right' as const, shoot: true,
    }))
    expect(() => tickGame(state, inputs)).not.toThrow()
  })
})
