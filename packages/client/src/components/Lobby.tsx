import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore.ts'

export default function Lobby() {
  const [name, setName] = useState(
    () => localStorage.getItem('battle-city:playerName') ?? '',
  )
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setPlayerName = useRoomStore((s) => s.setPlayerName)

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Name required'); return }
    localStorage.setItem('battle-city:playerName', trimmed)
    setPlayerName(trimmed)
    navigate('/game')
  }

  return (
    <div style={styles.root}>
      <h1 style={styles.title}>BATTLE CITY</h1>
      <form onSubmit={handleJoin} style={styles.form}>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={24}
          autoFocus
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} type="submit">Join Game</button>
      </form>
    </div>
  )
}

const styles = {
  root: {
    background: '#111', height: '100vh', display: 'flex',
    flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'center', gap: 24, fontFamily: 'monospace',
  },
  title: { color: '#f5c518', fontSize: 48, letterSpacing: 8, margin: 0 },
  form: { display: 'flex', flexDirection: 'column' as const, gap: 12, width: 280 },
  input: {
    padding: '10px 14px', fontSize: 18, background: '#222',
    border: '2px solid #444', color: '#fff', outline: 'none', fontFamily: 'monospace',
  },
  error: { color: '#f55', margin: 0, fontSize: 13 },
  button: {
    padding: '10px 0', fontSize: 18, background: '#f5c518',
    border: 'none', color: '#111', cursor: 'pointer',
    fontFamily: 'monospace', fontWeight: 'bold' as const,
  },
}
