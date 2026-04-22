import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore.ts'
import brickUrl from '../assets/brick.svg'

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
    if (!trimmed) {
      setError('Name required')
      return
    }
    localStorage.setItem('battle-city:playerName', trimmed)
    setPlayerName(trimmed)
    navigate('/game')
  }

  return (
    <div style={styles.root}>
      <h1 style={{ ...styles.title, backgroundImage: `url("${brickUrl}")` }}>
        BATTLE CITY
      </h1>
      <form onSubmit={handleJoin} style={styles.form}>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ENTER NAME"
          maxLength={24}
          autoFocus
        />
        <button style={styles.button} type="submit">
          JOIN GAME
        </button>
        <p style={{ ...styles.error, visibility: error ? 'visible' : 'hidden' }}>
          ! {error || '.'}
        </p>
      </form>
      <p style={styles.footer}>© 2026 · PRESS START</p>
    </div>
  )
}

const PIXEL_FONT = "'Geist Pixel Square', ui-monospace, monospace"
const ACCENT = '#ffffff'

const styles = {
  root: {
    background: '#000',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    fontFamily: PIXEL_FONT,
  },
  title: {
    fontFamily: PIXEL_FONT,
    fontWeight: 700,
    fontSize: 'clamp(48px, 10vw, 128px)',
    letterSpacing: '0.04em',
    margin: 0,
    backgroundSize: '0.32em 0.16em',
    backgroundRepeat: 'repeat',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
    width: 320,
    alignItems: 'stretch',
  },
  input: {
    padding: '14px 16px',
    fontSize: 22,
    background: '#000',
    border: `3px solid ${ACCENT}`,
    color: ACCENT,
    outline: 'none',
    fontFamily: PIXEL_FONT,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
  button: {
    padding: '14px 0',
    fontSize: 24,
    background: ACCENT,
    border: `3px solid ${ACCENT}`,
    color: '#000',
    cursor: 'pointer',
    fontFamily: PIXEL_FONT,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
  },
  error: {
    color: '#ff3b3b',
    margin: 0,
    fontSize: 13,
    letterSpacing: '0.06em',
    textAlign: 'center' as const,
    minHeight: '1em',
  },
  footer: {
    color: '#555',
    fontSize: 12,
    letterSpacing: '0.2em',
    fontFamily: PIXEL_FONT,
  },
}
