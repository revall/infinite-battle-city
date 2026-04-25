import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RoomManager } from './RoomManager'

describe('RoomManager', () => {
  let manager: RoomManager

  beforeEach(() => {
    vi.useFakeTimers()
    manager = new RoomManager()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('getOrCreatePublic returns a new public room when none exists', () => {
    const room = manager.getOrCreatePublic()
    expect(room.isPrivate).toBe(false)
    expect(manager.get(room.id)).toBe(room)
  })

  it('getOrCreatePublic reuses the same room on repeated calls', () => {
    const r1 = manager.getOrCreatePublic()
    const r2 = manager.getOrCreatePublic()
    expect(r1.id).toBe(r2.id)
  })

  it('createPrivate returns a private room not visible in publicRooms', () => {
    const room = manager.createPrivate()
    expect(room.isPrivate).toBe(true)
    expect(manager.publicRooms().find(r => r.id === room.id)).toBeUndefined()
  })

  it('publicRooms lists only non-private rooms', () => {
    manager.getOrCreatePublic()
    manager.createPrivate()
    const pub = manager.publicRooms()
    expect(pub.length).toBe(1)
    expect(pub[0].isPrivate).toBe(false)
  })

  it('get returns undefined for unknown id', () => {
    expect(manager.get('does-not-exist')).toBeUndefined()
  })

  it('room is removed from manager when last player leaves', () => {
    const room = manager.getOrCreatePublic()
    const conn = { id: 'c1', send: vi.fn(), close: vi.fn() }
    room.onConnect(conn)
    expect(manager.get(room.id)).toBeDefined()
    room.onClose(conn)
    expect(manager.get(room.id)).toBeUndefined()
  })

  it('getOrCreatePublic creates a new room once existing is full', () => {
    const r1 = manager.getOrCreatePublic()
    // Simulate 40 connections
    for (let i = 0; i < 40; i++) {
      const conn = { id: `c${i}`, send: vi.fn(), close: vi.fn() }
      r1.connections.set(conn.id, conn)
    }
    const r2 = manager.getOrCreatePublic()
    expect(r2.id).not.toBe(r1.id)
  })

  it('toInfo returns correct metadata', () => {
    const room = manager.getOrCreatePublic()
    const conn = { id: 'c1', send: vi.fn(), close: vi.fn() }
    room.onConnect(conn)
    const info = room.toInfo()
    expect(info.id).toBe(room.id)
    expect(info.playerCount).toBe(1)
    expect(info.isPrivate).toBe(false)
    expect(['waiting', 'playing', 'ended']).toContain(info.phase)
  })
})
