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
  await db.exec(
    `CREATE TABLE IF NOT EXISTS guestbook (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, homepage TEXT, location TEXT, message TEXT NOT NULL, created_at INTEGER NOT NULL)`,
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

interface GuestbookEntry {
  id: number
  name: string
  homepage: string | null
  location: string | null
  message: string
  created_at: number
}

const LIMITS = { name: 40, homepage: 200, location: 60, message: 800 } as const

function clean(s: unknown, max: number): string {
  if (typeof s !== 'string') return ''
  return s.replace(/\s+$/g, '').slice(0, max).trim()
}

function normalizeHomepage(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

async function listGuestbook(db: D1Database): Promise<GuestbookEntry[]> {
  await ensureSchema(db)
  const { results } = await db
    .prepare(
      `SELECT id, name, homepage, location, message, created_at FROM guestbook ORDER BY id DESC LIMIT 200`,
    )
    .all<GuestbookEntry>()
  return results ?? []
}

async function addGuestbookEntry(
  db: D1Database,
  body: unknown,
): Promise<{ ok: true; entry: GuestbookEntry } | { ok: false; error: string }> {
  await ensureSchema(db)
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body' }
  const b = body as Record<string, unknown>

  const name = clean(b.name, LIMITS.name)
  const message = clean(b.message, LIMITS.message)
  if (!name) return { ok: false, error: 'Name is required' }
  if (!message) return { ok: false, error: 'Message is required' }

  const homepageRaw = clean(b.homepage, LIMITS.homepage)
  const homepage = normalizeHomepage(homepageRaw)
  const location = clean(b.location, LIMITS.location) || null
  const created_at = Date.now()

  const row = await db
    .prepare(
      `INSERT INTO guestbook (name, homepage, location, message, created_at)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id, name, homepage, location, message, created_at`,
    )
    .bind(name, homepage, location, message, created_at)
    .first<GuestbookEntry>()

  if (!row) return { ok: false, error: 'Could not save entry' }
  return { ok: true, entry: row }
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

    if (url.pathname === '/api/guestbook') {
      if (req.method === 'GET') {
        const entries = await listGuestbook(env.DB)
        return Response.json(
          { entries },
          { headers: { 'Cache-Control': 'no-store' } },
        )
      }
      if (req.method === 'POST') {
        let body: unknown = null
        try {
          body = await req.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        const result = await addGuestbookEntry(env.DB, body)
        if (!result.ok) return Response.json({ error: result.error }, { status: 400 })
        return Response.json(
          { entry: result.entry },
          { status: 201, headers: { 'Cache-Control': 'no-store' } },
        )
      }
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, POST' },
      })
    }

    const m = url.pathname.match(WS_ROUTE)
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 })
      }
      const id = env.GAME.idFromName(m[1])
      return env.GAME.get(id).fetch(req)
    }

    // Wrapper SPA routes — rewrite to root so the assets binding serves the
    // wrapper's index.html without redirecting unknown paths to /.
    if (url.pathname === '/guestbook' || url.pathname === '/guestbook/') {
      return env.ASSETS.fetch(new Request(new URL('/', url), req))
    }

    const res = await env.ASSETS.fetch(req)
    if (res.status !== 404) return res

    // SPA fallback: /play/* -> /play/, everything else -> /
    const fallback = url.pathname.startsWith('/play') ? '/play/' : '/'
    return env.ASSETS.fetch(new Request(new URL(fallback, url), req))
  },
} satisfies ExportedHandler<Env>
