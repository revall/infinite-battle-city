import { create } from 'zustand'
import type { RoomInfo } from '@battle-city/shared'

interface RoomState {
  playerName: string
  roomId: string | null
  roomType: 'public' | 'private' | null
  rooms: RoomInfo[]
  setPlayerName: (name: string) => void
  setRoom: (id: string, type: 'public' | 'private') => void
  setRooms: (rooms: RoomInfo[]) => void
  clearRoom: () => void
}

export const useRoomStore = create<RoomState>((set) => ({
  playerName: '',
  roomId: null,
  roomType: null,
  rooms: [],
  setPlayerName: (name) => set({ playerName: name }),
  setRoom: (id, type) => set({ roomId: id, roomType: type }),
  setRooms: (rooms) => set({ rooms }),
  clearRoom: () => set({ roomId: null, roomType: null }),
}))
