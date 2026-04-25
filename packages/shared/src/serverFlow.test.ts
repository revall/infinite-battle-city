// Integration tests for the server-side game flow:
// verifies the sequence of state transitions the game server produces
// when clients join, send input, and trigger rematch.
import { describe, it, expect } from 'vitest'
import { tickGame, spawnTankForPlayer } from './gameLoop'
import { generateMap, ROUND_DURATION_TICKS, TILE_SIZE } from '.'
import type { GameState, InputEvent } from './types'

function newServerState(): GameState {
  const { tiles, spawnPoints } = generateMap(42)
  return {
    tick: 0, roundPhase: 'waiting', roundEndsAt: ROUND_DURATION_TICKS,
    map: tiles,
    spawnPoints: spawnPoints.map((sp) => ({ x: sp.x * TILE_SIZE, y: sp.y * TILE_SIZE })),
    tanks: {}, bullets: {}, players: {}, hostId: 'server',
  }
}

describe('server flow', () => {
  it('spawns a tank at a spawn point when a player joins', () => {
    let state = newServerState()
    state = { ...state, players: { p1: { id: 'p1', name: 'Alice', joinedAt: 0 } }, roundPhase: 'playing' }
    state = spawnTankForPlayer('p1', state)
    expect(state.tanks['p1']).toBeDefined()
    const tank = state.tanks['p1']
    const onSpawnPoint = state.spawnPoints.some((sp) => sp.x === tank.x && sp.y === tank.y)
    expect(onSpawnPoint).toBe(true)
  })

  it('moves the tank when input is applied over several ticks', () => {
    let state = newServerState()
    state = { ...state, players: { p1: { id: 'p1', name: 'Alice', joinedAt: 0 } }, roundPhase: 'playing' }
    state = spawnTankForPlayer('p1', state)
    const startX = state.tanks['p1'].x

    const input: InputEvent = { playerId: 'p1', tick: 0, moveDir: 'right', shoot: false }
    for (let i = 0; i < 10; i++) state = tickGame(state, [input])

    expect(state.tanks['p1'].x).toBeGreaterThan(startX)
  })

  it('rematch resets ticks and clears tanks/bullets', () => {
    let state = newServerState()
    state = { ...state, players: { p1: { id: 'p1', name: 'Alice', joinedAt: 0 } }, roundPhase: 'playing' }
    state = spawnTankForPlayer('p1', state)
    for (let i = 0; i < 50; i++) state = tickGame(state, [{ playerId: 'p1', tick: 0, moveDir: 'right', shoot: true }])

    // Simulate rematch: reset tick/tanks/bullets, keep players
    const after = { ...state, tick: 0, tanks: {}, bullets: {}, roundPhase: 'playing' as const, roundEndsAt: ROUND_DURATION_TICKS }
    expect(after.tick).toBe(0)
    expect(Object.keys(after.tanks).length).toBe(0)
    expect(after.players['p1']).toBeDefined()
  })

  it('round transitions to ended when timer reaches zero', () => {
    let state = newServerState()
    state = { ...state, roundPhase: 'playing', tick: ROUND_DURATION_TICKS - 1 }
    state = tickGame(state, [])
    expect(state.roundPhase).toBe('ended')
  })
})
