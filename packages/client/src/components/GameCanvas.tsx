import { useEffect, useRef, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { renderFrame } from '../game/renderer.ts'
import { playPiw, playBoom, playBash, playStart, playGameOver } from '../game/audio.ts'
import { useGameSocket } from '../ws/useGameSocket.ts'
import { useRoomStore } from '../store/roomStore.ts'
import HUD from './HUD.tsx'
import Scoreboard from './Scoreboard.tsx'
import MobileControls from './MobileControls.tsx'

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerName = useRoomStore((s) => s.playerName)
  const roomId = useRoomStore((s) => s.roomId)
  const { gameState, localPlayerId, rematch, isHost, roomUrl, press, release } = useGameSocket(playerName, roomId)
  const [showInvite, setShowInvite] = useState(false)
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
    roundPhase: '' as string,
  })
  const seenFirstStateRef = useRef(false)
  const startPlayedForRoundRef = useRef(false)
  useEffect(() => {
    if (!gameState) return
    const currentBullets = new Set(Object.keys(gameState.bullets))
    const currentAlive: Record<string, boolean> = {}
    for (const [id, t] of Object.entries(gameState.tanks)) currentAlive[id] = t.alive
    let currentBrickCount = 0
    for (const row of gameState.map) for (const t of row) if (t === 'brick') currentBrickCount++

    // Reset the once-per-round start flag when leaving the playing phase.
    if (gameState.roundPhase !== 'playing') startPlayedForRoundRef.current = false

    // start — local player present in an active round (first join or new round after rematch).
    if (
      !startPlayedForRoundRef.current &&
      gameState.roundPhase === 'playing' &&
      localPlayerId &&
      gameState.tanks[localPlayerId]
    ) {
      playStart()
      startPlayedForRoundRef.current = true
    }

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
        if (prev.aliveTanks[id] === true && !alive) {
          if (booms < 3) { playBoom(); booms++ }
          if (id === localPlayerId) playGameOver()
        }
      }
      // bash — brick count dropped
      if (currentBrickCount < prev.brickCount) {
        const diff = Math.min(prev.brickCount - currentBrickCount, 3)
        for (let i = 0; i < diff; i++) playBash()
      }
    }

    prevSnapshotRef.current = {
      bullets: currentBullets,
      aliveTanks: currentAlive,
      brickCount: currentBrickCount,
      roundPhase: gameState.roundPhase,
    }
    seenFirstStateRef.current = true
  }, [gameState, localPlayerId])

  // Canvas resize — match the canvas element's CSS-rendered size, not the full window,
  // so the flex layout (which reserves space for mobile controls) is respected.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sync = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(canvas)
    return () => ro.disconnect()
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

  const copyUrl = useCallback(() => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    })
  }, [roomUrl])

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <canvas ref={canvasRef} style={{ display: 'block', flex: 1, minHeight: 0, width: '100%' }} />
      {gameState?.roundPhase === 'playing' && <MobileControls press={press} release={release} />}

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
        <button style={styles.shareBtn} onClick={() => setShowInvite((v) => !v)}>
          🔗 Invite
        </button>
      )}

      {showInvite && (
        <div style={styles.inviteOverlay}>
          <QRCodeSVG value={roomUrl} size={140} bgColor="#111" fgColor="#ffffff" />
          <p style={styles.inviteUrl}>{roomUrl}</p>
          <button style={styles.inviteCopy} onClick={copyUrl}>
            {urlCopied ? '✓ Copied!' : 'Copy link'}
          </button>
          <button style={styles.inviteClose} onClick={() => setShowInvite(false)}>✕</button>
        </div>
      )}

    </div>
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
  inviteOverlay: {
    position: 'fixed' as const, bottom: 44, right: 12,
    background: '#111', border: '1px solid #444', padding: 16,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 10,
    boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
  },
  inviteUrl: {
    color: '#888', fontSize: 10, margin: 0, maxWidth: 160,
    wordBreak: 'break-all' as const, textAlign: 'center' as const,
    fontFamily: 'ui-monospace, monospace',
  },
  inviteCopy: {
    padding: '5px 14px', fontSize: 11, background: '#fff', border: 'none',
    color: '#000', cursor: 'pointer',
    fontFamily: '"Geist Pixel Square", ui-monospace, monospace', fontWeight: 700,
  },
  inviteClose: {
    position: 'absolute' as const, top: 6, right: 8,
    background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14,
  },
}
