# SafeArrival — Architecture

SafeArrival is a **standalone product with its own independent backend**. It shares
the Fuse5 *tech stack and Aurora design system* (the "same build") but **nothing at
the data layer** — its own Supabase project, its own auth, its own orgs/RBAC, its own
audit log, and its own youth-program domain.

## Independence (what is NOT shared with Fuse5)

- **Database:** its own Supabase project / Postgres (`supabase/migrations/0001_init.sql`).
- **Auth:** its own `auth.users` + `profiles`.
- **Tenancy & RBAC:** its own `organizations` + `org_members` + `sa_role` enum
  (org_admin, program_director, coordinator, staff, viewer, parent) — distinct from
  Fuse5's 8-role housing model.
- **Audit:** its own `audit_log`.
- Deploys on its own URL/port (`3001` in dev).

## What IS reused (by copy, not coupling)

- Next.js 16 + React 19 + Tailwind v4 toolchain.
- The Aurora design tokens (`src/app/globals.css`) so it looks like the Fuse5 family.

## Layout

```
safearrival/
├── supabase/
│   ├── migrations/0001_init.sql   # the independent backend: core + domain + RLS
│   └── seed/seed.sql              # demo youth-program data
├── src/
│   ├── app/
│   │   ├── layout.tsx             # root (fonts, dark theme, aurora wash)
│   │   └── (app)/                 # authed shell (sidebar + topbar)
│   │       ├── layout.tsx
│   │       ├── page.tsx           # Dashboard (first live surface)
│   │       └── [section]/page.tsx # Attendance / Check-In / Alerts / Incidents / Parents / Reports (scaffold)
│   ├── components/sidebar.tsx
│   └── lib/
│       ├── env.ts                 # backend on/off
│       ├── supabase/{client,server}.ts
│       ├── types.ts  rbac.ts  data.ts   # data access w/ demo fallback
```

## Data model (own backend)

Core: `organizations`, `profiles`, `org_members` (RBAC), `audit_log`.
Domain: `programs`, `children`, `guardians`, `child_guardians`, `attendance_days`,
`check_events`, `absences`, `incidents`.
**Row-Level Security on every table** — org isolation via `sa_is_member()` /
`sa_has_role()` security-definer helpers.

## Run

```bash
pnpm install
pnpm dev            # http://localhost:3001  (demo mode until env is set)
```

To go live: create SafeArrival's own Supabase project, run the migration + seed,
set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
