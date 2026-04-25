import { useEffect, useRef, useState, useCallback } from 'react'
import type { GameState, Direction } from '@battle-city/shared'
import { createInputHandler } from '../game/inputHandler.ts'

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? `ws://${window.location.host}`
const INPUT_HZ = 20
const RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_ATTEMPTS = 5

export function useGameSocket(playerName: string, roomId = 'main') {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const inputRef = useRef(createInputHandler())
  const nameRef = useRef(playerName)
  const roomIdRef = useRef(roomId)
  useEffect(() => { nameRef.current = playerName }, [playerName])
  useEffect(() => { roomIdRef.current = roomId }, [roomId])

  const rematch = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'rematch' }))
  }, [])

  useEffect(() => {
    let attempts = 0
    let inputLoop: ReturnType<typeof setInterval> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let destroyed = false

    const { getInput, attach, press, release } = inputRef.current
    const detach = attach()

    const onPostMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; code?: string } | null
      if (!d || typeof d !== 'object') return
      if (d.type === 'input-press' && typeof d.code === 'string') press(d.code)
      else if (d.type === 'input-release' && typeof d.code === 'string') release(d.code)
    }
    window.addEventListener('message', onPostMessage)

    function connect() {
      if (destroyed) return
      const url = `${WS_URL}?room=${encodeURIComponent(roomIdRef.current)}`
      const ws = new WebSocket(url)
      socketRef.current = ws

      ws.addEventListener('message', (e: MessageEvent<string>) => {
        const msg = JSON.parse(e.data) as { type: string; [k: string]: unknown }

        if (msg.type === 'welcome') {
          attempts = 0
          const id = msg.id as string
          setLocalPlayerId(id)
          ws.send(JSON.stringify({ type: 'join', name: nameRef.current }))
        }

        if (msg.type === 'state') {
          setGameState(msg.state as GameState)
        }
      })

      ws.addEventListener('open', () => {
        if (inputLoop) return
        inputLoop = setInterval(() => {
          const { moveDir, shoot } = getInput()
          ws.send(JSON.stringify({ type: 'input', moveDir: moveDir as Direction | null, shoot }))
        }, 1000 / INPUT_HZ)
      })

      ws.addEventListener('close', () => {
        if (inputLoop) { clearInterval(inputLoop); inputLoop = null }
        if (!destroyed && attempts < MAX_RECONNECT_ATTEMPTS) {
          attempts++
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      })
    }

    connect()

    return () => {
      destroyed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (inputLoop) clearInterval(inputLoop)
      detach()
      window.removeEventListener('message', onPostMessage)
      socketRef.current?.close()
    }
  }, []) // roomIdRef + nameRef used inside, no dep needed

  return {
    gameState,
    localPlayerId,
    rematch,
    isHost: true,
    roomUrl: window.location.href,
  }
}
