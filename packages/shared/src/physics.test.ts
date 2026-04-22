import { describe, it, expect } from 'vitest'
import { moveTank, moveBullet, destroyTile, checkTankCollision } from './physics'
import { TILE_SIZE, GRID_W, GRID_H, TANK_SPEED, BULLET_SPEED } from './constants'
import type { Tank, Bullet, TileType } from './types'

function emptyMap(): TileType[][] {
  return Array.from({ length: GRID_H }, () => new Array<TileType>(GRID_W).fill('open'))
}

function makeTank(overrides: Partial<Tank> = {}): Tank {
  return {
    id: 'p1',
    x: 64,
    y: 64,
    direction: 'right',
    alive: true,
    respawnTick: 0,
    score: 0,
    kills: 0,
    ...overrides,
  }
}

function makeBullet(overrides: Partial<Bullet> = {}): Bullet {
  return {
    id: 'b1',
    ownerId: 'p1',
    x: 64,
    y: 64,
    direction: 'right',
    ...overrides,
  }
}

describe('moveTank', () => {
  it('moves right by TANK_SPEED pixels', () => {
    const tank = makeTank({ x: 64, y: 64, direction: 'right' })
    const result = moveTank(tank, 'right', emptyMap(), [])
    expect(result.x).toBe(64 + TANK_SPEED)
    expect(result.y).toBe(64)
  })

  it('moves left by TANK_SPEED pixels', () => {
    const tank = makeTank({ x: 64, y: 64, direction: 'left' })
    const result = moveTank(tank, 'left', emptyMap(), [])
    expect(result.x).toBe(64 - TANK_SPEED)
  })

  it('moves up by TANK_SPEED pixels', () => {
    const tank = makeTank({ x: 64, y: 64, direction: 'up' })
    const result = moveTank(tank, 'up', emptyMap(), [])
    expect(result.y).toBe(64 - TANK_SPEED)
  })

  it('moves down by TANK_SPEED pixels', () => {
    const tank = makeTank({ x: 64, y: 64, direction: 'down' })
    const result = moveTank(tank, 'down', emptyMap(), [])
    expect(result.y).toBe(64 + TANK_SPEED)
  })

  it('updates direction without moving when input direction differs from current', () => {
    const tank = makeTank({ x: 64, y: 64, direction: 'right' })
    const result = moveTank(tank, 'up', emptyMap(), [])
    expect(result.direction).toBe('up')
  })

  it('does not move through a brick wall', () => {
    const map = emptyMap()
    // Place brick tile directly to the right of the tank
    const tileX = Math.floor((64 + TILE_SIZE) / TILE_SIZE)
    map[Math.floor(64 / TILE_SIZE)][tileX] = 'brick'
    const tank = makeTank({ x: 64, y: 64, direction: 'right' })
    const result = moveTank(tank, 'right', map, [])
    expect(result.x).toBe(64)
  })

  it('does not move through a steel wall', () => {
    const map = emptyMap()
    const tileX = Math.floor((64 + TILE_SIZE) / TILE_SIZE)
    map[Math.floor(64 / TILE_SIZE)][tileX] = 'steel'
    const tank = makeTank({ x: 64, y: 64, direction: 'right' })
    const result = moveTank(tank, 'right', map, [])
    expect(result.x).toBe(64)
  })

  it('does not move into water', () => {
    const map = emptyMap()
    const tileX = Math.floor((64 + TILE_SIZE) / TILE_SIZE)
    map[Math.floor(64 / TILE_SIZE)][tileX] = 'water'
    const tank = makeTank({ x: 64, y: 64, direction: 'right' })
    const result = moveTank(tank, 'right', map, [])
    expect(result.x).toBe(64)
  })

  it('can move onto ice and tree tiles', () => {
    const map = emptyMap()
    const tileX = Math.floor((64 + TILE_SIZE) / TILE_SIZE)
    map[Math.floor(64 / TILE_SIZE)][tileX] = 'ice'
    const tank = makeTank({ x: 64, y: 64, direction: 'right' })
    const result = moveTank(tank, 'right', map, [])
    expect(result.x).toBe(64 + TANK_SPEED)
  })

  it('does not collide with another tank at the same position', () => {
    const tank = makeTank({ x: 64, y: 64, direction: 'right' })
    const other = makeTank({ id: 'p2', x: 64 + TILE_SIZE, y: 64 })
    const result = moveTank(tank, 'right', emptyMap(), [other])
    expect(result.x).toBe(64)
  })

  it('does not move a dead tank', () => {
    const tank = makeTank({ x: 64, y: 64, direction: 'right', alive: false })
    const result = moveTank(tank, 'right', emptyMap(), [])
    expect(result.x).toBe(64)
  })

  it('does not mutate the input tank', () => {
    const tank = makeTank({ x: 64, y: 64 })
    const before = { ...tank }
    moveTank(tank, 'right', emptyMap(), [])
    expect(tank).toEqual(before)
  })
})

describe('moveBullet', () => {
  it('advances right by BULLET_SPEED pixels', () => {
    const bullet = makeBullet({ direction: 'right' })
    const { bullet: next } = moveBullet(bullet, emptyMap(), {})
    expect(next.x).toBe(64 + BULLET_SPEED)
  })

  it('advances left by BULLET_SPEED pixels', () => {
    const bullet = makeBullet({ direction: 'left' })
    const { bullet: next } = moveBullet(bullet, emptyMap(), {})
    expect(next.x).toBe(64 - BULLET_SPEED)
  })

  it('stops and returns a wall hit when it enters a brick tile', () => {
    const map = emptyMap()
    const tx = Math.floor((64 + BULLET_SPEED) / TILE_SIZE)
    const ty = Math.floor(64 / TILE_SIZE)
    map[ty][tx] = 'brick'
    const bullet = makeBullet({ direction: 'right' })
    const { hit } = moveBullet(bullet, emptyMap(), {})
    // non-wall path: no hit
    expect(hit).toBeNull()
    // with wall map
    const { hit: wallHit } = moveBullet(bullet, map, {})
    expect(wallHit?.type).toBe('wall')
    expect(wallHit?.tileX).toBe(tx)
    expect(wallHit?.tileY).toBe(ty)
  })

  it('does not destroy steel — hit type is wall but tile stays steel', () => {
    const map = emptyMap()
    const tx = Math.floor((64 + BULLET_SPEED) / TILE_SIZE)
    const ty = Math.floor(64 / TILE_SIZE)
    map[ty][tx] = 'steel'
    const bullet = makeBullet({ direction: 'right' })
    const { hit } = moveBullet(bullet, map, {})
    expect(hit?.type).toBe('wall')
    expect(hit?.tileType).toBe('steel')
  })

  it('returns a tank hit when bullet reaches a tank position', () => {
    const bullet = makeBullet({ x: 60, y: 64, direction: 'right', ownerId: 'p1' })
    const enemy: Tank = makeTank({ id: 'p2', x: 64, y: 64 })
    const { hit } = moveBullet(bullet, emptyMap(), { p2: enemy })
    expect(hit?.type).toBe('tank')
    expect(hit?.tankId).toBe('p2')
  })

  it('does not report a hit against the bullet owner', () => {
    const bullet = makeBullet({ x: 60, y: 64, direction: 'right', ownerId: 'p1' })
    const owner: Tank = makeTank({ id: 'p1', x: 64, y: 64 })
    const { hit } = moveBullet(bullet, emptyMap(), { p1: owner })
    expect(hit?.type).not.toBe('tank')
  })

  it('does not mutate the input bullet', () => {
    const bullet = makeBullet()
    const before = { ...bullet }
    moveBullet(bullet, emptyMap(), {})
    expect(bullet).toEqual(before)
  })
})

describe('destroyTile', () => {
  it('turns a brick tile into open', () => {
    const map = emptyMap()
    map[4][4] = 'brick'
    const next = destroyTile(map, 4, 4)
    expect(next[4][4]).toBe('open')
  })

  it('leaves a steel tile unchanged', () => {
    const map = emptyMap()
    map[4][4] = 'steel'
    const next = destroyTile(map, 4, 4)
    expect(next[4][4]).toBe('steel')
  })

  it('does not mutate the input map', () => {
    const map = emptyMap()
    map[4][4] = 'brick'
    destroyTile(map, 4, 4)
    expect(map[4][4]).toBe('brick')
  })
})

describe('checkTankCollision', () => {
  it('returns true when two tanks overlap', () => {
    const a = makeTank({ x: 64, y: 64 })
    const b = makeTank({ id: 'p2', x: 64, y: 64 })
    expect(checkTankCollision(a, b)).toBe(true)
  })

  it('returns false when tanks are far apart', () => {
    const a = makeTank({ x: 0, y: 0 })
    const b = makeTank({ id: 'p2', x: 200, y: 200 })
    expect(checkTankCollision(a, b)).toBe(false)
  })

  it('returns false when tanks are adjacent but not overlapping', () => {
    const a = makeTank({ x: 0, y: 0 })
    const b = makeTank({ id: 'p2', x: TILE_SIZE, y: 0 })
    expect(checkTankCollision(a, b)).toBe(false)
  })
})
