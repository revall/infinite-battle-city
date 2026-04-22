import {
  tickGame,
  spawnTankForPlayer,
  generateMap,
  ROUND_DURATION_TICKS,
  TILE_SIZE,
} from '@battle-city/shared'
import type { GameState, InputEvent, Direction } from '@battle-city/shared'

const SERVER_HZ = 20
const SUBTICKS = 3
const ROUND_END_RESET_MS = 10_000

type ClientMsg =
  | { type: 'join'; name: string }
  | { type: 'input'; moveDir: Direction | null; shoot: boolean }
  | { type: 'rematch' }

interface Conn {
  ws: WebSocket
  id: string
}

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

export class GameRoom implements DurableObject {
  private conns = new Set<Conn>()
  private state: GameState = freshState()
  private inputs = new Map<string, InputEvent>()
  private interval: ReturnType<typeof setInterval> | null = null
  private resetTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(_ctx: DurableObjectState, _env: unknown) {}

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]
    server.accept()

    const conn: Conn = { ws: server, id: crypto.randomUUID() }
    this.conns.add(conn)
    this.onConnect(conn)

    server.addEventListener('message', (e) => {
      const data = typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data as ArrayBuffer)
      this.onMessage(data, conn)
    })
    const drop = () => {
      if (!this.conns.has(conn)) return
      this.conns.delete(conn)
      this.onClose(conn)
    }
    server.addEventListener('close', drop)
    server.addEventListener('error', drop)

    return new Response(null, { status: 101, webSocket: client })
  }

  private send(conn: Conn, msg: unknown) {
    try { conn.ws.send(JSON.stringify(msg)) } catch { /* ignore send-on-closed */ }
  }

  private broadcast() {
    const payload = JSON.stringify({ type: 'state', state: this.state })
    for (const c of this.conns) {
      try { c.ws.send(payload) } catch { /* ignore */ }
    }
  }

  private onConnect(conn: Conn) {
    this.send(conn, { type: 'welcome', id: conn.id })
    this.send(conn, { type: 'state', state: this.state })
    this.startLoop()
  }

  private onMessage(raw: string, sender: Conn) {
    let msg: ClientMsg
    try { msg = JSON.parse(raw) } catch { return }

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
      if (this.state.roundPhase === 'ended') this.doRematch()
    }
  }

  private onClose(conn: Conn) {
    this.inputs.delete(conn.id)
    const { [conn.id]: _t, ...tanks } = this.state.tanks
    const { [conn.id]: _p, ...players } = this.state.players
    this.state = { ...this.state, tanks, players }
    this.broadcast()

    if (this.conns.size === 0) {
      this.stopLoop()
      this.state = freshState()
    }
  }

  private startLoop() {
    if (this.interval) return
    this.interval = setInterval(() => this.tick(), 1000 / SERVER_HZ)
  }

  private stopLoop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null }
    if (this.resetTimeout) { clearTimeout(this.resetTimeout); this.resetTimeout = null }
  }

  private tick() {
    if (this.state.roundPhase !== 'playing') return

    const activeIds = new Set<string>()
    for (const c of this.conns) activeIds.add(c.id)
    for (const id of Object.keys(this.state.players)) {
      if (!activeIds.has(id)) {
        const { [id]: _p, ...players } = this.state.players
        const { [id]: _t, ...tanks } = this.state.tanks
        this.state = { ...this.state, players, tanks }
        this.inputs.delete(id)
      }
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

  private doRematch() {
    if (this.resetTimeout) { clearTimeout(this.resetTimeout); this.resetTimeout = null }
    const { tiles, spawnPoints } = generateMap(Date.now())
    this.state = {
      ...freshState(),
      roundPhase: 'playing',
      map: tiles,
      spawnPoints: spawnPoints.map((sp) => ({ x: sp.x * TILE_SIZE, y: sp.y * TILE_SIZE })),
      players: this.state.players,
    }
    this.broadcast()
  }
}
