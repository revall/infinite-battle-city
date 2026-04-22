import type { GameState } from '@battle-city/shared'

interface Props {
  state: GameState
  localPlayerId: string
  isHost: boolean
  onRematch: () => void
}

export default function Scoreboard({ state, localPlayerId, isHost, onRematch }: Props) {
  // Connected players only (disconnected players are removed from state.players)
  const ranked = Object.values(state.tanks)
    .filter((t) => state.players[t.id])
    .sort((a, b) => b.score - a.score)

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>ROUND OVER</h2>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>#</th>
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
                  <td style={{ ...styles.td, color: i === 0 ? '#f5c518' : '#aaa' }}>
                    {i === 0 ? '🏆' : `#${i + 1}`}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'left' }}>
                    {name}{isLocal ? ' (you)' : ''}
                  </td>
                  <td style={styles.td}>{t.kills}</td>
                  <td style={{ ...styles.td, fontWeight: 'bold' }}>{t.score}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {isHost ? (
          <button style={styles.rematchBtn} onClick={onRematch}>
            PLAY AGAIN
          </button>
        ) : (
          <p style={styles.waitText}>Waiting for host to restart…</p>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    fontFamily: 'monospace',
  } as React.CSSProperties,
  card: {
    background: '#111',
    border: '2px solid #444',
    padding: '32px 40px',
    minWidth: 360,
    textAlign: 'center',
  } as React.CSSProperties,
  title: { color: '#f5c518', fontSize: 28, margin: '0 0 24px', letterSpacing: 4 },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 24 } as React.CSSProperties,
  headerRow: { color: '#aaa', fontSize: 11, letterSpacing: 2 },
  th: { padding: '4px 8px', textAlign: 'center', borderBottom: '1px solid #333' } as React.CSSProperties,
  td: { padding: '6px 8px', textAlign: 'center', fontSize: 14 } as React.CSSProperties,
  rematchBtn: {
    padding: '10px 32px',
    fontSize: 16,
    background: '#f5c518',
    border: 'none',
    color: '#111',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 2,
  } as React.CSSProperties,
  waitText: { color: '#888', fontSize: 13, margin: 0 },
}
