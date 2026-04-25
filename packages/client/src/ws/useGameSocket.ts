import { useEffect, useRef, useState, useCallback } from 'react'
import type { GameState, Direction } from '@battle-city/shared'
import { createInputHandler } from '../game/inputHandler.ts'
import { useRoomStore } from '../store/roomStore.ts'

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? `ws://${window.location.host}`
const INPUT_HZ = 20
const RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_ATTEMPTS = 5

export function useGameSocket(playerName: string, roomId: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const inputRef = useRef(createInputHandler())
  const nameRef = useRef(playerName)
  useEffect(() => { nameRef.current = playerName }, [playerName])

  const setRoom = useRoomStore((s) => s.setRoom)

  const rematch = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'rematch' }))
  }, [])

  useEffect(() => {
    if (!roomId) return // wait until a room is chosen

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
      const url = `${WS_URL}?room=${encodeURIComponent(roomId!)}`
      const ws = new WebSocket(url)
      socketRef.current = ws

      ws.addEventListener('message', (e: MessageEvent<string>) => {
        const msg = JSON.parse(e.data) as { type: string; [k: string]: unknown }

        if (msg.type === 'welcome') {
          attempts = 0
          setLocalPlayerId(msg.id as string)
          // If server assigned us a room (e.g. auto-join fallback), persist it
          if (msg.roomId && typeof msg.roomId === 'string') {
            setRoom(msg.roomId, 'public')
          }
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
  }, [roomId, setRoom]) // reconnect when roomId changes

  const roomUrl = roomId
    ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomId)}`
    : window.location.href

  return { gameState, localPlayerId, rematch, isHost: true, roomUrl }
}
