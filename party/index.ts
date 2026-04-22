import type * as Party from 'partykit/server'
import {
  tickGame, spawnTankForPlayer, generateMap,
  ROUND_DURATION_TICKS, TILE_SIZE,
} from '@battle-city/shared'
import type { GameState, InputEvent, Direction } from '@battle-city/shared'

// 20 Hz server loop; each interval runs 3 physics sub-ticks (~60 Hz equivalent)
const SERVER_HZ = 20
const SUBTICKS = 3
const ROUND_END_RESET_MS = 10_000

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
    tanks: {}, bullets: {}, players: {},
    hostId: 'server',
  }
}

export default class Server implements Party.Server {
  state: GameState = freshState()
  inputs = new Map<string, InputEvent>()
  interval: ReturnType<typeof setInterval> | null = null
  resetTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(readonly party: Party.Room) {}

  onConnect(conn: Party.Connection) {
    conn.send(JSON.stringify({ type: 'welcome', id: conn.id }))
    conn.send(JSON.stringify({ type: 'state', state: this.state }))
    this.startLoop()
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMsg
    try { msg = JSON.parse(message) } catch { return }

    if (msg.type === 'join') {
      this.state = {
        ...this.state,
        roundPhase: 'playing',
        players: {
          ...this.state.players,
          [sender.id]: { id: sender.id, name: msg.name, joinedAt: Date.now() },
        },
      }
      this.broadcast()
    }

    if (msg.type === 'input') {
      this.inputs.set(sender.id, {
        playerId: sender.id,
        tick: this.state.tick,
        moveDir: msg.moveDir,
        shoot: msg.shoot,
      })
    }

    if (msg.type === 'rematch') {
      // Only honour rematch when a round is actually over — ignore rapid duplicates
      if (this.state.roundPhase === 'ended') this.doRematch()
    }
  }

  onClose(conn: Party.Connection) {
    this.inputs.delete(conn.id)
    const { [conn.id]: _t, ...tanks } = this.state.tanks
    const { [conn.id]: _p, ...players } = this.state.players
    this.state = { ...this.state, tanks, players }
    this.broadcast()

    if ([...this.party.getConnections()].length === 0) {
      this.stopLoop()
      this.state = freshState()
    }
  }

  startLoop() {
    if (this.interval) return
    this.interval = setInterval(() => this.tick(), 1000 / SERVER_HZ)
  }

  stopLoop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null }
  }

  tick() {
    if (this.state.roundPhase !== 'playing') return

    // Reconcile players with active connections — reap ghosts whose onClose didn't fire
    const activeIds = new Set<string>()
    for (const c of this.party.getConnections()) activeIds.add(c.id)
    for (const id of Object.keys(this.state.players)) {
      if (!activeIds.has(id)) {
        const { [id]: _p, ...players } = this.state.players
        const { [id]: _t, ...tanks } = this.state.tanks
        this.state = { ...this.state, players, tanks }
        this.inputs.delete(id)
      }
    }

    // Spawn tanks for all known players
    for (const id of Object.keys(this.state.players)) {
      this.state = spawnTankForPlayer(id, this.state)
    }

    const inputs = [...this.inputs.values()]
    for (let i = 0; i < SUBTICKS; i++) {
      this.state = tickGame(this.state, inputs)
    }

    // Schedule auto-reset after round ends
    if (this.state.roundPhase === 'ended' && !this.resetTimeout) {
      this.resetTimeout = setTimeout(() => this.doRematch(), ROUND_END_RESET_MS)
    }

    this.broadcast()
  }

  doRematch() {
    if (this.resetTimeout) { clearTimeout(this.resetTimeout); this.resetTimeout = null }
    const { tiles, spawnPoints } = generateMap(Date.now())
    this.state = {
      ...freshState(),
      roundPhase: 'playing',
      map: tiles,
      spawnPoints: spawnPoints.map((sp) => ({ x: sp.x * TILE_SIZE, y: sp.y * TILE_SIZE })),
      // Keep player list so they re-spawn without re-joining
      players: this.state.players,
    }
    this.broadcast()
  }

  broadcast() {
    this.party.broadcast(JSON.stringify({ type: 'state', state: this.state }))
  }
}
