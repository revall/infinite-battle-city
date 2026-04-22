import { TILE_SIZE, TANK_SIZE, CANNON_WIDTH, CANNON_OUT } from '@battle-city/shared'
import type { GameState, TileType, Tank, Bullet } from '@battle-city/shared'

const OPEN_BG = '#1a1a1a'

// Each tile type pre-rendered once to an offscreen canvas, then blitted via drawImage.
// Keeps per-frame cost to one drawImage per tile instead of many fillRects.
const tileCache: Partial<Record<TileType, HTMLCanvasElement>> = {}

function makeTile(render: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = TILE_SIZE
  c.height = TILE_SIZE
  render(c.getContext('2d')!)
  return c
}

function paintBrick(ctx: CanvasRenderingContext2D): void {
  // NES-style staggered brick pattern
  const MAIN = '#b5352a'
  const HI = '#e05a46'
  const LO = '#731a14'
  const MORTAR = '#2a0a07'

  ctx.fillStyle = MAIN
  ctx.fillRect(0, 0, 16, 16)

  // Top highlight on each brick row
  ctx.fillStyle = HI
  ctx.fillRect(1, 1, 14, 1)
  ctx.fillRect(0, 9, 16, 1)

  // Bottom shadow
  ctx.fillStyle = LO
  ctx.fillRect(0, 6, 16, 1)
  ctx.fillRect(0, 14, 16, 1)

  // Mortar lines
  ctx.fillStyle = MORTAR
  // horizontal mortar between rows
  ctx.fillRect(0, 7, 16, 1)
  ctx.fillRect(0, 15, 16, 1)
  // vertical mortar — staggered (row 1 split at 8, row 2 at 3 and 11)
  ctx.fillRect(7, 0, 1, 7)
  ctx.fillRect(3, 8, 1, 7)
  ctx.fillRect(11, 8, 1, 7)
}

function paintSteel(ctx: CanvasRenderingContext2D): void {
  // Riveted steel plate with bevel
  const BASE = '#9a9fa3'
  const HI = '#d8dde0'
  const LO = '#565b5f'
  const RIVET_DARK = '#2d3135'
  const RIVET_HI = '#c8cdd0'

  ctx.fillStyle = BASE
  ctx.fillRect(0, 0, 16, 16)

  // Top-left highlight (2-px L)
  ctx.fillStyle = HI
  ctx.fillRect(0, 0, 16, 2)
  ctx.fillRect(0, 0, 2, 16)

  // Bottom-right shadow (2-px L)
  ctx.fillStyle = LO
  ctx.fillRect(0, 14, 16, 2)
  ctx.fillRect(14, 0, 2, 16)

  // Corner rivets (dark 2×2 with 1-px bright pip)
  const rivets: Array<[number, number]> = [[3, 3], [11, 3], [3, 11], [11, 11]]
  ctx.fillStyle = RIVET_DARK
  for (const [x, y] of rivets) ctx.fillRect(x, y, 2, 2)
  ctx.fillStyle = RIVET_HI
  for (const [x, y] of rivets) ctx.fillRect(x, y, 1, 1)
}

function paintWater(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#1f5fa0'
  ctx.fillRect(0, 0, 16, 16)
  // Deeper bands
  ctx.fillStyle = '#143f70'
  ctx.fillRect(0, 0, 16, 1)
  ctx.fillRect(0, 15, 16, 1)
  // Wavelet highlights
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(2, 4, 5, 1)
  ctx.fillRect(9, 4, 5, 1)
  ctx.fillRect(1, 10, 4, 1)
  ctx.fillRect(7, 10, 7, 1)
}

function paintTree(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#1e7a35'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#2ea84a'
  const dots: Array<[number, number]> = [
    [1, 2], [5, 1], [10, 3], [14, 2],
    [3, 6], [8, 5], [13, 7],
    [2, 10], [6, 11], [11, 10], [14, 12],
    [4, 14], [9, 13], [13, 14],
  ]
  for (const [x, y] of dots) ctx.fillRect(x, y, 2, 2)
  ctx.fillStyle = '#0c4519'
  ctx.fillRect(0, 7, 16, 1)
  ctx.fillRect(7, 0, 1, 16)
}

function paintIce(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#a8d8f0'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#d9eef9'
  ctx.fillRect(0, 0, 16, 1)
  ctx.fillRect(0, 0, 1, 16)
  ctx.fillStyle = '#6fb2d4'
  ctx.fillRect(0, 15, 16, 1)
  ctx.fillRect(15, 0, 1, 16)
  // Cracks / glints
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(4, 3, 3, 1)
  ctx.fillRect(10, 8, 4, 1)
  ctx.fillRect(3, 12, 5, 1)
}

function getTile(type: TileType): HTMLCanvasElement | null {
  const cached = tileCache[type]
  if (cached) return cached
  switch (type) {
    case 'brick': return (tileCache.brick = makeTile(paintBrick))
    case 'steel': return (tileCache.steel = makeTile(paintSteel))
    case 'water': return (tileCache.water = makeTile(paintWater))
    case 'tree':  return (tileCache.tree = makeTile(paintTree))
    case 'ice':   return (tileCache.ice = makeTile(paintIce))
    case 'open':  return null
  }
}

// 40 visually distinct colors via evenly-spaced HSL hues
function buildPalette(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `hsl(${Math.round((i * 360) / n)},80%,55%)`)
}
const TANK_PALETTE = buildPalette(40)

function getTankColor(id: string, localId: string): string {
  if (id === localId) return '#f5c518'
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return TANK_PALETTE[hash % TANK_PALETTE.length]
}

interface Camera { x: number; y: number; w: number; h: number }

function computeCamera(tank: Tank | undefined, cw: number, ch: number): Camera {
  const mapW = TILE_SIZE * 128
  const mapH = TILE_SIZE * 128
  const cx = tank ? tank.x + TANK_SIZE / 2 - cw / 2 : 0
  const cy = tank ? tank.y + TANK_SIZE / 2 - ch / 2 : 0
  return {
    x: Math.max(0, Math.min(cx, mapW - cw)),
    y: Math.max(0, Math.min(cy, mapH - ch)),
    w: cw,
    h: ch,
  }
}

function drawTile(ctx: CanvasRenderingContext2D, type: TileType, px: number, py: number) {
  if (type === 'open') {
    ctx.fillStyle = OPEN_BG
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
    return
  }
  const sprite = getTile(type)
  if (sprite) ctx.drawImage(sprite, px, py)
}

function drawTank(
  ctx: CanvasRenderingContext2D,
  tank: Tank,
  color: string,
  name: string,
  cam: Camera,
) {
  const px = tank.x - cam.x
  const py = tank.y - cam.y
  const S = TANK_SIZE
  const vertical = tank.direction === 'up' || tank.direction === 'down'

  // 1. Base hull — full tank color
  ctx.fillStyle = color
  ctx.fillRect(px, py, S, S)

  // 2. Tracks — dark strips parallel to direction
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  if (vertical) {
    ctx.fillRect(px, py, 3, S)
    ctx.fillRect(px + S - 3, py, 3, S)
  } else {
    ctx.fillRect(px, py, S, 3)
    ctx.fillRect(px, py + S - 3, S, 3)
  }

  // 3. Tread links — bright pips down the centre of each track
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  if (vertical) {
    for (let y = 1; y < S; y += 2) {
      ctx.fillRect(px + 1, py + y, 1, 1)
      ctx.fillRect(px + S - 2, py + y, 1, 1)
    }
  } else {
    for (let x = 1; x < S; x += 2) {
      ctx.fillRect(px + x, py + 1, 1, 1)
      ctx.fillRect(px + x, py + S - 2, 1, 1)
    }
  }

  // 4. Hull bevel — highlight on top/left edge of the inner hull
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  if (vertical) {
    ctx.fillRect(px + 3, py, S - 6, 1)
    ctx.fillRect(px + 3, py, 1, S)
  } else {
    ctx.fillRect(px, py + 3, S, 1)
    ctx.fillRect(px, py + 3, 1, S - 6)
  }
  // Hull shadow — darker stripe on bottom/right edge of the inner hull
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  if (vertical) {
    ctx.fillRect(px + 3, py + S - 1, S - 6, 1)
    ctx.fillRect(px + S - 4, py, 1, S)
  } else {
    ctx.fillRect(px, py + S - 4, S, 1)
    ctx.fillRect(px + S - 1, py + 3, 1, S - 6)
  }

  // 5. Turret — darker 6×6 square in the centre with its own bevel pip
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(px + 5, py + 5, 6, 6)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(px + 5, py + 5, 6, 1)
  ctx.fillRect(px + 5, py + 5, 1, 6)

  // 6. Cannon — sits on top of the turret, extends CANNON_OUT past the tank edge.
  //    Mid-light grey so the barrel reads clearly against both the dark map and coloured hulls.
  ctx.fillStyle = '#a8a8a8'
  const W = CANNON_WIDTH
  const OUT = CANNON_OUT
  const IN = S / 2
  const mid = S / 2
  let cx = 0, cy = 0, cw = 0, ch = 0
  switch (tank.direction) {
    case 'up':    cx = px + mid - W / 2; cy = py - OUT; cw = W; ch = IN + OUT; break
    case 'down':  cx = px + mid - W / 2; cy = py + S - IN; cw = W; ch = IN + OUT; break
    case 'left':  cx = px - OUT; cy = py + mid - W / 2; cw = IN + OUT; ch = W; break
    case 'right': cx = px + S - IN; cy = py + mid - W / 2; cw = IN + OUT; ch = W; break
  }
  ctx.fillRect(cx, cy, cw, ch)
  // Cannon highlight — bright metallic line along one side
  ctx.fillStyle = '#e8e8e8'
  if (vertical) ctx.fillRect(cx, cy, 1, ch)
  else          ctx.fillRect(cx, cy, cw, 1)

  // Player name above tank
  if (name) {
    ctx.font = '9px "Geist Pixel Square", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    const tw = ctx.measureText(name).width
    ctx.fillRect(px + TANK_SIZE / 2 - tw / 2 - 1, py - 13, tw + 2, 11)
    ctx.fillStyle = color
    ctx.fillText(name, px + TANK_SIZE / 2, py - 4)
  }
}

function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet, cam: Camera) {
  ctx.fillStyle = '#fff'
  ctx.fillRect(bullet.x - cam.x - 2, bullet.y - cam.y - 2, 4, 4)
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  localPlayerId: string,
) {
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  const localTank = state.tanks[localPlayerId]
  const cam = computeCamera(localTank, cw, ch)

  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, cw, ch)

  const tileX0 = Math.max(0, Math.floor(cam.x / TILE_SIZE))
  const tileY0 = Math.max(0, Math.floor(cam.y / TILE_SIZE))
  const tileX1 = Math.min(127, Math.ceil((cam.x + cw) / TILE_SIZE))
  const tileY1 = Math.min(127, Math.ceil((cam.y + ch) / TILE_SIZE))

  // Pass 1: non-tree tiles
  for (let ty = tileY0; ty <= tileY1; ty++) {
    for (let tx = tileX0; tx <= tileX1; tx++) {
      const type = state.map[ty]?.[tx]
      if (type && type !== 'tree') drawTile(ctx, type, tx * TILE_SIZE - cam.x, ty * TILE_SIZE - cam.y)
    }
  }

  // Alive tanks (below trees)
  for (const tank of Object.values(state.tanks)) {
    if (!tank.alive) continue
    const color = getTankColor(tank.id, localPlayerId)
    const name = state.players[tank.id]?.name ?? ''
    drawTank(ctx, tank, color, name, cam)
  }

  // Bullets
  for (const bullet of Object.values(state.bullets)) {
    drawBullet(ctx, bullet, cam)
  }

  // Pass 2: trees on top (hide tanks beneath)
  for (let ty = tileY0; ty <= tileY1; ty++) {
    for (let tx = tileX0; tx <= tileX1; tx++) {
      if (state.map[ty]?.[tx] === 'tree') drawTile(ctx, 'tree', tx * TILE_SIZE - cam.x, ty * TILE_SIZE - cam.y)
    }
  }
}
