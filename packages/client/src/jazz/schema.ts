import { CoMap, CoList, coField } from 'jazz-tools'
import type { Tank, Bullet, RoundPhase, TileType, Direction } from '@battle-city/shared'

// Per-player identity + current keyboard state (player writes, host reads each tick)
export class PlayerCoMap extends CoMap {
  name = coField.string
  joinedAt = coField.number
  accountId = coField.string
  inputMoveDir = coField.optional.json<Direction>()
  inputShoot = coField.boolean
}

export class PlayerList extends CoList.Of(coField.ref(PlayerCoMap)) {}

// Initial map for a round — set once, updated only when bricks are destroyed
export class MapCoMap extends CoMap {
  tilesJson = coField.json<TileType[][]>()
  // Stored as tile indices; converted to pixels when loaded into GameState
  spawnPointsJson = coField.json<Array<{ x: number; y: number }>>()
}

// Authoritative tick state — host writes at 60 Hz
export class TickStateCoMap extends CoMap {
  tick = coField.number
  roundPhase = coField.json<RoundPhase>()
  roundEndsAt = coField.number
  tanksJson = coField.json<Record<string, Tank>>()
  bulletsJson = coField.json<Record<string, Bullet>>()
}

// Root room object — single global instance
export class RoomCoMap extends CoMap {
  hostId = coField.string
  tickState = coField.ref(TickStateCoMap)
  currentMap = coField.ref(MapCoMap)
  players = coField.ref(PlayerList)
}
