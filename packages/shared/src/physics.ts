import { TILE_SIZE, TANK_SIZE, BULLET_SPEED, TANK_SPEED } from './constants'
import type { Tank, Bullet, TileType, Direction } from './types'

export interface HitResult {
  type: 'wall' | 'tank'
  tileX?: number
  tileY?: number
  tileType?: TileType
  tankId?: string
}

const BLOCKED: TileType[] = ['brick', 'steel', 'water']

function tileAt(map: TileType[][], px: number, py: number): TileType {
  const tx = Math.floor(px / TILE_SIZE)
  const ty = Math.floor(py / TILE_SIZE)
  if (ty < 0 || ty >= map.length || tx < 0 || tx >= (map[0]?.length ?? 0)) return 'steel'
  return map[ty][tx]
}

function tankRect(t: Tank) {
  return { x: t.x, y: t.y, w: TANK_SIZE, h: TANK_SIZE }
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

// Returns true if moving the tank to (nx, ny) would collide with terrain
function collidesWithTerrain(map: TileType[][], nx: number, ny: number): boolean {
  const corners = [
    { x: nx, y: ny },
    { x: nx + TANK_SIZE - 1, y: ny },
    { x: nx, y: ny + TANK_SIZE - 1 },
    { x: nx + TANK_SIZE - 1, y: ny + TANK_SIZE - 1 },
  ]
  return corners.some((c) => BLOCKED.includes(tileAt(map, c.x, c.y)))
}

function collidesWithTanks(tanks: Tank[], id: string, nx: number, ny: number): boolean {
  return tanks.some(
    (t) =>
      t.id !== id &&
      t.alive &&
      rectsOverlap(nx, ny, TANK_SIZE, TANK_SIZE, t.x, t.y, TANK_SIZE, TANK_SIZE),
  )
}

const DELTA: Record<Direction, { dx: number; dy: number }> = {
  right: { dx: 1, dy: 0 },
  left: { dx: -1, dy: 0 },
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
}

export function moveTank(
  tank: Tank,
  input: Direction,
  map: TileType[][],
  others: Tank[],
): Tank {
  if (!tank.alive) return tank

  const next = { ...tank, direction: input }

  if (input !== tank.direction) return next

  const d = DELTA[input]
  const nx = tank.x + d.dx * TANK_SPEED
  const ny = tank.y + d.dy * TANK_SPEED

  if (collidesWithTerrain(map, nx, ny)) return next
  if (collidesWithTanks(others, tank.id, nx, ny)) return next

  return { ...next, x: nx, y: ny }
}

export function moveBullet(
  bullet: Bullet,
  map: TileType[][],
  tanks: Record<string, Tank>,
): { bullet: Bullet; hit: HitResult | null } {
  const d = DELTA[bullet.direction]
  const nx = bullet.x + d.dx * BULLET_SPEED
  const ny = bullet.y + d.dy * BULLET_SPEED

  // Check tank hit first
  for (const tank of Object.values(tanks)) {
    if (!tank.alive) continue
    if (tank.id === bullet.ownerId) continue
    const r = tankRect(tank)
    if (nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h) {
      return { bullet: { ...bullet, x: nx, y: ny }, hit: { type: 'tank', tankId: tank.id } }
    }
  }

  // Check wall hit
  const tileType = tileAt(map, nx, ny)
  if (BLOCKED.includes(tileType)) {
    const tileX = Math.floor(nx / TILE_SIZE)
    const tileY = Math.floor(ny / TILE_SIZE)
    return { bullet: { ...bullet, x: nx, y: ny }, hit: { type: 'wall', tileX, tileY, tileType } }
  }

  return { bullet: { ...bullet, x: nx, y: ny }, hit: null }
}

export function destroyTile(map: TileType[][], tileX: number, tileY: number): TileType[][] {
  if (map[tileY]?.[tileX] !== 'brick') return map
  return map.map((row, y) =>
    y === tileY ? row.map((t, x) => (x === tileX ? 'open' : t)) : row,
  )
}

export function checkTankCollision(a: Tank, b: Tank): boolean {
  return rectsOverlap(a.x, a.y, TANK_SIZE, TANK_SIZE, b.x, b.y, TANK_SIZE, TANK_SIZE)
}
