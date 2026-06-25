# Fuse5 Hub — InMotion VPS / Dedicated Deployment

For an InMotion **VPS or Dedicated** server (root/SSH). The app is a Next.js 16
server app, so it runs as a long-lived Node process behind a reverse proxy — not
as static files. Backend is your cloud **Supabase** project.

> **The one gotcha that bites everyone:** Next 16 server actions (login, Compose
> send, the compliance Sync, every form) reject requests whose `Origin` doesn't
> match the forwarded host. Your reverse proxy MUST send `Host` + `X-Forwarded-*`
> (configs below do). Get this wrong and pages load but nothing submits (403).

---

## 1 · Supabase (cloud)

1. Create a Supabase project in **`ca-central-1`** (Toronto).
2. Apply migrations **`0001 → 0013`** from `fuse5-hub/supabase/migrations/` —
   either `supabase link --project-ref <ref> && supabase db push`, or paste each
   file into the SQL editor in order.
3. **Auth → URL config:** Site URL = `https://hub.fuse5.ca`; add it to redirect URLs.
4. Copy three keys for the env file: Project URL, anon key, service-role key.

## 2 · Get the code on the server

```bash
ssh you@your-vps
sudo mkdir -p /opt/fuse5 && sudo chown $USER /opt/fuse5
cd /opt/fuse5
# pull the repo (or rsync your local checkout's fuse5-hub/ here)
git clone <your-fuse5-repo> .       # or: rsync -az ./fuse5-hub/ you@vps:/opt/fuse5/fuse5-hub/
```

Node 22 + pnpm (via cPanel Node selector, nvm, or system):
```bash
node -v   # need 22.x; install via nvm if missing:  nvm install 22 && nvm use 22
corepack enable && corepack prepare pnpm@latest --activate
```

## 3 · Configure env

Create `/opt/fuse5/fuse5-hub/.env.production` from `.env.production.example`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service-role key>
NEXT_PUBLIC_DEMO=false
DEMO_FALLBACK=false
# optional providers — add when ready, each flips a stub → live
ANTHROPIC_API_KEY=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
# compliance auto-sync (RentSafeTO needs no key)
CRON_SECRET=<long random string>
COMPLIANCE_SYNC_ORG_ID=<operator org uuid from step 6>
```
Next.js loads `.env.production` automatically under `NODE_ENV=production`.

## 4 · Build + run with PM2

```bash
cd /opt/fuse5/fuse5-hub
pnpm install --frozen-lockfile
pnpm build
npm i -g pm2
pm2 start pnpm --name fuse5-hub -- start    # runs `next start` on port 3000
pm2 save && pm2 startup                      # restart on reboot (run the printed sudo line)
```
App is now live on `127.0.0.1:3000` (not public yet — that's the proxy's job).
Override the port with `PORT=3001` in the env if 3000 is taken.

## 5 · Reverse proxy + SSL

Point `hub.fuse5.ca` DNS at the server first. Then expose the Node app.

### If your VPS runs cPanel/WHM (Apache / EA4)
Add a vhost include (WHM → *Apache Configuration → Include Editor*, or
`/etc/apache2/conf.d/userdata/...`) — **don't** edit the live `.htaccess`:
```apache
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
ProxyPass        / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
```
`ProxyPreserveHost On` is the critical line — it forwards the real `Host` so
server actions work. Then run **AutoSSL** (WHM) for the cert.

### If you run nginx (Engintron / standalone)
```nginx
server {
  listen 443 ssl;
  server_name hub.fuse5.ca;
  # ssl_certificate ... (AutoSSL/certbot)

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;                 # <- server actions need this
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;  # <- and this
    proxy_set_header Upgrade $http_upgrade;       # websockets/streaming
    proxy_set_header Connection "upgrade";
    proxy_cache_bypass $http_upgrade;
    proxy_no_cache 1;                             # never cache the app HTML
  }
}
```
> Memory lesson from past InMotion deploys: nginx can cache `/` and serve stale
> HTML after a redeploy. Keep `proxy_no_cache`/`no-store` on the app and purge
> the cache after deploys; verify the plain URL in a fresh browser, not a
> cache-busted curl.

SSL with certbot instead of AutoSSL:
```bash
sudo certbot --nginx -d hub.fuse5.ca   # or --apache
```

## 6 · First-run bootstrap (once)

```bash
cd /opt/fuse5/fuse5-hub
SUPABASE_URL=https://<ref>.supabase.co SERVICE_ROLE_KEY=<service-role-key> \
ORG_NAME="Fuse5" ORG_SLUG=fuse5 \
ADMIN_EMAIL=you@fuse5.ca ADMIN_PASSWORD='<strong>' ADMIN_NAME="Your Name" \
node scripts/bootstrap-prod.mjs
```
The org uuid it prints → put in `COMPLIANCE_SYNC_ORG_ID` (step 3), then `pm2 restart fuse5-hub`.

## 7 · Compliance cron (cPanel cron or crontab)

Daily RentSafeTO pull. cPanel → *Cron Jobs*, or `crontab -e`:
```cron
0 6 * * *  curl -fsS -X POST https://hub.fuse5.ca/api/agents/compliance-sync -H "Authorization: Bearer <CRON_SECRET>" >/dev/null 2>&1
```
(`vercel.json` and the GitHub Action in the repo are for other hosts — ignore them here.)

## 8 · Deploy an update

```bash
cd /opt/fuse5/fuse5-hub
git pull                 # or rsync new code
pnpm install --frozen-lockfile
pnpm build
pm2 restart fuse5-hub
# purge nginx/Apache cache if enabled; verify https://hub.fuse5.ca in a fresh browser
```

---

## Pre-launch checks
- [ ] `https://hub.fuse5.ca` loads and **login submits** (proves proxy headers are right).
- [ ] Compose "Save Draft" persists (proves server actions + DB write end to end).
- [ ] Supabase Auth redirect URL = your domain.
- [ ] `NEXT_PUBLIC_DEMO=false` + `DEMO_FALLBACK=false` (no demo creds / fake rows).
- [ ] Run Supabase Security + Performance advisors; resolve public-table flags.
- [ ] Only intended Fuse5 staff hold `super_admin`.
- [ ] PM2 `pm2 startup` configured so the app survives a reboot.
- [ ] Compliance cron returns `{"ok":true}` when run manually.
