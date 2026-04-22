import { TILE_SIZE, TANK_SIZE, CANNON_WIDTH, CANNON_OUT } from '@battle-city/shared'
import type { GameState, TileType, Tank, Bullet } from '@battle-city/shared'

const TILE_COLORS: Record<TileType, string | null> = {
  open: '#1a1a1a',
  brick: '#c0392b',
  steel: '#7f8c8d',
  water: '#2980b9',
  tree: '#27ae60',
  ice: '#85c1e9',
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
  ctx.fillStyle = TILE_COLORS[type] ?? '#1a1a1a'
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
  if (type === 'brick') {
    ctx.strokeStyle = '#922b21'
    ctx.lineWidth = 1
    ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
  }
  if (type === 'water') {
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(px + 2, py + 4, TILE_SIZE - 4, 2)
    ctx.fillRect(px + 4, py + 9, TILE_SIZE - 6, 2)
  }
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

  // Body
  ctx.fillStyle = color
  ctx.fillRect(px, py, TANK_SIZE, TANK_SIZE)

  // Cannon — extends CANNON_OUT pixels past the tank edge, CANNON_WIDTH thick
  ctx.fillStyle = '#111'
  const W = CANNON_WIDTH
  const OUT = CANNON_OUT
  const IN = TANK_SIZE / 2 // depth into tank body
  const mid = TANK_SIZE / 2
  switch (tank.direction) {
    case 'up':    ctx.fillRect(px + mid - W / 2, py - OUT, W, IN + OUT); break
    case 'down':  ctx.fillRect(px + mid - W / 2, py + TANK_SIZE - IN, W, IN + OUT); break
    case 'left':  ctx.fillRect(px - OUT, py + mid - W / 2, IN + OUT, W); break
    case 'right': ctx.fillRect(px + TANK_SIZE - IN, py + mid - W / 2, IN + OUT, W); break
  }

  // Player name above tank
  if (name) {
    ctx.font = '9px "Geist Mono", ui-monospace, monospace'
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
