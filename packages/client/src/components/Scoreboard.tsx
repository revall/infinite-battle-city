import { useEffect, useRef, useState } from 'react'
import type { GameState } from '@tankr/shared'

const COUNTDOWN_SEC = 30

interface Props {
  state: GameState
  localPlayerId: string
  onRematch: () => void
}

export default function Scoreboard({ state, localPlayerId, onRematch }: Props) {
  const ranked = Object.values(state.tanks)
    .filter((t) => state.players[t.id])
    .sort((a, b) => b.score - a.score)

  const winner = ranked[0]
  const winnerName = winner ? (state.players[winner.id]?.name ?? winner.id.slice(0, 8)) : null
  const isWinner = winner?.id === localPlayerId

  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SEC)
  const narrow = useNarrowScreen()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    if (timeLeft <= 0) {
      firedRef.current = true
      onRematch()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, onRematch])

  return (
    <div style={{ ...styles.overlay, padding: narrow ? 0 : 16 }}>
      <div style={{ ...styles.screen, flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'stretch' : 'flex-start', maxWidth: narrow ? '100%' : 720 }}>

        {/* Leaderboard */}
        <div style={{ ...styles.left, padding: narrow ? '16px 8px' : '24px 16px' }}>
          <div style={styles.winnerBanner}>
            {isWinner ? '👑 YOU WIN!' : winnerName ? `👑 ${winnerName} WINS` : 'ROUND OVER'}
          </div>

          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={{ ...styles.th, width: 36 }}>#</th>
                <th style={{ ...styles.th, textAlign: 'left' }}>PLAYER</th>
                <th style={styles.th}>KILLS</th>
                <th style={styles.th}>SCORE</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((t, i) => {
                const name = state.players[t.id]?.name ?? t.id.slice(0, 8)
                const isLocal = t.id === localPlayerId
                return (
                  <tr key={t.id} style={{ color: isLocal ? '#f5c518' : '#ccc' }}>
                    <td style={{ ...styles.td, color: rankColor(i), fontWeight: i < 3 ? 'bold' : 'normal' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'left', maxWidth: narrow ? 120 : 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}{isLocal ? ' ◀' : ''}
                    </td>
                    <td style={styles.td}>{t.kills}</td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{t.score}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <button style={styles.rematchBtn} onClick={onRematch}>
            ▶ PLAY AGAIN ({timeLeft}s)
          </button>
        </div>

        {/* AD SLOT — replace children with your ad component */}
        <div style={{ ...styles.adSlot, width: narrow ? '100%' : 160, minHeight: narrow ? 80 : 320 }}>
          <span style={{ ...styles.adLabel, writingMode: narrow ? 'horizontal-tb' : 'vertical-rl' }}>
            ADVERTISEMENT
          </span>
        </div>

      </div>
    </div>
  )
}

function useNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 540)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 539px)')
    setNarrow(mq.matches)
    const h = (e: MediaQueryListEvent) => setNarrow(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return narrow
}

function rankColor(i: number): string {
  if (i === 0) return '#f5c518'
  if (i === 1) return '#aaa'
  if (i === 2) return '#cd7f32'
  return '#555'
}

const PIXEL_FONT = '"Geist Pixel Square", ui-monospace, monospace'

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    fontFamily: PIXEL_FONT,
    padding: 16,
    overflowY: 'auto',
  },
  screen: {
    display: 'flex',
    gap: 16,
    maxWidth: 720,
    width: '100%',
    alignItems: 'flex-start',
  },
  left: {
    flex: '1 1 0',
    background: '#111',
    border: '2px solid #333',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  },
  winnerBanner: {
    color: '#f5c518',
    fontSize: 'clamp(16px, 4vw, 26px)',
    letterSpacing: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    color: '#555',
    fontSize: 11,
    letterSpacing: 2,
  },
  th: {
    padding: '4px 6px',
    textAlign: 'center',
    borderBottom: '1px solid #2a2a2a',
    fontWeight: 'normal',
  },
  td: {
    padding: '7px 6px',
    textAlign: 'center',
    fontSize: 13,
    borderBottom: '1px solid #1a1a1a',
  },
  rematchBtn: {
    padding: '12px 0',
    fontSize: 15,
    background: '#f5c518',
    border: 'none',
    color: '#000',
    cursor: 'pointer',
    fontFamily: PIXEL_FONT,
    fontWeight: 'bold',
    letterSpacing: 2,
    width: '100%',
  },
  adSlot: {
    flexShrink: 0,
    background: '#1a1a1a',
    border: '1px dashed #555',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adLabel: {
    color: '#555',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
}
