# Deployment — playtnkr.com

## Architecture

```
Browser → nginx (443) → /ws      → Node.js game server (3001)
                      → /rooms   → Node.js game server (3001)
                      → /*       → static files (packages/client/dist/)
```

## Prerequisites

- Ubuntu / Debian VPS with a public IP
- DNS: `playtnkr.com` and `www.playtnkr.com` A records pointing to that IP
- Node.js 20+, pnpm, nginx, certbot installed

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
npm install -g pnpm

# nginx + certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# pm2 (process manager)
npm install -g pm2
```

## 1. Clone and build

```bash
git clone <repo-url> /opt/tankr
cd /opt/tankr
pnpm install

# Build client with production WebSocket URL
VITE_WS_URL=wss://playtnkr.com/ws pnpm --filter @tankr/client build

# Type-check server
pnpm --filter @tankr/server build
```

## 2. Deploy static files

```bash
sudo mkdir -p /var/www/tankr
sudo cp -r packages/client/dist /var/www/tankr/dist
sudo chown -R www-data:www-data /var/www/tankr
```

## 3. SSL certificate

```bash
sudo certbot --nginx -d playtnkr.com -d www.playtnkr.com
```

Certbot auto-renews via a systemd timer. Verify:

```bash
sudo systemctl status certbot.timer
```

## 4. nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/playtnkr.com
sudo ln -s /etc/nginx/sites-available/playtnkr.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Start game server

```bash
cd /opt/tankr
PORT=3001 ALLOWED_ORIGIN=https://playtnkr.com \
  pm2 start "pnpm --filter @tankr/server start" --name tankr-server

pm2 save
pm2 startup   # follow the printed command to enable on boot
```

Verify it's running:

```bash
pm2 status
curl http://localhost:3001/rooms
```

## 6. Smoke test

```
https://playtnkr.com          → game loads
https://www.playtnkr.com      → redirects to apex
http://playtnkr.com           → redirects to https
https://playtnkr.com/rooms    → {"rooms":[...]}
```

Open two browser tabs, join the same room, confirm both players appear.

---

## Redeployment

```bash
cd /opt/tankr
git pull

# Rebuild client
VITE_WS_URL=wss://playtnkr.com/ws pnpm --filter @tankr/client build
sudo cp -r packages/client/dist /var/www/tankr/dist

# Restart server (zero in-progress games are lost — by design)
pm2 restart tankr-server
```

## Rollback

All game state is in-memory — no database migrations. Rolling back is:

```bash
cd /opt/tankr
git checkout <previous-tag>
pnpm install
VITE_WS_URL=wss://playtnkr.com/ws pnpm --filter @tankr/client build
sudo cp -r packages/client/dist /var/www/tankr/dist
pm2 restart tankr-server
```

Clients reconnect automatically within ~5 seconds.

## Environment variables

| Variable | Where | Value |
|---|---|---|
| `VITE_WS_URL` | client build | `wss://playtnkr.com/ws` |
| `PORT` | server | `3001` |
| `ALLOWED_ORIGIN` | server | `https://playtnkr.com` |

## Logs

```bash
pm2 logs tankr-server          # live server logs
pm2 logs tankr-server --lines 200
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Scaling

The server keeps all room state in memory on a single process. To use multiple CPU cores:

```bash
pm2 start "pnpm --filter @tankr/server start" --name tankr-server -i max
```

Requires nginx sticky sessions (add `ip_hash` to the upstream block in `nginx.conf`) so players in the same room always hit the same worker.
