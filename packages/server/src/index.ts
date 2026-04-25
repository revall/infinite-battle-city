import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import { RoomInstance } from './RoomInstance'

const PORT = Number(process.env.PORT ?? 3001)
const MAIN_ROOM_ID = 'main'

const rooms = new Map<string, RoomInstance>()
rooms.set(MAIN_ROOM_ID, new RoomInstance(MAIN_ROOM_ID))

const httpServer = createServer((_req, res) => {
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const roomId = url.searchParams.get('room') ?? MAIN_ROOM_ID
  const room = rooms.get(roomId)

  if (!room) {
    ws.close(4004, 'Room not found')
    return
  }

  const connId = randomUUID()
  const conn = {
    id: connId,
    send: (data: string) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data)
    },
    close: () => ws.close(),
  }

  room.onConnect(conn)
  ws.on('message', (data) => room.onMessage(data.toString(), conn))
  ws.on('close', () => room.onClose(conn))
})

httpServer.listen(PORT, () => {
  console.log(`[server] ws://localhost:${PORT}  (room "${MAIN_ROOM_ID}" ready)`)
})
