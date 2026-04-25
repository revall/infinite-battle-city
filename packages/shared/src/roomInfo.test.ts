import { describe, it, expect } from 'vitest'
import type { RoomInfo } from './types'

describe('RoomInfo', () => {
  it('satisfies required shape', () => {
    const info: RoomInfo = {
      id: 'r1',
      playerCount: 3,
      phase: 'playing',
      isPrivate: false,
    }
    expect(info.id).toBe('r1')
    expect(info.playerCount).toBe(3)
    expect(info.phase).toBe('playing')
    expect(info.isPrivate).toBe(false)
  })
})
