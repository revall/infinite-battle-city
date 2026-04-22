export type TileType = 'open' | 'brick' | 'steel' | 'water' | 'tree' | 'ice'

export interface Tile {
  type: TileType
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Tank {
  id: string
  x: number
  y: number
  direction: Direction
  alive: boolean
  respawnTick: number
  score: number
  kills: number
}

export interface Bullet {
  id: string
  ownerId: string
  x: number
  y: number
  direction: Direction
}

export interface Player {
  id: string
  name: string
  joinedAt: number
}

export type RoundPhase = 'waiting' | 'playing' | 'ended'

export interface GameState {
  tick: number
  roundPhase: RoundPhase
  roundEndsAt: number
  map: TileType[][]
  spawnPoints: { x: number; y: number }[]
  tanks: Record<string, Tank>
  bullets: Record<string, Bullet>
  players: Record<string, Player>
  hostId: string
}

export interface InputEvent {
  playerId: string
  tick: number
  moveDir: Direction | null
  shoot: boolean
}
