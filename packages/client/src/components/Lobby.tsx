import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useRoomStore } from '../store/roomStore.ts'
import type { RoomInfo } from '@tankr/shared'
import brickUrl from '../assets/brick.svg'

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? `ws://${window.location.host}`
const API_URL = WS_URL.replace(/^ws/, 'http').replace(/\/[^/]+$/, '')

type Step = 'name' | 'mode' | 'browse'

export default function Lobby() {
  const [name, setName] = useState(
    () => localStorage.getItem('tankr:playerName') ?? '',
  )
  const [step, setStep] = useState<Step>('name')
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteRoomId = searchParams.get('room')
  const { setPlayerName, setRoom } = useRoomStore()

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Name required'); return }
    localStorage.setItem('tankr:playerName', trimmed)
    setPlayerName(trimmed)
    setError('')
    if (inviteRoomId) {
      setRoom(inviteRoomId, 'private')
      navigate('/game')
    } else {
      setStep('mode')
    }
  }

  const apiCall = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true)
    setError('')
    try {
      return await fn()
    } catch {
      setError('Could not reach server')
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleAutoJoin = () => apiCall(async () => {
    const res = await fetch(`${API_URL}/rooms/auto`)
    if (!res.ok) throw new Error()
    const { roomId } = await res.json() as { roomId: string }
    setRoom(roomId, 'public')
    navigate('/game')
  })

  const handleBrowse = () => apiCall(async () => {
    const res = await fetch(`${API_URL}/rooms`)
    if (!res.ok) throw new Error()
    const { rooms: list } = await res.json() as { rooms: RoomInfo[] }
    setRooms(list)
    setStep('browse')
  })

  const handlePickRoom = (roomId: string) => {
    setRoom(roomId, 'public')
    navigate('/game')
  }

  const handleCreatePrivate = () => apiCall(async () => {
    const res = await fetch(`${API_URL}/rooms`, { method: 'POST' })
    if (!res.ok) throw new Error()
    const { roomId } = await res.json() as { roomId: string }
    setRoom(roomId, 'private')
    setInviteUrl(`${window.location.origin}${import.meta.env.BASE_URL}?room=${encodeURIComponent(roomId)}`)
  })

  const handleCopyInvite = () => {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (step === 'name') {
    return (
      <div style={styles.root}>
        <h1 style={{ ...styles.title, backgroundImage: `url("${brickUrl}")` }}>
          TANKR
        </h1>
        <form onSubmit={handleNameSubmit} style={styles.form}>
          <input
            style={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ENTER NAME"
            maxLength={24}
            autoFocus
          />
          {inviteRoomId && (
            <p style={styles.inviteHint}>
              Joining room: {inviteRoomId.toUpperCase()}
            </p>
          )}
          <button style={styles.button} type="submit">
            {inviteRoomId ? 'JOIN ROOM' : 'CONTINUE'}
          </button>
          <p style={{ ...styles.error, visibility: error ? 'visible' : 'hidden' }}>
            ! {error || '.'}
          </p>
        </form>
        <p style={styles.footer}>© 2026 · PRESS START</p>
      </div>
    )
  }

  if (step === 'mode') {
    // Private room created — show invite URL before navigating
    if (inviteUrl) {
      return (
        <div style={styles.root}>
          <h2 style={styles.sectionTitle}>PRIVATE ROOM READY</h2>
          <div style={styles.form}>
            <p style={styles.inviteLabel}>Share this link with friends:</p>
            <div style={styles.inviteBox}>{inviteUrl}</div>
            <div style={styles.qrWrap}>
              <QRCodeSVG value={inviteUrl} size={160} bgColor="#000" fgColor="#ffffff" />
            </div>
            <button style={styles.button} onClick={handleCopyInvite}>
              {copied ? '✓ COPIED!' : 'COPY LINK'}
            </button>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={() => navigate('/game')}
            >
              ENTER ROOM
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={styles.root}>
        <h1 style={{ ...styles.title, backgroundImage: `url("${brickUrl}")` }}>
          TANKR
        </h1>
        <div style={styles.form}>
          <button style={styles.button} onClick={handleAutoJoin} disabled={loading}>
            {loading ? 'JOINING…' : 'AUTO-JOIN'}
          </button>
          <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={handleBrowse} disabled={loading}>
            BROWSE ROOMS
          </button>
          <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={handleCreatePrivate} disabled={loading}>
            CREATE PRIVATE ROOM
          </button>
          {error && <p style={styles.error}>! {error}</p>}
          <button style={styles.backLink} onClick={() => setStep('name')}>← BACK</button>
        </div>
      </div>
    )
  }

  // step === 'browse'
  return (
    <div style={styles.root}>
      <h2 style={styles.sectionTitle}>CHOOSE A ROOM</h2>
      <div style={{ ...styles.form, width: 480 }}>
        {rooms.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', fontFamily: PIXEL_FONT }}>
            No rooms yet — be the first!
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={{ color: '#aaa', fontSize: 11, letterSpacing: 2 }}>
                <th style={styles.th}>ROOM</th>
                <th style={styles.th}>PLAYERS</th>
                <th style={styles.th}>STATUS</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td style={styles.td}>{r.id.toUpperCase()}</td>
                  <td style={styles.td}>{r.playerCount} / 40</td>
                  <td style={styles.td}>{r.phase.toUpperCase()}</td>
                  <td style={styles.td}>
                    <button style={styles.joinBtn} onClick={() => handlePickRoom(r.id)}>
                      JOIN
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={handleBrowse} disabled={loading}>
          {loading ? 'REFRESHING…' : 'REFRESH'}
        </button>
        {error && <p style={styles.error}>! {error}</p>}
        <button style={styles.backLink} onClick={() => setStep('mode')}>← BACK</button>
      </div>
    </div>
  )
}

const PIXEL_FONT = "'Geist Pixel Square', ui-monospace, monospace"
const ACCENT = '#ffffff'

const styles = {
  root: {
    background: '#000', height: '100%', display: 'flex',
    flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'center', gap: 36, fontFamily: PIXEL_FONT,
  },
  title: {
    fontFamily: PIXEL_FONT, fontWeight: 700,
    fontSize: 'clamp(48px, 10vw, 128px)', letterSpacing: '0.04em', margin: 0,
    backgroundSize: '0.32em 0.16em', backgroundRepeat: 'repeat',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
  },
  sectionTitle: {
    color: ACCENT, fontFamily: PIXEL_FONT, fontSize: 28, letterSpacing: 4, margin: 0,
  },
  form: {
    display: 'flex', flexDirection: 'column' as const, gap: 14,
    width: 320, alignItems: 'stretch',
  },
  input: {
    padding: '14px 16px', fontSize: 22, background: '#000',
    border: `3px solid ${ACCENT}`, color: ACCENT, outline: 'none',
    fontFamily: PIXEL_FONT, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
  button: {
    padding: '14px 0', fontSize: 20, background: ACCENT,
    border: `3px solid ${ACCENT}`, color: '#000', cursor: 'pointer',
    fontFamily: PIXEL_FONT, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
  },
  buttonSecondary: {
    background: '#000', color: ACCENT,
  },
  backLink: {
    background: 'none', border: 'none', color: '#555', cursor: 'pointer',
    fontFamily: PIXEL_FONT, fontSize: 13, letterSpacing: '0.1em',
    textAlign: 'center' as const, marginTop: 4,
  },
  error: {
    color: '#ff3b3b', margin: 0, fontSize: 13,
    letterSpacing: '0.06em', textAlign: 'center' as const,
  },
  inviteHint: { color: '#f5c518', fontSize: 13, letterSpacing: '0.06em', textAlign: 'center' as const, margin: 0 },
  inviteLabel: { color: '#aaa', fontSize: 13, letterSpacing: '0.05em', margin: 0 },
  qrWrap: { display: 'flex', justifyContent: 'center', padding: '12px 0' },
  inviteBox: {
    background: '#111', border: '1px solid #444', padding: '10px 12px',
    color: '#f5c518', fontSize: 12, letterSpacing: '0.05em',
    wordBreak: 'break-all' as const, fontFamily: 'ui-monospace, monospace',
  },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    fontFamily: PIXEL_FONT, color: ACCENT,
  },
  th: {
    padding: '6px 8px', textAlign: 'left' as const, fontSize: 11,
    borderBottom: '1px solid #333',
  },
  td: { padding: '8px 8px', fontSize: 13 },
  joinBtn: {
    padding: '4px 12px', fontSize: 12, background: '#f5c518',
    border: 'none', color: '#000', cursor: 'pointer',
    fontFamily: PIXEL_FONT, fontWeight: 700, letterSpacing: '0.1em',
  },
  footer: { color: '#555', fontSize: 12, letterSpacing: '0.2em', fontFamily: PIXEL_FONT },
}
