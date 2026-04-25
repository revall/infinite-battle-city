import { createServer, IncomingMessage, ServerResponse } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import { RoomManager } from './RoomManager'

const PORT = Number(process.env.PORT ?? 3001)

const manager = new RoomManager()

function setCors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function httpHandler(req: IncomingMessage, res: ServerResponse) {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (url.pathname === '/rooms' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ rooms: manager.publicRooms() }))
    return
  }

  if (url.pathname === '/rooms/auto' && req.method === 'GET') {
    const room = manager.getOrCreatePublic()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ roomId: room.id }))
    return
  }

  if (url.pathname === '/rooms' && req.method === 'POST') {
    const room = manager.createPrivate()
    res.writeHead(201, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ roomId: room.id }))
    return
  }

  res.writeHead(404)
  res.end()
}

const httpServer = createServer(httpHandler)
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const roomId = url.searchParams.get('room')

  const room = roomId
    ? (manager.get(roomId) ?? null)
    : manager.getOrCreatePublic()

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
  console.log(`[server] http://localhost:${PORT}/rooms  |  ws://localhost:${PORT}`)
})
