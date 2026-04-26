import {
  tickGame,
  spawnTankForPlayer,
  generateMap,
  ROUND_DURATION_TICKS,
  TILE_SIZE,
} from '@tankr/shared'
import type { GameState, InputEvent, Direction, RoomInfo } from '@tankr/shared'

const SERVER_HZ = 20
const SUBTICKS = 3
const ROUND_END_RESET_MS = 33_000
const IDLE_KICK_MS = 60_000

const VALID_DIRS = new Set<unknown>(['up', 'down', 'left', 'right', null])

export interface Connection {
  id: string
  send(data: string): void
  close(code?: number, reason?: string): void
}

type ClientMsg =
  | { type: 'join'; name: string }
  | { type: 'input'; moveDir: Direction | null; shoot: boolean }
  | { type: 'rematch' }

function freshState(): GameState {
  const { tiles, spawnPoints } = generateMap(Date.now())
  return {
    tick: 0,
    roundPhase: 'waiting',
    roundEndsAt: ROUND_DURATION_TICKS,
    map: tiles,
    spawnPoints: spawnPoints.map((sp) => ({ x: sp.x * TILE_SIZE, y: sp.y * TILE_SIZE })),
    tanks: {},
    bullets: {},
    players: {},
    hostId: 'server',
  }
}

export class RoomInstance {
  readonly id: string
  readonly isPrivate: boolean
  state: GameState = freshState()
  inputs = new Map<string, InputEvent>()
  connections = new Map<string, Connection>()
  lastActiveAt = new Map<string, number>()
  interval: ReturnType<typeof setInterval> | null = null
  resetTimeout: ReturnType<typeof setTimeout> | null = null
  onDissolve: (() => void) | null = null

  constructor(id: string, isPrivate = false) {
    this.id = id
    this.isPrivate = isPrivate
  }

  get playerCount(): number {
    return this.connections.size
  }

  get isEmpty(): boolean {
    return this.connections.size === 0
  }

  toInfo(): RoomInfo {
    return {
      id: this.id,
      playerCount: this.playerCount,
      phase: this.state.roundPhase,
      isPrivate: this.isPrivate,
    }
  }

  onConnect(conn: Connection): void {
    this.connections.set(conn.id, conn)
    this.lastActiveAt.set(conn.id, Date.now())
    conn.send(JSON.stringify({ type: 'welcome', id: conn.id, roomId: this.id }))
    conn.send(JSON.stringify({ type: 'state', state: this.state }))
    this.startLoop()
  }

  onMessage(message: string, sender: Connection): void {
    let msg: ClientMsg
    try { msg = JSON.parse(message) } catch { return }

    if (msg.type === 'join') {
      if (typeof msg.name !== 'string') return
      const name = msg.name.slice(0, 32)
      this.lastActiveAt.set(sender.id, Date.now())
      this.state = {
        ...this.state,
        roundPhase: 'playing',
        players: {
          ...this.state.players,
          [sender.id]: { id: sender.id, name, joinedAt: Date.now() },
        },
      }
      this.broadcast()
    }

    if (msg.type === 'input') {
      if (!VALID_DIRS.has(msg.moveDir) || typeof msg.shoot !== 'boolean') return
      if (msg.moveDir !== null || msg.shoot) this.lastActiveAt.set(sender.id, Date.now())
      this.inputs.set(sender.id, {
        playerId: sender.id,
        tick: this.state.tick,
        moveDir: msg.moveDir,
        shoot: msg.shoot,
      })
    }

    if (msg.type === 'rematch') {
      if (this.state.roundPhase === 'ended') this.doRematch()
    }
  }

  onClose(conn: Connection): void {
    this.connections.delete(conn.id)
    this.removePlayerState(conn.id)
    this.broadcast()

    if (this.isEmpty) {
      this.stopLoop()
      this.state = freshState()
      this.onDissolve?.()
    }
  }

  startLoop(): void {
    if (this.interval) return
    this.interval = setInterval(() => this.tick(), 1000 / SERVER_HZ)
  }

  stopLoop(): void {
    if (this.interval) { clearInterval(this.interval); this.interval = null }
    if (this.resetTimeout) { clearTimeout(this.resetTimeout); this.resetTimeout = null }
  }

  tick(): void {
    if (this.state.roundPhase !== 'playing') return

    const now = Date.now()
    for (const [id, conn] of [...this.connections]) {
      const last = this.lastActiveAt.get(id) ?? now
      if (now - last > IDLE_KICK_MS) {
        this.removePlayerState(id)
        conn.close(4001, 'idle')
      }
    }

    // Reap ghosts whose onClose didn't fire
    const activeIds = new Set(this.connections.keys())
    for (const id of Object.keys(this.state.players)) {
      if (!activeIds.has(id)) this.removePlayerState(id)
    }

    for (const id of Object.keys(this.state.players)) {
      this.state = spawnTankForPlayer(id, this.state)
    }

    const inputs = [...this.inputs.values()]
    for (let i = 0; i < SUBTICKS; i++) {
      this.state = tickGame(this.state, inputs)
    }

    if (this.state.roundPhase === 'ended' && !this.resetTimeout) {
      this.resetTimeout = setTimeout(() => this.doRematch(), ROUND_END_RESET_MS)
    }

    this.broadcast()
  }

  doRematch(): void {
    if (this.resetTimeout) { clearTimeout(this.resetTimeout); this.resetTimeout = null }
    const { tiles, spawnPoints } = generateMap(Date.now())
    let state: GameState = {
      ...freshState(),
      roundPhase: 'playing',
      map: tiles,
      spawnPoints: spawnPoints.map((sp) => ({ x: sp.x * TILE_SIZE, y: sp.y * TILE_SIZE })),
      players: this.state.players,
    }
    for (const id of Object.keys(state.players)) {
      state = spawnTankForPlayer(id, state)
    }
    this.state = state
    this.broadcast()
  }

  broadcast(): void {
    const msg = JSON.stringify({ type: 'state', state: this.state })
    for (const conn of this.connections.values()) {
      conn.send(msg)
    }
  }

  private removePlayerState(id: string): void {
    const { [id]: _t, ...tanks } = this.state.tanks
    const { [id]: _p, ...players } = this.state.players
    this.state = { ...this.state, tanks, players }
    this.inputs.delete(id)
    this.lastActiveAt.delete(id)
  }
}
