import { useEffect, useRef, useState, useCallback } from 'react'
import { useAccountOrGuest, useCoState } from 'jazz-react'
import { Group, Account } from 'jazz-tools'
import { generateMap, ROUND_DURATION_TICKS, TILE_SIZE } from '@battle-city/shared'
import type { GameState, InputEvent, Tank } from '@battle-city/shared'
import { RoomCoMap, TickStateCoMap, MapCoMap, PlayerCoMap, PlayerList } from './schema.ts'
import { tickGame } from './hostLoop.ts'
import { createInputHandler } from '../game/inputHandler.ts'

const ROOM_STORAGE_KEY = 'battle-city:roomId'
const TICK_MS = 1000 / 60
const HOST_TIMEOUT_MS = 5000

function getOrCreateLocalId(): string {
  const key = 'battle-city:localId'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}

function getRoomIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('room')
}

function setRoomIdInUrl(id: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('room', id)
  window.history.replaceState(null, '', url.toString())
}

function isAccount(me: unknown): me is Account {
  return !!me && typeof me === 'object' && 'id' in me && '_type' in me && (me as Account)._type === 'Account'
}

function stateFromJazz(
  tickState: TickStateCoMap,
  mapData: MapCoMap,
  players: PlayerList,
  hostId: string,
): GameState {
  return {
    tick: tickState.tick ?? 0,
    roundPhase: tickState.roundPhase ?? 'playing',
    roundEndsAt: tickState.roundEndsAt ?? ROUND_DURATION_TICKS,
    map: mapData.tilesJson ?? [],
    spawnPoints: (mapData.spawnPointsJson ?? []).map((sp) => ({
      x: sp.x * TILE_SIZE,
      y: sp.y * TILE_SIZE,
    })),
    tanks: tickState.tanksJson ?? {},
    bullets: tickState.bulletsJson ?? {},
    players: Object.fromEntries(
      (players ?? [])
        .filter(Boolean)
        .map((p) => [p!.accountId, { id: p!.accountId, name: p!.name, joinedAt: p!.joinedAt }]),
    ),
    hostId,
  }
}

function spawnTankForPlayer(playerId: string, state: GameState): GameState {
  if (state.tanks[playerId]) return state
  const occupied = Object.values(state.tanks).filter((t) => t.alive)
  const free = state.spawnPoints.filter(
    (sp) => !occupied.some((t) => Math.abs(t.x - sp.x) < 32 && Math.abs(t.y - sp.y) < 32),
  )
  const pool = free.length > 0 ? free : state.spawnPoints
  const sp = pool[Math.floor(Math.random() * pool.length)]
  if (!sp) return state
  const tank: Tank = { id: playerId, x: sp.x, y: sp.y, direction: 'up', alive: true, respawnTick: 0, score: 0, kills: 0 }
  return { ...state, tanks: { ...state.tanks, [playerId]: tank } }
}

export function useGameSync(localName: string) {
  const { me } = useAccountOrGuest()
  const localIdRef = useRef(getOrCreateLocalId())
  const playerId = isAccount(me) ? (me.id as string) : localIdRef.current

  const [roomId, setRoomId] = useState<string | null>(
    () => getRoomIdFromUrl() ?? localStorage.getItem(ROOM_STORAGE_KEY),
  )
  const room = useCoState(RoomCoMap, roomId ?? undefined, {
    resolve: { tickState: true, currentMap: true, players: true },
  })

  // ── Keep a ref to room so interval callbacks always see latest value
  //    without needing room in their effect deps (which would reset every tick)
  const roomRef = useRef(room)
  useEffect(() => { roomRef.current = room }, [room])

  const [gameState, setGameState] = useState<GameState | null>(null)
  const gameStateRef = useRef<GameState | null>(null)
  const inputRef = useRef(createInputHandler())
  const joinedRef = useRef(false)
  const myPlayerRef = useRef<PlayerCoMap | null>(null)
  const playerIdRef = useRef(playerId)
  useEffect(() => { playerIdRef.current = playerId }, [playerId])

  // ── Sync Jazz → local GameState (runs every time room updates) ───────
  useEffect(() => {
    if (!room?.tickState || !room?.currentMap || !room?.players) return
    const gs = stateFromJazz(room.tickState, room.currentMap, room.players, room.hostId ?? '')
    gameStateRef.current = gs
    setGameState(gs)
  }, [room])

  // ── Stale room: null = Jazz confirmed it doesn't exist ────────────────
  useEffect(() => {
    if (room !== null) return
    localStorage.removeItem(ROOM_STORAGE_KEY)
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState(null, '', url.toString())
    joinedRef.current = false
    setRoomId(null)
  }, [room])

  // ── Bootstrap: first player creates the global room ──────────────────
  const bootstrap = useCallback(async () => {
    if (!isAccount(me) || roomId) return
    const urlId = getRoomIdFromUrl()
    if (urlId) { localStorage.setItem(ROOM_STORAGE_KEY, urlId); setRoomId(urlId); return }
    const existing = localStorage.getItem(ROOM_STORAGE_KEY)
    if (existing) { setRoomIdInUrl(existing); setRoomId(existing); return }

    const group = Group.create({ owner: me })
    group.addMember('everyone', 'writer')

    const { tiles, spawnPoints } = generateMap(Date.now())
    const mapData = MapCoMap.create({ tilesJson: tiles, spawnPointsJson: spawnPoints }, { owner: group })
    const tickState = TickStateCoMap.create(
      { tick: 0, roundPhase: 'playing', roundEndsAt: ROUND_DURATION_TICKS, tanksJson: {}, bulletsJson: {} },
      { owner: group },
    )
    const playerList = PlayerList.create([], { owner: group })
    const newRoom = RoomCoMap.create(
      { hostId: playerId, tickState, currentMap: mapData, players: playerList },
      { owner: group },
    )
    localStorage.setItem(ROOM_STORAGE_KEY, newRoom.id)
    setRoomIdInUrl(newRoom.id)
    setRoomId(newRoom.id)
  }, [me, roomId, playerId])

  // ── Join: register player once + attach keyboard permanently ─────────
  //    room?.id: undefined while loading → stable ID when loaded.
  //    This re-runs when the room first loads, but not on every subsequent tick.
  useEffect(() => {
    if (!isAccount(me) || !roomRef.current || joinedRef.current) return
    joinedRef.current = true

    const group = (roomRef.current as unknown as { _owner: Group })._owner
    const pMap = PlayerCoMap.create(
      { name: localName, joinedAt: Date.now(), accountId: playerId, inputShoot: false },
      { owner: group },
    )
    myPlayerRef.current = pMap
    roomRef.current.players?.push(pMap)

    return inputRef.current.attach()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, playerId, room?.id])  // room?.id changes once: undefined→id when room loads

  // ── Host physics loop — deps exclude `room` to avoid interval restart ─
  useEffect(() => {
    if (!isAccount(me)) return

    const interval = setInterval(() => {
      const r = roomRef.current
      if (!r?.tickState || !r.currentMap || !gameStateRef.current) return
      if (r.hostId !== playerIdRef.current) return   // not host right now

      let state = gameStateRef.current
      // Always ensure the host has a tank (even before their PlayerCoMap syncs)
      state = spawnTankForPlayer(playerIdRef.current, state)
      for (const p of r.players ?? []) {
        if (p?.accountId) state = spawnTankForPlayer(p.accountId, state)
      }

      const inputs: InputEvent[] = []
      for (const p of r.players ?? []) {
        if (!p?.accountId) continue
        inputs.push({ playerId: p.accountId, tick: state.tick, moveDir: p.inputMoveDir ?? null, shoot: p.inputShoot ?? false })
      }
      const { moveDir, shoot } = inputRef.current.getInput()
      const pid = playerIdRef.current
      const idx = inputs.findIndex((i) => i.playerId === pid)
      const hostIn = { playerId: pid, tick: state.tick, moveDir, shoot }
      if (idx >= 0) inputs[idx] = hostIn; else inputs.push(hostIn)

      const next = tickGame(state, inputs)
      gameStateRef.current = next
      r.tickState.tick = next.tick
      r.tickState.roundPhase = next.roundPhase
      r.tickState.roundEndsAt = next.roundEndsAt
      r.tickState.tanksJson = next.tanks
      r.tickState.bulletsJson = next.bullets
      r.currentMap.tilesJson = next.map
    }, TICK_MS)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])                    // ← runs once per account; roomRef/playerIdRef kept fresh via separate effects

  // ── Non-host input sender ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAccount(me)) return

    const interval = setInterval(() => {
      const r = roomRef.current
      if (!myPlayerRef.current || !r || r.hostId === playerIdRef.current) return
      const { moveDir, shoot } = inputRef.current.getInput()
      myPlayerRef.current.inputMoveDir = moveDir ?? undefined
      myPlayerRef.current.inputShoot = shoot
    }, TICK_MS)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])

  // ── Host migration watchdog ───────────────────────────────────────────
  useEffect(() => {
    let lastTick = 0
    let lastAdvance = Date.now()

    const check = setInterval(() => {
      const r = roomRef.current
      if (!r || r.hostId === playerIdRef.current) return
      const cur = gameStateRef.current?.tick ?? 0
      if (cur !== lastTick) { lastTick = cur; lastAdvance = Date.now(); return }
      if (Date.now() - lastAdvance < HOST_TIMEOUT_MS) return
      const candidates = [...(r.players ?? [])]
        .filter(Boolean)
        .sort((a, b) => (a?.joinedAt ?? 0) - (b?.joinedAt ?? 0))
      const next = candidates.find((p) => p?.accountId !== r.hostId)
      if (next?.accountId === playerIdRef.current) r.hostId = playerIdRef.current
    }, 1000)

    return () => clearInterval(check)
  }, []) // runs once; all state accessed via refs

  // ── Rematch ───────────────────────────────────────────────────────────
  const rematch = useCallback(() => {
    const r = roomRef.current
    if (!r || r.hostId !== playerIdRef.current || !r.tickState) return
    r.tickState.tick = 0
    r.tickState.roundPhase = 'playing'
    r.tickState.roundEndsAt = ROUND_DURATION_TICKS
    r.tickState.tanksJson = {}
    r.tickState.bulletsJson = {}
    if (gameStateRef.current) {
      gameStateRef.current = {
        ...gameStateRef.current,
        tick: 0, roundPhase: 'playing', roundEndsAt: ROUND_DURATION_TICKS, tanks: {}, bullets: {},
      }
    }
  }, [])

  useEffect(() => { bootstrap() }, [bootstrap])

  return {
    gameState,
    localPlayerId: playerId,
    rematch,
    isHost: playerId === room?.hostId,
    roomUrl: roomId ? `${window.location.origin}${window.location.pathname}?room=${roomId}` : null,
  }
}
