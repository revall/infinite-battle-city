import { useEffect, useRef, useState, useCallback } from 'react'
import type { GameState, Direction } from '@tankr/shared'
import { createInputHandler } from '../game/inputHandler.ts'
import { useRoomStore } from '../store/roomStore.ts'

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? `ws://${window.location.host}`
const INPUT_HZ = 20
const RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_ATTEMPTS = 5

export type DisconnectReason = 'idle' | 'room-gone'

export function useGameSocket(playerName: string, roomId: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState('')
  const [disconnected, setDisconnected] = useState(false)
  const [disconnectReason, setDisconnectReason] = useState<DisconnectReason>('idle')
  const [forceReconnect, setForceReconnect] = useState(0)
  const socketRef = useRef<WebSocket | null>(null)
  const inputRef = useRef(createInputHandler())
  const nameRef = useRef(playerName)
  useEffect(() => { nameRef.current = playerName }, [playerName])

  const setRoom = useRoomStore((s) => s.setRoom)

  const rematch = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'rematch' }))
  }, [])

  const reconnect = useCallback(() => {
    setDisconnected(false)
    setGameState(null)
    setForceReconnect((c) => c + 1)
  }, [])

  useEffect(() => {
    if (!roomId) return
    setDisconnected(false)

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
        let msg: { type: string; [k: string]: unknown }
        try { msg = JSON.parse(e.data) } catch { return }

        if (msg.type === 'welcome') {
          attempts = 0
          setLocalPlayerId(msg.id as string)
          // Only update the room if the server assigned a different one (auto-join fallback).
          // Preserve the existing type (public/private) when rejoining a known room.
          if (msg.roomId && typeof msg.roomId === 'string' && msg.roomId !== roomId) {
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

      ws.addEventListener('close', (event) => {
        if (inputLoop) { clearInterval(inputLoop); inputLoop = null }

        const disconnect = (reason: DisconnectReason) => {
          setDisconnectReason(reason)
          setDisconnected(true)
        }

        if (event.code === 4001) return disconnect('idle')
        if (event.code === 4004) return disconnect('room-gone')

        if (!destroyed && attempts < MAX_RECONNECT_ATTEMPTS) {
          attempts++
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
        } else if (!destroyed) {
          disconnect('room-gone')
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
  }, [roomId, setRoom, forceReconnect])

  const roomUrl = roomId
    ? `${window.location.origin}${import.meta.env.BASE_URL}?room=${encodeURIComponent(roomId)}`
    : window.location.href

  const press = useCallback((code: string) => inputRef.current.press(code), [])
  const release = useCallback((code: string) => inputRef.current.release(code), [])

  return { gameState, localPlayerId, rematch, reconnect, disconnected, disconnectReason, isHost: true, roomUrl, press, release }
}
