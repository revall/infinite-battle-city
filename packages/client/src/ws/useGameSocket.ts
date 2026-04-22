import { useEffect, useRef, useState, useCallback } from 'react'
import PartySocket from 'partysocket'
import type { GameState, Direction } from '@battle-city/shared'
import { createInputHandler } from '../game/inputHandler.ts'

const ROOM = 'main'
const INPUT_HZ = 20

export function useGameSocket(playerName: string) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState('')
  const socketRef = useRef<PartySocket | null>(null)
  const inputRef = useRef(createInputHandler())
  const nameRef = useRef(playerName)
  useEffect(() => { nameRef.current = playerName }, [playerName])

  const rematch = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'rematch' }))
  }, [])

  useEffect(() => {
    const host =
      (import.meta.env.VITE_PARTYKIT_HOST as string | undefined) ??
      window.location.host
    const socket = new PartySocket({ host, room: ROOM })
    socketRef.current = socket

    socket.addEventListener('message', (e: MessageEvent<string>) => {
      const msg = JSON.parse(e.data) as { type: string; [k: string]: unknown }

      if (msg.type === 'welcome') {
        const id = msg.id as string
        setLocalPlayerId(id)
        socket.send(JSON.stringify({ type: 'join', name: nameRef.current }))
      }

      if (msg.type === 'state') {
        setGameState(msg.state as GameState)
      }
    })

    const { getInput, attach, press, release } = inputRef.current
    const detach = attach()

    // Accept touch input from the parent wrapper via postMessage — the mobile
    // overlay lives outside the iframe, so it can't reach `inputRef` directly.
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; code?: string } | null
      if (!d || typeof d !== 'object') return
      if (d.type === 'input-press' && typeof d.code === 'string') press(d.code)
      else if (d.type === 'input-release' && typeof d.code === 'string') release(d.code)
    }
    window.addEventListener('message', onMessage)

    const inputLoop = setInterval(() => {
      const { moveDir, shoot } = getInput()
      socket.send(JSON.stringify({ type: 'input', moveDir: moveDir as Direction | null, shoot }))
    }, 1000 / INPUT_HZ)

    return () => {
      clearInterval(inputLoop)
      detach()
      window.removeEventListener('message', onMessage)
      socket.close()
    }
  }, []) // runs once — nameRef used inside so no dep needed

  return {
    gameState,
    localPlayerId,
    rematch,
    // In the PartyKit model the server is authoritative, so any player can trigger rematch.
    // Surface `isHost: true` so the Scoreboard shows the "PLAY AGAIN" button to everyone.
    isHost: true,
    roomUrl: window.location.href,
  }
}
