# tankr

Multiplayer tank game. Real-time WebSocket battles, up to 40 players per room.

## Stack

- **Client** — React + Vite + Canvas (`packages/client`)
- **Server** — Node.js + `ws` WebSocket server (`packages/server`)
- **Shared** — Game logic, types, map generation (`packages/shared`)

## Run locally

```bash
pnpm install

# Terminal 1 — game server (default port 3001)
pnpm server

# Terminal 2 — client dev server
pnpm dev
```

Open http://localhost:5173

## Environment variables

**Client** (`packages/client/.env.local`):

| Variable | Default | Description |
|---|---|---|
| `VITE_WS_URL` | `ws://<host>` | WebSocket server URL |

**Server**:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP + WebSocket port |

## Run on LAN / other devices

```bash
VITE_WS_URL=ws://192.168.1.x:3001 pnpm --filter @tankr/client exec vite --host
```

## Production build

```bash
pnpm build
# Output: packages/client/dist/
```

Serve `packages/client/dist/` as static files behind any HTTP server. Point `VITE_WS_URL` at your deployed server instance.

## Rooms

- **Auto-join** — server assigns the least-full public room
- **Browse** — pick from the public room list
- **Private** — creates a room and generates an invite link + QR code

## Rollback

The server is stateless between restarts (all game state is in-memory). Rolling back is:
1. Stop server process
2. Deploy previous binary / `git checkout <tag> && pnpm server`
3. Clients reconnect automatically (up to 5 retries)

In-progress games are lost on restart — by design, no persistence.
