# Fuse5 Hub — SaaS Build Plan

> From clickable prototype (`fuse5-hub-v2.0.7.html`) to a launch-ready multi-tenant SaaS.
> Stack: **Next.js (App Router) + Supabase (Postgres / Auth / Realtime / RLS)**, hosted in **ca-central-1** to honor the data-residency claim in the UI.

---

## 1. Where we are

`v2.0.7.html` is a 20,110-line single-file prototype. It is a **functional spec, not a product**:

- **0** network calls (no `fetch`/XHR/axios). All data is hardcoded JS arrays.
- Auth is `usersDB.find(id)` + a flag — the password field is never read.
- **217** `showToast()` + **44** `showDemoModal()` calls stand in for every real operation.
- RBAC, impersonation, and audit logging are real **client-side** logic — but client-side security is theatre until the server enforces it.

It is, however, an excellent spec: design system, IA, 8-role model, two verticals (Tenant Comms ↔ SafeArrival), and data shapes are all directly portable.

## 2. Strategy — vertical slice first

Build **one module all the way down to real**, prove the backbone, then clone the pattern.

**Slice 1 = Tenant Communications** (the namesake module). It exercises every hard part:

| Capability | Demo today | Slice target |
|---|---|---|
| Login | `usersDB.find()` + flag | Supabase Auth, email+password, MFA-ready |
| Tenancy | `activeTenantId` in JS | Postgres `tenants` + RLS isolation |
| RBAC (8 roles) | JS `applyRoleBasedUI()` | RLS policies + server checks |
| Send notification | `showToast('Sent!')` | Real email send (Resend), logged |
| Templates / approvals / audit | in-memory arrays | real tables, survive refresh |

When Slice 1 is real, Slices 2–N (SafeArrival, analytics, admin panels) reuse the same auth/tenancy/RBAC/send spine.

## 3. Target architecture

```
Next.js App Router (Vercel or ca-central container)
├── /(auth)        login, MFA  ──────────►  Supabase Auth
├── /(app)         authed shell (sidebar, module switcher, RBAC-gated)
│   ├── server components read data via Supabase server client (RLS-scoped)
│   └── server actions / route handlers for writes
├── design system  Aurora tokens → Tailwind theme + CSS vars (ported 1:1)
└── lib/supabase   browser + server clients, typed from DB schema

Supabase (ca-central-1)
├── Postgres        multi-tenant schema, Row-Level Security on every table
├── Auth            sessions, MFA, SSO (fast-follow)
├── Realtime        replaces the "WebSocket API" claim
└── Edge Functions  outbound send fan-out, Yardi sync (later)

External
├── Resend / SendGrid   email (Slice 1)
├── Twilio              SMS + voice (fast-follow)
└── Yardi Voyager       tenant/unit sync (Phase 3)
```

## 4. Data model (Slice 1 core)

- `tenants` — org (WoodGreen, HNHC, Kiwanis…). Root of isolation.
- `profiles` — extends `auth.users`; `tenant_id`, `global_role` (for Fuse5 staff).
- `tenant_members` — user↔tenant↔role (the 8-role RBAC join).
- `templates` — message templates (was `masterTemplates`).
- `messages` — a send: channel, audience, body, status.
- `message_recipients` — per-recipient delivery + status.
- `approvals` — approval queue (was `approvalQueue`).
- `audit_log` — append-only, 7-year retention (was `auditLog`).

**RLS rule of thumb:** every table carries `tenant_id`; policy = `tenant_id = current user's tenant` (Fuse5 global roles get cross-tenant read via a separate policy). This is the line the demo can't cross and the product must.

## 5. Phased roadmap

- **Phase 0 — Foundation** *(in progress)*: scaffold Next.js, port design tokens, Supabase client, schema migration + RLS. → running app + real login.
- **Phase 1 — Tenant Comms slice**: authed shell, RBAC gating, template CRUD, compose → **real email send** → logged + audited.
- **Phase 2 — SaaS plumbing**: tenant onboarding, billing (Stripe), seat limits, SMS/voice channels, MFA, SSO.
- **Phase 3 — Integrations + 2nd vertical**: Yardi sync, RentSafeTO feed, SafeArrival module on the same spine.
- **Phase 4 — Launch hardening**: tests, monitoring, security review, compliance (PIPEDA, audit retention, residency), CI/CD.

**Effort:** Slice 1 launch-ready ≈ 6–10 weeks of iteration. Full demo parity ≈ 4–6 months. The demo is ~5% of scope but the most valuable 5% — it's the validated blueprint.

## 6. Decisions locked

- Stack: **Next.js + Supabase** (Clinton, 2026-06).
- First slice: **Tenant Communications**.
- Residency: Supabase **ca-central-1**.

## 7. Open items to confirm as we go

- Email provider: **Resend** (recommended — simplest DX) vs SendGrid.
- Hosting: Vercel (fastest) vs self-host container in ca-central-1 (strictest residency). Supabase data stays in ca-central-1 either way.
- Whether to create the cloud Supabase project now (billable) or develop against local Supabase first.
