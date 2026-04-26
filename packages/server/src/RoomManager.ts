import { MAX_PLAYERS } from '@tankr/shared'
import type { RoomInfo } from '@tankr/shared'
import { RoomInstance } from './RoomInstance'

export class RoomManager {
  private rooms = new Map<string, RoomInstance>()

  getOrCreatePublic(): RoomInstance {
    let best: RoomInstance | null = null
    for (const room of this.rooms.values()) {
      if (!room.isPrivate && room.playerCount < MAX_PLAYERS) {
        if (!best || room.playerCount < best.playerCount) best = room
      }
    }
    return best ?? this.createRoom(this.generateId(), false)
  }

  createPrivate(): RoomInstance {
    return this.createRoom(this.generateCode(), true)
  }

  get(id: string): RoomInstance | undefined {
    return this.rooms.get(id)
  }

  publicRooms(): RoomInfo[] {
    return [...this.rooms.values()]
      .filter((r) => !r.isPrivate)
      .map((r) => r.toInfo())
  }

  private createRoom(id: string, isPrivate: boolean): RoomInstance {
    const room = new RoomInstance(id, isPrivate)
    room.onDissolve = () => this.rooms.delete(id)
    this.rooms.set(id, room)
    return room
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 10)
  }

  private generateCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase()
  }
}
