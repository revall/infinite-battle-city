import { moveTank, moveBullet, destroyTile } from './physics'
import { MAX_BULLETS_PER_PLAYER, RESPAWN_TICKS, KILL_SCORE, TANK_SIZE, CANNON_OUT } from './constants'
import type { GameState, InputEvent, Tank, Bullet, Direction } from './types'

let bulletSeq = 0

function nextBulletId(playerId: string): string {
  return `${playerId}-${++bulletSeq}`
}

/** Position of the cannon tip — used for both rendering and bullet spawn. */
export function cannonTip(tank: Tank): { x: number; y: number } {
  const cx = tank.x + TANK_SIZE / 2
  const cy = tank.y + TANK_SIZE / 2
  switch (tank.direction) {
    case 'up':    return { x: cx, y: tank.y - CANNON_OUT }
    case 'down':  return { x: cx, y: tank.y + TANK_SIZE + CANNON_OUT }
    case 'left':  return { x: tank.x - CANNON_OUT, y: cy }
    case 'right': return { x: tank.x + TANK_SIZE + CANNON_OUT, y: cy }
  }
}

export function pickRespawnPoint(
  spawnPoints: { x: number; y: number }[],
  tanks: Record<string, Tank>,
): { x: number; y: number } | null {
  if (spawnPoints.length === 0) return null
  const occupied = Object.values(tanks).filter((t) => t.alive)
  const free = spawnPoints.filter(
    (sp) => !occupied.some((t) => Math.abs(t.x - sp.x) < 32 && Math.abs(t.y - sp.y) < 32),
  )
  const pool = free.length > 0 ? free : spawnPoints
  return pool[Math.floor(Math.random() * pool.length)]
}

export function spawnTankForPlayer(playerId: string, state: GameState): GameState {
  if (state.tanks[playerId]) return state
  const sp = pickRespawnPoint(state.spawnPoints, state.tanks)
  if (!sp) return state
  const tank: Tank = {
    id: playerId, x: sp.x, y: sp.y, direction: 'up',
    alive: true, respawnTick: 0, score: 0, kills: 0,
  }
  return { ...state, tanks: { ...state.tanks, [playerId]: tank } }
}

export function tickGame(state: GameState, inputs: InputEvent[]): GameState {
  const nextTick = state.tick + 1

  if (state.roundPhase === 'ended') return { ...state, tick: nextTick }
  if (nextTick >= state.roundEndsAt) return { ...state, tick: nextTick, roundPhase: 'ended' }

  const inputByPlayer = new Map<string, InputEvent>()
  for (const ev of inputs) inputByPlayer.set(ev.playerId, ev)

  let tanks = { ...state.tanks }
  let bullets = { ...state.bullets }
  let map = state.map

  // Move bullets + resolve hits
  const removedBullets = new Set<string>()
  for (const [bid, bullet] of Object.entries(bullets)) {
    const { bullet: moved, hit } = moveBullet(bullet, map, tanks)
    if (hit) {
      removedBullets.add(bid)
      if (hit.type === 'wall' && hit.tileType === 'brick' && hit.tileX !== undefined && hit.tileY !== undefined) {
        map = destroyTile(map, hit.tileX, hit.tileY)
      }
      if (hit.type === 'tank' && hit.tankId) {
        const victim = tanks[hit.tankId]
        const shooter = Object.values(tanks).find((t) => t.id === bullet.ownerId)
        if (victim?.alive) {
          tanks = {
            ...tanks,
            [hit.tankId]: { ...victim, alive: false, respawnTick: state.tick + RESPAWN_TICKS },
            ...(shooter ? { [shooter.id]: { ...shooter, kills: shooter.kills + 1, score: shooter.score + KILL_SCORE } } : {}),
          }
        }
      }
    } else {
      bullets = { ...bullets, [bid]: moved }
    }
  }
  for (const bid of removedBullets) {
    const { [bid]: _, ...rest } = bullets
    bullets = rest
  }

  // Respawn dead tanks
  for (const [id, tank] of Object.entries(tanks)) {
    if (!tank.alive && nextTick >= tank.respawnTick) {
      const sp = pickRespawnPoint(state.spawnPoints, tanks)
      if (sp) tanks = { ...tanks, [id]: { ...tank, alive: true, x: sp.x, y: sp.y } }
    }
  }

  // Apply inputs: move tanks + fire bullets
  const allTanks = Object.values(tanks)
  for (const [pid, tank] of Object.entries(tanks)) {
    if (!tank.alive) continue
    const input = inputByPlayer.get(pid)
    if (!input) continue
    if (input.moveDir) {
      const others = allTanks.filter((t) => t.id !== pid)
      tanks = { ...tanks, [pid]: moveTank(tank, input.moveDir as Direction, map, others) }
    }
    if (input.shoot) {
      const flying = Object.values(bullets).filter((b) => b.ownerId === pid)
      if (flying.length < MAX_BULLETS_PER_PLAYER) {
        const id = nextBulletId(pid)
        const cur = tanks[pid]
        const tip = cannonTip(cur)
        const newBullet: Bullet = { id, ownerId: pid, x: tip.x, y: tip.y, direction: cur.direction }
        bullets = { ...bullets, [id]: newBullet }
      }
    }
  }

  return { ...state, tick: nextTick, tanks, bullets, map }
}
