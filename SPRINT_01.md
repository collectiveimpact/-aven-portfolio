# Sprint Plan: Fuse5 Hub — Sprint 01 (Full breadth build)

**Mode:** AI-driven build (1 orchestrator + parallel build agents). Capacity is in
agent work-packages, not human-days.
**Sprint Goal:** *Stand up the entire Fuse5 Hub app — all 20 sections navigable on the
real Supabase schema, building green in demo mode, with Compose→send as the deepest
slice — running on **local Supabase**, demoable to **WoodGreen**.*

## Decisions locked (this sprint)
- **Dev backend:** local Supabase (`supabase start` + run `0001_init.sql` + seed). No cloud/billable project.
- **Design partner:** WoodGreen (seed + demo data modelled on their portfolio).
- **Email provider:** user-supplied. Send path is abstracted behind one env key + a thin adapter, so any Resend-compatible provider drops in. Not a blocker for the slice.

## Capacity
| Worker | Allocation | Notes |
|--------|-----------|-------|
| Orchestrator (me) | foundation + integration + build-green + local Supabase wiring | foundation ✅ done |
| Agent A — Comms core | compose (deep), templates, inbox, channels | disjoint folders |
| Agent B — Audience + Intel | tenants, contacts, segments, surveys, analytics, compliance | disjoint folders |
| Agent C — Ops + Engagement | workorders, displays, content, calendar, emergency, dashboard | disjoint folders |
| Agent D — Platform | admin, integrations, ai-agents (+ Claude api route) | disjoint folders |

**Collision control:** each agent writes ONLY inside its own `src/app/(app)/<route>/` folders against the shared, frozen contract (`CONVENTIONS.md`, `lib/*`, `globals.css`). No shared-file writes → no merge conflicts.

## Sprint Backlog
| Priority | Item | Owner | Dependencies |
|---|---|---|---|
| ✅ P0 | Foundation: schema+RLS, design system, lib, shell, Overview, login (green) | Orchestrator | — |
| P0 | All 19 remaining sections built to prototype depth (demo data) | Agents A–D | foundation |
| P0 | Integration pass: `pnpm build` green, fix types, nav resolves | Orchestrator | A–D |
| P0 | Compose vertical slice deepest: composer UI + server action + send adapter | Agent A | foundation |
| P1 | Local Supabase live: `supabase start`, migrate + seed WoodGreen, `.env.local`, flip to live data | Orchestrator | green build |
| P1 | Supabase Auth real login + 8-role RBAC enforced via RLS | Orchestrator | local supabase |
| P1 | Compose → real email through user's provider (key dropped into adapter) | Orchestrator | provider key |
| P2 (stretch) | AI agents live via ANTHROPIC_API_KEY; analytics charts polish; QA pass | Orchestrator | core done |

## Phase coverage (all 6, breadth-first)
P1 Comms (Agent A) · P2 Channels/Audience/Analytics (A+B) · P3 Engagement/Ops (C) ·
P4 Integrations + AI (D) · P5 Admin/billing scaffolding (D) · P6 hardening = the
integration pass + local-Supabase + auth (Orchestrator P1 items).

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Parallel agents collide on files | broken build | disjoint folder ownership; shared files frozen |
| Agent code fails Next 16 type-check | red build | CONVENTIONS.md encodes Next 16 rules; orchestrator integration pass fixes |
| "Live" needs creds I don't have | slice not truly sending | demo-first everywhere; provider/Supabase keys drop into adapters at P1 |
| Local Supabase not installed | can't go live locally | orchestrator checks `supabase` CLI; falls back to migration-ready + instructions |

## Definition of Done
- [ ] `pnpm build` green (compile + TypeScript) across the whole app
- [ ] All 20 sidebar routes resolve and render real, on-brand pages
- [ ] Compose composes + (demo) sends with validation + confirmation
- [ ] Runs on local Supabase when `.env.local` is set; demo mode otherwise
- [ ] Committed in logical commits

## Milestones (not calendar — build checkpoints)
1. Agents A–D return their sections → **breadth complete**
2. Integration build green → **demoable app**
3. Local Supabase + seed + auth → **live on your machine**
4. Compose real send via your provider → **vertical slice done**
