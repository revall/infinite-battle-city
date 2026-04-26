import { GRID_W, GRID_H, MAX_PLAYERS } from './constants'
import type { TileType } from './types'

export interface MapData {
  tiles: TileType[][]
  spawnPoints: { x: number; y: number }[]
}

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

const DIRS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
]


export function generateMap(seed: number): MapData {
  const tiles: TileType[][] = Array.from({ length: GRID_H }, () =>
    new Array<TileType>(GRID_W).fill('open'),
  )

  const set = (x: number, y: number, type: TileType) => {
    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) tiles[y][x] = type
  }
  const get = (x: number, y: number): TileType | null => {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return null
    return tiles[y][x]
  }
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

  const rng = makeRng(seed)

  // Border
  for (let x = 0; x < GRID_W; x++) {
    set(x, 0, 'steel')
    set(x, GRID_H - 1, 'steel')
  }
  for (let y = 0; y < GRID_H; y++) {
    set(0, y, 'steel')
    set(GRID_W - 1, y, 'steel')
  }

  function randomWalk(startX: number, startY: number, steps: number, type: TileType) {
    let x = startX
    let y = startY
    for (let i = 0; i < steps; i++) {
      if (get(x, y) === 'open') set(x, y, type)
      const d = DIRS[Math.floor(rng() * 4)]
      x = clamp(x + d.dx, 1, GRID_W - 2)
      y = clamp(y + d.dy, 1, GRID_H - 2)
    }
  }

  // Brick clusters
  const brickCount = randInt(rng, 55, 75)
  for (let i = 0; i < brickCount; i++) {
    randomWalk(
      randInt(rng, 2, GRID_W - 3),
      randInt(rng, 2, GRID_H - 3),
      randInt(rng, 4, 14),
      'brick',
    )
  }

  // Steel blobs (overwrite brick, not water)
  const steelCount = randInt(rng, 15, 25)
  for (let i = 0; i < steelCount; i++) {
    let x = randInt(rng, 2, GRID_W - 3)
    let y = randInt(rng, 2, GRID_H - 3)
    const steps = randInt(rng, 2, 6)
    for (let s = 0; s < steps; s++) {
      const t = get(x, y)
      if (t === 'open' || t === 'brick') set(x, y, 'steel')
      const d = DIRS[Math.floor(rng() * 4)]
      x = clamp(x + d.dx, 1, GRID_W - 2)
      y = clamp(y + d.dy, 1, GRID_H - 2)
    }
  }

  // Water rectangles
  const waterCount = randInt(rng, 6, 12)
  for (let i = 0; i < waterCount; i++) {
    const w = randInt(rng, 2, 5)
    const h = randInt(rng, 2, 4)
    const x0 = randInt(rng, 1, GRID_W - 2 - w)
    const y0 = randInt(rng, 1, GRID_H - 2 - h)
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++) set(x0 + dx, y0 + dy, 'water')
  }

  // Tree clusters
  const treeCount = randInt(rng, 8, 15)
  for (let i = 0; i < treeCount; i++) {
    let x = randInt(rng, 2, GRID_W - 3)
    let y = randInt(rng, 2, GRID_H - 3)
    const steps = randInt(rng, 3, 9)
    for (let s = 0; s < steps; s++) {
      if (get(x, y) === 'open') set(x, y, 'tree')
      const d = DIRS[Math.floor(rng() * 4)]
      x = clamp(x + d.dx, 1, GRID_W - 2)
      y = clamp(y + d.dy, 1, GRID_H - 2)
    }
  }

  // Ice strips
  const iceCount = randInt(rng, 2, 5)
  for (let i = 0; i < iceCount; i++) {
    const y = randInt(rng, 2, GRID_H - 3)
    const x0 = randInt(rng, 1, GRID_W / 2)
    const len = randInt(rng, 8, 28)
    for (let dx = 0; dx < len && x0 + dx < GRID_W - 1; dx++)
      if (get(x0 + dx, y) === 'open') set(x0 + dx, y, 'ice')
  }

  // Spawn points — random sampling with minimum 8-tile distance
  const PASSABLE: TileType[] = ['open', 'ice', 'tree']
  const MIN_DIST_SQ = 8 * 8

  const spawnPoints: { x: number; y: number }[] = []

  const distOk = (x: number, y: number) =>
    spawnPoints.every((sp) => (sp.x - x) ** 2 + (sp.y - y) ** 2 >= MIN_DIST_SQ)

  const tryPlace = (x: number, y: number): boolean => {
    if (!PASSABLE.includes(get(x, y)!)) return false
    if (!distOk(x, y)) return false
    spawnPoints.push({ x, y })
    return true
  }

  for (let i = 0; i < MAX_PLAYERS; i++) {
    let placed = false
    for (let attempt = 0; attempt < 2000 && !placed; attempt++) {
      placed = tryPlace(randInt(rng, 1, GRID_W - 2), randInt(rng, 1, GRID_H - 2))
    }
    if (!placed) {
      // Fallback: scan interior and clear the first valid cell
      outer: for (let y = 1; y < GRID_H - 1; y++) {
        for (let x = 1; x < GRID_W - 1; x++) {
          if (distOk(x, y)) {
            set(x, y, 'open')
            spawnPoints.push({ x, y })
            break outer
          }
        }
      }
    }
  }

  return { tiles, spawnPoints }
}
