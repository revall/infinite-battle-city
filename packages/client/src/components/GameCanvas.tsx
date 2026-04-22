import { useEffect, useRef, useState } from 'react'
import { renderFrame } from '../game/renderer.ts'
import { useGameSync } from '../jazz/useGameSync.ts'
import { useRoomStore } from '../store/roomStore.ts'
import HUD from './HUD.tsx'
import Scoreboard from './Scoreboard.tsx'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerName = useRoomStore((s) => s.playerName)
  const { gameState, localPlayerId, rematch, isHost, roomUrl } = useGameSync(playerName)
  const [urlCopied, setUrlCopied] = useState(false)

  // Refs so the RAF loop always reads the latest values without being recreated
  const gameStateRef = useRef(gameState)
  const localPlayerIdRef = useRef(localPlayerId)
  useEffect(() => { gameStateRef.current = gameState }, [gameState])
  useEffect(() => { localPlayerIdRef.current = localPlayerId }, [localPlayerId])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Single permanent RAF loop — reads from refs so it never needs to restart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let rafId: number
    const loop = () => {
      if (gameStateRef.current) {
        renderFrame(ctx, gameStateRef.current, localPlayerIdRef.current)
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, []) // runs once — state accessed via refs

  const copyUrl = () => {
    if (!roomUrl) return
    navigator.clipboard.writeText(roomUrl).then(() => {
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    })
  }

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {!gameState && (
        <div style={styles.loading}>
          <p style={styles.loadingText}>Connecting…</p>
        </div>
      )}

      {gameState && gameState.roundPhase !== 'ended' && (
        <HUD state={gameState} localPlayerId={localPlayerId} />
      )}

      {gameState && gameState.roundPhase === 'ended' && (
        <Scoreboard
          state={gameState}
          localPlayerId={localPlayerId}
          isHost={isHost}
          onRematch={rematch}
        />
      )}

      {roomUrl && gameState?.roundPhase !== 'ended' && (
        <button style={styles.shareBtn} onClick={copyUrl} title="Copy invite link">
          {urlCopied ? '✓ Copied!' : '🔗 Invite'}
        </button>
      )}
    </>
  )
}

const styles = {
  loading: {
    position: 'fixed' as const, inset: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center', background: '#111',
  },
  loadingText: { color: '#f5c518', fontFamily: 'monospace', fontSize: 24, letterSpacing: 4 },
  shareBtn: {
    position: 'fixed' as const, bottom: 12, right: 12, padding: '6px 14px',
    background: 'rgba(0,0,0,0.7)', border: '1px solid #555',
    color: '#ccc', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer',
  },
}
