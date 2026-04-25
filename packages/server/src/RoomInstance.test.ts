import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RoomInstance } from './RoomInstance'

function mockConn(id: string) {
  return { id, send: vi.fn<(data: string) => void>(), close: vi.fn() }
}

describe('RoomInstance', () => {
  let room: RoomInstance

  beforeEach(() => {
    vi.useFakeTimers()
    room = new RoomInstance('test-room')
  })

  afterEach(() => {
    room.stopLoop()
    vi.useRealTimers()
  })

  it('sends welcome + state on connect', () => {
    const conn = mockConn('c1')
    room.onConnect(conn)
    expect(conn.send).toHaveBeenCalledTimes(2)
    const welcome = JSON.parse(conn.send.mock.calls[0][0] as string)
    expect(welcome).toMatchObject({ type: 'welcome', id: 'c1', roomId: 'test-room' })
    const stateMsg = JSON.parse(conn.send.mock.calls[1][0] as string)
    expect(stateMsg.type).toBe('state')
    expect(stateMsg.state).toBeDefined()
  })

  it('adds player + sets phase to playing on join message', () => {
    const conn = mockConn('c1')
    room.onConnect(conn)
    room.onMessage(JSON.stringify({ type: 'join', name: 'Alice' }), conn)
    expect(room.state.players['c1']).toMatchObject({ id: 'c1', name: 'Alice' })
    expect(room.state.roundPhase).toBe('playing')
  })

  it('records input on input message', () => {
    const conn = mockConn('c1')
    room.onConnect(conn)
    room.onMessage(JSON.stringify({ type: 'join', name: 'Alice' }), conn)
    room.onMessage(JSON.stringify({ type: 'input', moveDir: 'right', shoot: false }), conn)
    expect(room.inputs.get('c1')).toMatchObject({ playerId: 'c1', moveDir: 'right', shoot: false })
  })

  it('removes player and tank on disconnect', () => {
    const conn = mockConn('c1')
    room.onConnect(conn)
    room.onMessage(JSON.stringify({ type: 'join', name: 'Alice' }), conn)
    room.onClose(conn)
    expect(room.state.players['c1']).toBeUndefined()
    expect(room.state.tanks['c1']).toBeUndefined()
  })

  it('advances tick on each server interval', () => {
    const conn = mockConn('c1')
    room.onConnect(conn)
    room.onMessage(JSON.stringify({ type: 'join', name: 'Alice' }), conn)
    const ticksBefore = room.state.tick
    vi.advanceTimersByTime(Math.ceil(1000 / 20) * 3) // 3 server ticks
    expect(room.state.tick).toBeGreaterThan(ticksBefore)
  })

  it('isEmpty is true when last connection leaves', () => {
    const conn = mockConn('c1')
    room.onConnect(conn)
    expect(room.isEmpty).toBe(false)
    room.onClose(conn)
    expect(room.isEmpty).toBe(true)
  })

  it('playerCount reflects connected clients', () => {
    expect(room.playerCount).toBe(0)
    const c1 = mockConn('c1')
    const c2 = mockConn('c2')
    room.onConnect(c1)
    room.onConnect(c2)
    expect(room.playerCount).toBe(2)
    room.onClose(c1)
    expect(room.playerCount).toBe(1)
  })
})
