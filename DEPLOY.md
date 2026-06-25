# Fuse5 Hub — Production Deployment Runbook

Takes the app from local Supabase + dev server to a public, real-backed deploy.
Host-agnostic; pick Vercel or a container at step 2. Nothing here runs against
your accounts automatically — each step says who does it.

> **Status:** account-free prep is committed (this file, `.env.production.example`,
> `scripts/bootstrap-prod.mjs`, demo-affordance gating via `NEXT_PUBLIC_DEMO`).
> The numbered steps below need your accounts/keys.

---

## 1 · Cloud database (Supabase)

1. Create a Supabase project in **`ca-central-1`** (Toronto — data residency).
2. Apply migrations **in order** `0001 → 0013` from `fuse5-hub/supabase/migrations/`.
   Either:
   - **CLI:** `cd fuse5-hub && supabase link --project-ref <ref> && supabase db push`, or
   - **Dashboard:** paste each migration into the SQL editor in numeric order.
   - **Fresh-apply check (do this on the cloud project, not local):**
     `supabase db reset` against the linked project recreates the schema purely
     from the migration folder — the canonical "does a clean deploy work" test.
3. **Auth settings:** set Site URL + redirect URLs to your domain (step 5);
   configure the confirmation-email sender; set password policy.
4. Grab the keys for step 3: Project URL, anon/publishable key, service-role key.

## 2 · Host the app — pick one

**Vercel (simplest for Next.js)**
- Import the repo, set **Root Directory = `fuse5-hub`**.
- Add env vars from `.env.production.example` (step 3).
- Deploy. Vercel auto-builds on push; preview URLs per branch.

**Docker / self-host**
- Standard Next.js 16 standalone build. Minimal Dockerfile:
  ```dockerfile
  FROM node:22-alpine AS build
  WORKDIR /app
  COPY fuse5-hub/package.json fuse5-hub/pnpm-lock.yaml ./
  RUN corepack enable && pnpm install --frozen-lockfile
  COPY fuse5-hub/ ./
  RUN pnpm exec next build
  FROM node:22-alpine
  WORKDIR /app
  COPY --from=build /app ./
  ENV NODE_ENV=production
  EXPOSE 3000
  CMD ["pnpm","start"]
  ```
- Run with the env file from step 3.

## 3 · Environment variables

Copy `fuse5-hub/.env.production.example` into the host's env settings and fill it.
- **Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (server-only), `NEXT_PUBLIC_DEMO=false`.
- **Optional (each flips a stub → live):** `ANTHROPIC_API_KEY` (AI copy),
  `RESEND_API_KEY` (email send), `TWILIO_ACCOUNT_SID`/`_AUTH_TOKEN`/`_FROM` (SMS).
  Launch with as few or as many as you want — missing ones degrade to safe stubs.
- **Compliance auto-sync (optional):** `CRON_SECRET` + `COMPLIANCE_SYNC_ORG_ID` enable
  the scheduled score pull (step 7). RentSafeTO needs no key. See `COMPLIANCE_SYNC.md`.

> **Dev-only note:** `next.config.ts` sets `allowedDevOrigins` so `pnpm dev`
> hydrates when reached via `127.0.0.1`/LAN. It has no effect on production builds.

## 4 · Provider accounts (sign-ups + keys)

| Service | Powers | Notes |
|---|---|---|
| **Anthropic** | AI copy in Compose, Notice Studio, AI Agents | `ANTHROPIC_API_KEY` |
| **Resend** | Real email broadcasts/notices | verify a sending domain (step 5) |
| **Twilio** | SMS broadcasts + emergency voice | needs a sender number |
| **Stripe** | Real billing (Admin → License & Billing) | panel is display-only until wired |

## 5 · Domain + DNS

- Point e.g. `hub.fuse5.ca` at the host (Vercel domain / your DNS).
- Add that URL to Supabase **Auth → redirect URLs**.
- For Resend: add SPF + DKIM records so notice email lands in inboxes.

## 6 · First-run bootstrap (once, on the fresh prod DB)

After migrations, create the first org + first super-admin (prod starts empty):

```bash
cd fuse5-hub
SUPABASE_URL=https://<ref>.supabase.co \
SERVICE_ROLE_KEY=<service-role-key> \
ORG_NAME="Fuse5" ORG_SLUG=fuse5 \
ADMIN_EMAIL=you@fuse5.ca ADMIN_PASSWORD='<strong>' ADMIN_NAME="Your Name" \
node scripts/bootstrap-prod.mjs
```

Then sign in and onboard real housing providers from **Admin → All Providers**.

## 7 · Compliance score auto-sync (optional)

The agent pulls each provider's RentSafeTO score live from City of Toronto Open
Data (no key) and benchmarks providers. To auto-pull daily:
1. Set `CRON_SECRET` (random string) + `COMPLIANCE_SYNC_ORG_ID` (operator org uuid).
2. Schedule it — `fuse5-hub/vercel.json` already declares a Vercel Cron
   (`0 6 * * *`); or use `fuse5-hub/.github/workflows/compliance-sync.yml`; or a
   self-hosted cron `curl`. Full setup in **`COMPLIANCE_SYNC.md`**.
3. Admins can also pull on demand from **Admin → Compliance Settings → Sync**.
Hamilton SAB stays manual until you set `HAMILTON_COMPLIANCE_URL` (no public feed).

---

## Production hardening checklist

- [x] **Demo affordances gated** — login no longer prefills creds / shows the
      demo hint when `NEXT_PUBLIC_DEMO=false` (auto-off when `NODE_ENV=production`).
- [x] **Demo-data fallbacks gated** — `src/lib/queries.ts` getters now gate their
      canned-demo-row fallbacks behind the `DEMO_FALLBACK` flag (follows `IS_DEMO`,
      off in production). A real empty org renders true empty states, not fake rows.
      Set `DEMO_FALLBACK=false` (and `NEXT_PUBLIC_DEMO=false`) in prod env to be explicit.
- [ ] **RLS advisors** — run Supabase's Security + Performance advisors on the
      cloud project; resolve anything flagged on the public tables.
- [ ] **Super-admin scope** — confirm only intended Fuse5 staff hold `super_admin`
      (it unlocks the cross-org platform console + impersonation).
- [ ] **Secrets** — `SUPABASE_SERVICE_ROLE_KEY` and provider keys live only in
      host env, never in the repo. `.env*.local` stays gitignored.
- [ ] **Backups** — enable Supabase point-in-time recovery on the paid tier.
- [ ] **Error monitoring** — add Sentry (or host-native logs) before real traffic.

## What's live vs. stubbed at launch

Everything in the app works against the real DB (auth, RLS, all CRUD, the
platform console, impersonation, audit). The only things that *send/charge*
externally are gated on the optional keys: AI copy (Anthropic), email (Resend),
SMS (Twilio), billing (Stripe). No key → safe stub, no errors.
