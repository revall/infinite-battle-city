import { describe, it, expect } from 'vitest'
import { generateMap } from './mapGen'
import { GRID_W, GRID_H, MAX_PLAYERS } from './constants'

describe('generateMap', () => {
  it('produces a 128×128 tile grid', () => {
    const { tiles } = generateMap(1)
    expect(tiles.length).toBe(GRID_H)
    tiles.forEach((row) => expect(row.length).toBe(GRID_W))
  })

  it('has steel on all four border edges', () => {
    const { tiles } = generateMap(1)
    for (let x = 0; x < GRID_W; x++) {
      expect(tiles[0][x]).toBe('steel')
      expect(tiles[GRID_H - 1][x]).toBe('steel')
    }
    for (let y = 0; y < GRID_H; y++) {
      expect(tiles[y][0]).toBe('steel')
      expect(tiles[y][GRID_W - 1]).toBe('steel')
    }
  })

  it('is deterministic: same seed produces the same map', () => {
    const a = generateMap(42)
    const b = generateMap(42)
    expect(a.tiles).toEqual(b.tiles)
    expect(a.spawnPoints).toEqual(b.spawnPoints)
  })

  it('is varied: different seeds produce different maps', () => {
    const a = generateMap(1)
    const b = generateMap(2)
    const differs = a.tiles.some((row, y) => row.some((t, x) => t !== b.tiles[y][x]))
    expect(differs).toBe(true)
  })

  it(`produces exactly ${MAX_PLAYERS} spawn points`, () => {
    const { spawnPoints } = generateMap(7)
    expect(spawnPoints.length).toBe(MAX_PLAYERS)
  })

  it('places no spawn point on a brick, steel, or water tile', () => {
    const { tiles, spawnPoints } = generateMap(99)
    spawnPoints.forEach(({ x, y }) => {
      const t = tiles[y][x]
      expect(['open', 'tree', 'ice']).toContain(t)
    })
  })

  it('keeps all spawn points at least 8 tiles apart from each other', () => {
    const { spawnPoints } = generateMap(5)
    for (let i = 0; i < spawnPoints.length; i++) {
      for (let j = i + 1; j < spawnPoints.length; j++) {
        const dx = spawnPoints[i].x - spawnPoints[j].x
        const dy = spawnPoints[i].y - spawnPoints[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        expect(dist).toBeGreaterThanOrEqual(8)
      }
    }
  })

  it('places spawn points within the interior (not on the border)', () => {
    const { spawnPoints } = generateMap(3)
    spawnPoints.forEach(({ x, y }) => {
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(GRID_W - 1)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(GRID_H - 1)
    })
  })
})
