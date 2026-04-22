import { GameRoom } from './game-room.ts'

export { GameRoom }

interface Env {
  ASSETS: Fetcher
  GAME: DurableObjectNamespace
  DB: D1Database
}

// partysocket connects to /parties/<party>/<room> — default party is 'main'
const WS_ROUTE = /^\/parties\/[^/]+\/([^/]+)\/?$/

let schemaReady = false
async function ensureSchema(db: D1Database): Promise<void> {
  if (schemaReady) return
  await db.exec(
    `CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)`,
  )
  schemaReady = true
}

async function bumpVisits(db: D1Database): Promise<number> {
  await ensureSchema(db)
  const row = await db
    .prepare(
      `INSERT INTO counters (name, value) VALUES ('visits', 1)
       ON CONFLICT(name) DO UPDATE SET value = value + 1
       RETURNING value`,
    )
    .first<{ value: number }>()
  return row?.value ?? 0
}

async function readVisits(db: D1Database): Promise<number> {
  await ensureSchema(db)
  const row = await db
    .prepare(`SELECT value FROM counters WHERE name = 'visits'`)
    .first<{ value: number }>()
  return row?.value ?? 0
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (url.pathname === '/api/visits') {
      const count =
        req.method === 'POST' ? await bumpVisits(env.DB) : await readVisits(env.DB)
      return Response.json(
        { count },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

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
