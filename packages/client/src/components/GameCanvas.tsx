import { useEffect, useRef, useState } from 'react'
import { renderFrame } from '../game/renderer.ts'
import { playPiw, playBoom, playBash } from '../game/audio.ts'
import { useGameSocket } from '../ws/useGameSocket.ts'
import { useRoomStore } from '../store/roomStore.ts'
import HUD from './HUD.tsx'
import Scoreboard from './Scoreboard.tsx'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerName = useRoomStore((s) => s.playerName)
  const { gameState, localPlayerId, rematch, isHost, roomUrl } = useGameSocket(playerName)
  const [urlCopied, setUrlCopied] = useState(false)

  const gameStateRef = useRef(gameState)
  const localPlayerIdRef = useRef(localPlayerId)
  useEffect(() => { gameStateRef.current = gameState }, [gameState])
  useEffect(() => { localPlayerIdRef.current = localPlayerId }, [localPlayerId])

  // All sound events are detected by diffing successive game states.
  // Works for every client (own actions + remote players), since everyone
  // sees the same authoritative state snapshots.
  const prevSnapshotRef = useRef({
    bullets: new Set<string>(),
    aliveTanks: {} as Record<string, boolean>,
    brickCount: 0,
  })
  const seenFirstStateRef = useRef(false)
  useEffect(() => {
    if (!gameState) return
    const currentBullets = new Set(Object.keys(gameState.bullets))
    const currentAlive: Record<string, boolean> = {}
    for (const [id, t] of Object.entries(gameState.tanks)) currentAlive[id] = t.alive
    let currentBrickCount = 0
    for (const row of gameState.map) for (const t of row) if (t === 'brick') currentBrickCount++

    if (seenFirstStateRef.current) {
      const prev = prevSnapshotRef.current
      // piw — new bullets
      let piws = 0
      for (const id of currentBullets) {
        if (!prev.bullets.has(id) && piws < 4) { playPiw(); piws++ }
      }
      // boom — tanks that went alive → dead
      let booms = 0
      for (const [id, alive] of Object.entries(currentAlive)) {
        if (prev.aliveTanks[id] === true && !alive && booms < 3) { playBoom(); booms++ }
      }
      // bash — brick count dropped
      if (currentBrickCount < prev.brickCount) {
        const diff = Math.min(prev.brickCount - currentBrickCount, 3)
        for (let i = 0; i < diff; i++) playBash()
      }
    }

    prevSnapshotRef.current = { bullets: currentBullets, aliveTanks: currentAlive, brickCount: currentBrickCount }
    seenFirstStateRef.current = true
  }, [gameState])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Single permanent RAF loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let rafId: number
    const loop = () => {
      if (gameStateRef.current) renderFrame(ctx, gameStateRef.current, localPlayerIdRef.current)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const copyUrl = () => {
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
        <Scoreboard state={gameState} localPlayerId={localPlayerId} isHost={isHost} onRematch={rematch} />
      )}

      {gameState?.roundPhase !== 'ended' && (
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
  loadingText: { color: '#f5c518', fontFamily: '"Geist Pixel Square", ui-monospace, monospace', fontSize: 24, letterSpacing: 4 },
  shareBtn: {
    position: 'fixed' as const, bottom: 12, right: 12, padding: '6px 14px',
    background: 'rgba(0,0,0,0.7)', border: '1px solid #555',
    color: '#ccc', fontFamily: '"Geist Pixel Square", ui-monospace, monospace', fontSize: 12, cursor: 'pointer',
  },
}
