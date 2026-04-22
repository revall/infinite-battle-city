import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lobby from './components/Lobby.tsx'
import GameCanvas from './components/GameCanvas.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/game" element={<GameCanvas />} />
      </Routes>
    </BrowserRouter>
  )
}
