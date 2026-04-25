import { describe, it, expect, beforeEach } from 'vitest'
import { useRoomStore } from './roomStore'
import type { RoomInfo } from '@battle-city/shared'

const reset = () =>
  useRoomStore.setState({ playerName: '', roomId: null, roomType: null, rooms: [] })

describe('roomStore', () => {
  beforeEach(reset)

  it('setRoom stores roomId and roomType', () => {
    useRoomStore.getState().setRoom('r1', 'public')
    const s = useRoomStore.getState()
    expect(s.roomId).toBe('r1')
    expect(s.roomType).toBe('public')
  })

  it('setRoom works for private type', () => {
    useRoomStore.getState().setRoom('ABC123', 'private')
    expect(useRoomStore.getState().roomType).toBe('private')
  })

  it('setRooms updates rooms list', () => {
    const rooms: RoomInfo[] = [
      { id: 'r1', playerCount: 3, phase: 'playing', isPrivate: false },
    ]
    useRoomStore.getState().setRooms(rooms)
    expect(useRoomStore.getState().rooms).toEqual(rooms)
  })

  it('clearRoom resets roomId and roomType', () => {
    useRoomStore.getState().setRoom('r1', 'private')
    useRoomStore.getState().clearRoom()
    const s = useRoomStore.getState()
    expect(s.roomId).toBeNull()
    expect(s.roomType).toBeNull()
  })

  it('setPlayerName updates name', () => {
    useRoomStore.getState().setPlayerName('Alice')
    expect(useRoomStore.getState().playerName).toBe('Alice')
  })
})
