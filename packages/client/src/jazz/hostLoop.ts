import { moveTank, moveBullet, destroyTile, MAX_BULLETS_PER_PLAYER, RESPAWN_TICKS, KILL_SCORE } from '@battle-city/shared'
import type { GameState, InputEvent, Tank, Bullet, Direction } from '@battle-city/shared'

let bulletSeq = 0

function nextBulletId(playerId: string): string {
  return `${playerId}-${++bulletSeq}`
}

function pickRespawnPoint(
  spawnPoints: { x: number; y: number }[],
  tanks: Record<string, Tank>,
): { x: number; y: number } {
  const occupied = Object.values(tanks).filter((t) => t.alive)
  const free = spawnPoints.filter(
    (sp) => !occupied.some((t) => Math.abs(t.x - sp.x) < 32 && Math.abs(t.y - sp.y) < 32),
  )
  if (free.length > 0) return free[Math.floor(Math.random() * free.length)]
  return spawnPoints[Math.floor(Math.random() * spawnPoints.length)]
}

export function tickGame(state: GameState, inputs: InputEvent[]): GameState {
  const nextTick = state.tick + 1

  if (state.roundPhase === 'ended') {
    return { ...state, tick: nextTick }
  }

  if (nextTick >= state.roundEndsAt) {
    return { ...state, tick: nextTick, roundPhase: 'ended' }
  }

  // Index inputs by player
  const inputByPlayer = new Map<string, InputEvent>()
  for (const ev of inputs) inputByPlayer.set(ev.playerId, ev)

  let tanks = { ...state.tanks }
  let bullets = { ...state.bullets }
  let map = state.map

  // Move bullets and resolve hits
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
            ...(shooter
              ? {
                  [shooter.id]: {
                    ...shooter,
                    kills: shooter.kills + 1,
                    score: shooter.score + KILL_SCORE,
                  },
                }
              : {}),
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
      tanks = { ...tanks, [id]: { ...tank, alive: true, x: sp.x, y: sp.y } }
    }
  }

  // Apply player inputs: move tanks and spawn bullets
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
      const alreadyFiring = Object.values(bullets).filter((b) => b.ownerId === pid)
      if (alreadyFiring.length < MAX_BULLETS_PER_PLAYER) {
        const id = nextBulletId(pid)
        const currentTank = tanks[pid]
        const newBullet: Bullet = {
          id,
          ownerId: pid,
          x: currentTank.x,
          y: currentTank.y,
          direction: currentTank.direction,
        }
        bullets = { ...bullets, [id]: newBullet }
      }
    }
  }

  return { ...state, tick: nextTick, tanks, bullets, map }
}
