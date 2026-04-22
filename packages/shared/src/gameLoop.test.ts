import { describe, it, expect } from 'vitest'
import { tickGame } from './gameLoop'
import { GRID_W, GRID_H, RESPAWN_TICKS, ROUND_DURATION_TICKS, KILL_SCORE } from './constants'
import type { GameState, Tank, TileType, InputEvent } from './types'

function emptyMap(): TileType[][] {
  return Array.from({ length: GRID_H }, () => new Array<TileType>(GRID_W).fill('open'))
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    tick: 0, roundPhase: 'playing', roundEndsAt: ROUND_DURATION_TICKS,
    map: emptyMap(), spawnPoints: [{ x: 32, y: 32 }, { x: 96, y: 96 }],
    tanks: {}, bullets: {}, players: {}, hostId: 'server', ...overrides,
  }
}

function aliveTank(id: string, x = 64, y = 64): Tank {
  return { id, x, y, direction: 'right', alive: true, respawnTick: 0, score: 0, kills: 0 }
}

describe('tickGame', () => {
  it('increments tick by 1', () => {
    expect(tickGame(baseState({ tick: 10 }), []).tick).toBe(11)
  })

  it('does not mutate the input state', () => {
    const state = baseState()
    tickGame(state, [])
    expect(state.tick).toBe(0)
  })

  it('transitions to ended when roundEndsAt tick is reached', () => {
    const state = baseState({ tick: ROUND_DURATION_TICKS - 1, roundEndsAt: ROUND_DURATION_TICKS })
    expect(tickGame(state, []).roundPhase).toBe('ended')
  })

  it('does not tick game logic when phase is ended', () => {
    const tank = aliveTank('p1', 64, 64)
    const state = baseState({ roundPhase: 'ended', tanks: { p1: tank } })
    const next = tickGame(state, [{ playerId: 'p1', tick: 0, moveDir: 'right', shoot: false }])
    expect(next.tanks['p1'].x).toBe(64)
  })

  it('moves a tank according to its input', () => {
    const state = baseState({ tanks: { p1: aliveTank('p1', 64, 64) } })
    const next = tickGame(state, [{ playerId: 'p1', tick: 0, moveDir: 'right', shoot: false }])
    expect(next.tanks['p1'].x).toBeGreaterThan(64)
  })

  it('does not move a dead tank', () => {
    const tank = { ...aliveTank('p1', 64, 64), alive: false, respawnTick: 999 }
    const state = baseState({ tanks: { p1: tank } })
    const next = tickGame(state, [{ playerId: 'p1', tick: 0, moveDir: 'right', shoot: false }])
    expect(next.tanks['p1'].x).toBe(64)
  })

  it('spawns a bullet when shoot input is true', () => {
    const state = baseState({ tanks: { p1: aliveTank('p1') } })
    const next = tickGame(state, [{ playerId: 'p1', tick: 0, moveDir: null, shoot: true }])
    expect(Object.keys(next.bullets).length).toBe(1)
  })

  it('does not spawn a second bullet if player already has one in flight', () => {
    const state = baseState({
      tanks: { p1: aliveTank('p1') },
      bullets: { b1: { id: 'b1', ownerId: 'p1', x: 80, y: 64, direction: 'right' as const } },
    })
    const next = tickGame(state, [{ playerId: 'p1', tick: 0, moveDir: null, shoot: true }])
    expect(Object.keys(next.bullets).length).toBe(1)
  })

  it('removes a bullet that hits a brick wall and destroys the tile', () => {
    const map = emptyMap()
    map[1][3] = 'brick'
    const state = baseState({
      tanks: { p1: aliveTank('p1', 16, 16) },
      bullets: { b1: { id: 'b1', ownerId: 'p1', x: 44, y: 16, direction: 'right' as const } },
      map,
    })
    const next = tickGame(state, [])
    expect(next.bullets['b1']).toBeUndefined()
    expect(next.map[1][3]).toBe('open')
  })

  it('kills a tank hit by an enemy bullet and credits the shooter', () => {
    const state = baseState({
      tanks: { p1: aliveTank('p1', 16, 64), p2: aliveTank('p2', 64, 64) },
      bullets: { b1: { id: 'b1', ownerId: 'p1', x: 60, y: 64, direction: 'right' as const } },
    })
    const next = tickGame(state, [])
    expect(next.tanks['p2'].alive).toBe(false)
    expect(next.tanks['p1'].kills).toBe(1)
    expect(next.tanks['p1'].score).toBe(KILL_SCORE)
  })

  it('starts respawn countdown on a killed tank', () => {
    const state = baseState({
      tick: 50,
      tanks: { p1: aliveTank('p1', 16, 64), p2: aliveTank('p2', 64, 64) },
      bullets: { b1: { id: 'b1', ownerId: 'p1', x: 60, y: 64, direction: 'right' as const } },
    })
    expect(tickGame(state, []).tanks['p2'].respawnTick).toBe(50 + RESPAWN_TICKS)
  })

  it('respawns a dead tank when respawnTick is reached', () => {
    const tank = { ...aliveTank('p2'), alive: false, respawnTick: 10 }
    const state = baseState({ tick: 10, tanks: { p2: tank } })
    expect(tickGame(state, []).tanks['p2'].alive).toBe(true)
  })
})
