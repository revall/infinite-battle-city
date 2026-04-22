import type { GameState } from '@battle-city/shared'
import { ROUND_DURATION_TICKS } from '@battle-city/shared'

interface Props {
  state: GameState
  localPlayerId: string
}

function formatTime(ticks: number): string {
  const totalSec = Math.max(0, Math.ceil(ticks / 60))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function HUD({ state, localPlayerId }: Props) {
  const tank = state.tanks[localPlayerId]
  const ticksLeft = state.roundEndsAt - state.tick
  const respawnIn = tank && !tank.alive
    ? Math.max(0, Math.ceil((tank.respawnTick - state.tick) / 60))
    : null

  // Top-5 scores for the corner leaderboard — connected players only
  const ranked = Object.values(state.tanks)
    .filter((t) => state.players[t.id])
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return (
    <>
      {/* Round timer — top-center */}
      <div style={styles.timer}>{formatTime(ticksLeft)}</div>

      {/* Local player stats — top-left */}
      <div style={styles.statsBox}>
        <div style={styles.statRow}>
          <span style={styles.label}>KILLS</span>
          <span style={styles.value}>{tank?.kills ?? 0}</span>
        </div>
        <div style={styles.statRow}>
          <span style={styles.label}>SCORE</span>
          <span style={styles.value}>{tank?.score ?? 0}</span>
        </div>
      </div>

      {/* Respawn overlay */}
      {respawnIn !== null && (
        <div style={styles.respawnOverlay}>
          <p style={styles.respawnText}>DESTROYED</p>
          <p style={styles.respawnTimer}>{respawnIn}s</p>
        </div>
      )}

      {/* Mini-leaderboard — top-right */}
      <div style={styles.leaderboard}>
        {ranked.map((t, i) => {
          const name = state.players[t.id]?.name ?? t.id.slice(0, 6)
          return (
            <div key={t.id} style={{ ...styles.lbRow, color: t.id === localPlayerId ? '#f5c518' : '#ccc' }}>
              <span>#{i + 1} {name}</span>
              <span>{t.score}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

const base: React.CSSProperties = {
  position: 'fixed',
  fontFamily: 'monospace',
  pointerEvents: 'none',
}

const styles = {
  timer: {
    ...base,
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f5c518',
    textShadow: '0 0 8px #000',
  } as React.CSSProperties,
  statsBox: {
    ...base,
    top: 12,
    left: 12,
    background: 'rgba(0,0,0,0.6)',
    padding: '6px 12px',
    color: '#fff',
    lineHeight: 1.6,
  } as React.CSSProperties,
  statRow: { display: 'flex', gap: 12, justifyContent: 'space-between' } as React.CSSProperties,
  label: { color: '#aaa', fontSize: 12 } as React.CSSProperties,
  value: { color: '#fff', fontSize: 14, fontWeight: 'bold' } as React.CSSProperties,
  respawnOverlay: {
    ...base,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    pointerEvents: 'none',
  } as React.CSSProperties,
  respawnText: { color: '#f55', fontSize: 24, margin: 0, textShadow: '0 0 12px #f55' },
  respawnTimer: { color: '#fff', fontSize: 48, margin: 0, fontWeight: 'bold' },
  leaderboard: {
    ...base,
    top: 12,
    right: 12,
    background: 'rgba(0,0,0,0.6)',
    padding: '6px 10px',
    minWidth: 160,
    color: '#ccc',
    fontSize: 12,
  } as React.CSSProperties,
  lbRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    padding: '1px 0',
  } as React.CSSProperties,
}
