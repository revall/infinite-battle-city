import { create } from 'zustand'

interface RoomState {
  playerName: string
  roomId: string | null
  setPlayerName: (name: string) => void
  setRoomId: (id: string) => void
}

export const useRoomStore = create<RoomState>((set) => ({
  playerName: '',
  roomId: null,
  setPlayerName: (name) => set({ playerName: name }),
  setRoomId: (id) => set({ roomId: id }),
}))
