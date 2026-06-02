# Fuse5 Hub — SaaS Build Plan

> From clickable prototype (`fuse5-hub-v2.0.8.html`) to a launch-ready multi-tenant SaaS.
> **Scope:** the Tenant Communications platform for housing providers. SafeArrival is now
> a **separate product** with its own backend (`/safearrival`) and is OUT of scope here.
> **Stack:** Next.js 16 (App Router) + Supabase (Postgres / Auth / Realtime / RLS),
> hosted in **ca-central-1** to honor the data-residency claim in the UI.
> **Code:** `fuse5-hub/` (scaffolded).

---

## 1. Where we are

`v2.0.8.html` is a ~20K-line single-file prototype — an excellent **functional spec, not a product**:

- **0** network calls; all data is hardcoded JS arrays. No backend, no DB, no real auth.
- 8-role RBAC, impersonation, and audit are real **client-side** logic — but client-side security is theatre until the server enforces it.
- The design system, IA, role model, and data shapes are all directly portable.

`fuse5-hub/` is a Next 16 + React 19 + Tailwind v4 scaffold (empty). Phase 0 below turns it real.

## 2. Strategy — vertical slice first

Build **one module all the way down to real**, prove the backbone, then clone the pattern across the other 19 sections. The demo de-risks the frontend; the slice de-risks the backend.

**Slice 1 = Compose → real broadcast send.** It exercises every hard part: auth, multi-tenant isolation, server-enforced RBAC, a real outbound channel, templates, approval routing, and audit.

## 3. Naming (resolve the overloaded "tenant")

- **Provider / Organization** = the SaaS customer (WoodGreen, HNHC, Kiwanis). Root of tenancy + RLS.
- **Resident** = a person living in a unit (the message audience). NOT a SaaS "tenant."
- **Member / User** = a staff login at a provider, with a role.

## 4. Target architecture

```
Next.js 16 App Router (Vercel or ca-central container)
├── (auth)        login, MFA  ─────────►  Supabase Auth
├── (app)         authed shell (sidebar, RBAC-gated) — server components read via RLS-scoped client
│   └── route handlers / server actions for writes
├── design system Aurora tokens → Tailwind theme (ported from v2.0.8)
└── lib/supabase  browser + server clients, typed from schema

Supabase (ca-central-1): Postgres + RLS · Auth (MFA/SSO) · Realtime (the "WebSocket API") · Edge Functions (send fan-out, Yardi sync)
External: Resend/SendGrid (email) · Twilio (SMS + voice + WhatsApp) · Yardi Voyager (resident/unit sync) · RentSafeTO (compliance + map) · Stripe (billing) · Anthropic (AI agents)
```

## 5. Data model (core)

- `organizations` (providers) — tenancy root
- `properties` → `units` → `residents` (audience hierarchy)
- `profiles` (extends auth.users) · `org_members` (8-role RBAC) · impersonation log
- `messages` · `message_recipients` (per-recipient delivery status) · `templates` · `channels`
- `segments` (saved audience filters) · `contacts`
- `work_orders` · `displays` · `display_content` · `surveys` · `survey_responses`
- `compliance_items` · `audits` (RentSafeTO) · `calendar_events`
- `integrations` (Yardi connection/state) · `webhooks` · `agent_runs` (AI)
- `audit_log` (append-only, 7-yr retention)

**RLS rule:** every table carries `org_id`; policy = `org_id = caller's org`. Fuse5 global staff get cross-org read via a separate policy. This is the line the demo can't cross and the product must.

## 6. Feature surface → phase mapping (the 20 prototype sections)

| Phase | Sections made real |
|---|---|
| **0 Foundation** | scaffold, design system, schema core, **auth**, RLS |
| **1 Comms slice** | **Compose** (email send), **Templates**, **approval routing**, audit |
| **2 Channels + ops** | **Inbox**, **Channels** (SMS/WhatsApp/voice), **Tenants**(Residents), **Contacts**, **Segments**, **Analytics** |
| **3 Engagement** | **Displays**, **Content on Demand**, **Surveys**, **Calendar**, **Emergency** broadcast, **Work Orders** |
| **4 Integrations + AI** | **Integrations** (Yardi sync, RentSafeTO), **Compliance**, **AI Agents** (7 Claude agents) |
| **5 SaaS plumbing** | **Admin** (16 panels: users, roles, billing, settings), onboarding, Stripe, entitlements |
| **6 Launch hardening** | tests, security review, perf, monitoring, PIPEDA/residency, go-live |

(**Roadmap** section is internal/marketing — not a build target.)

## 7. The 7 AI agents (Phase 4, Anthropic API)

Content Composer · Compliance Guardian · Translation · Scheduling Optimizer · Tenant Inquiry · Maintenance Request · Emergency Broadcast. Each becomes a server-side Claude call with prompt caching, logged to `agent_runs`. Reuse the existing `fuse5-agent-0X` skill definitions as the prompt specs.

## 8. Phased roadmap + effort

| Phase | Outcome | Effort (focused) |
|---|---|---|
| 0 Foundation | Running app, real login, multi-tenant schema + RLS | 1–2 wks |
| 1 Comms slice | Compose sends real email; templates + approvals + audit persist | 2–4 wks → **first demoable real product** |
| 2 Channels + ops | SMS/WhatsApp, inbox, residents, segments, analytics | 3–5 wks |
| 3 Engagement | displays, content, surveys, calendar, emergency, work orders | 3–5 wks |
| 4 Integrations + AI | Yardi sync, RentSafeTO/compliance, 7 AI agents | 4–6 wks |
| 5 SaaS plumbing | onboarding, billing, entitlements, admin panels | 3–4 wks |
| 6 Launch hardening | tests, security, perf, compliance, go-live | 2–3 wks |

**Slice 1 launch-ready ≈ 6–10 weeks. Full prototype parity ≈ 4–6 months.** The demo is ~5% of scope but the most valuable 5% — it's the validated blueprint.

## 9. Decisions locked / open

- **Locked:** Next.js + Supabase; ca-central-1; Compose is Slice 1; SafeArrival is a separate product.
- **Open (confirm as we go):** email provider (Resend recommended) · hosting (Vercel vs self-host container) · create cloud Supabase now (billable) vs local-first dev · which provider is the design partner for Slice 1 (WoodGreen vs HNHC).

## 10. Immediate next steps (Phase 0/1)

1. Port Aurora design tokens into `fuse5-hub` (Tailwind theme + globals).
2. Write Supabase migration: `organizations`, `profiles`, `org_members`, `templates`, `messages`, `message_recipients`, `audit_log` — RLS on each.
3. Real login (Supabase Auth) replacing `usersDB.find()`.
4. Compose page → server action → Resend send → `messages`/`message_recipients` rows → `audit_log` entry.
