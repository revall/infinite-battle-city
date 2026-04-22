import { GameRoom } from './game-room.ts'

export { GameRoom }

interface Env {
  ASSETS: Fetcher
  GAME: DurableObjectNamespace
}

// partysocket connects to /parties/<party>/<room> — default party is 'main'
const WS_ROUTE = /^\/parties\/[^/]+\/([^/]+)\/?$/

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    const m = url.pathname.match(WS_ROUTE)
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 })
      }
      const id = env.GAME.idFromName(m[1])
      return env.GAME.get(id).fetch(req)
    }

    const res = await env.ASSETS.fetch(req)
    if (res.status !== 404) return res

    // SPA fallback: /play/* -> /play/index.html, everything else -> /index.html
    const fallback = url.pathname.startsWith('/play')
      ? '/play/index.html'
      : '/index.html'
    return env.ASSETS.fetch(new Request(new URL(fallback, url), req))
  },
} satisfies ExportedHandler<Env>
