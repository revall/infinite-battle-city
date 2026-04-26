import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Lobby from './components/Lobby.tsx'
import GameCanvas from './components/GameCanvas.tsx'
import { useRoomStore } from './store/roomStore.ts'

function RequireRoom({ children }: { children: React.ReactNode }) {
  const roomId = useRoomStore((s) => s.roomId)
  if (!roomId) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route
          path="/game"
          element={
            <RequireRoom>
              <GameCanvas />
            </RequireRoom>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
