# Fuse5 Hub — Build Assessment & Enhancement Map

Status of every section + what needs build-out. Benchmarked against the real
product at demo.fuse5.ca (unified "Work Orders & Notices" with AI draft generation).

Legend: **Live** = reads/writes real Supabase · **Demo** = hardcoded data · depth = how complete vs a real feature.

## 1. The template / notice problem (your flag)

Notice/template creation is split across **5 disconnected surfaces** — same job, 5 places, none wired to each other:

| Surface | What it does today | Gap |
|---|---|---|
| **Templates** | Read-only **library** list (Water Shutoff, Newsletter…) | No create/edit. Can't be *used* anywhere. Dead-end. |
| **Compose** | **Manual** multi-channel authoring + live send | No "load template", no AI generate, no real segment targeting |
| **Emergency** | Live all-channel broadcast (no AI) | Separate code path; no template/AI reuse |
| **AI Agents → Content Composer** | Claude generation **playground** | Not connected to Compose / Work Orders — output goes nowhere |
| **Work Orders** | Maintenance **tracker** (read-only table) | Real Fuse5 generates the *notice* from the WO. Ours doesn't. |

**Real Fuse5 unifies this:** Add Work Order → structured "Notice Content Details" → **Create & Generate Drafts** (AI writes per-channel email/SMS/signage) → Draft → Published. One pipeline.

**Recommended consolidation — ONE notice pipeline:**
`Work Order / Template / Emergency` → (AI-generate **or** manual via Compose) → **draft per channel** → approve → **send** → shows in Calendar + Analytics + Inbox.
Templates become reusable *inputs* to that pipeline; Content Composer/Translation/Compliance agents plug *into* it; Work Orders gain "Generate Drafts".

## 2. Section-by-section status

| Section | Data | Depth | Enhancement needed |
|---|---|---|---|
| Overview | Live | Good | minor — wire alerts to real sources |
| Dashboard | Live | Good | overlaps Overview; differentiate (ops vs portfolio) |
| Analytics | Live | Partial | open/click rates are placeholders → need real engagement tracking |
| **Compose** | Live (write) | Good base | **load-from-template, AI generate, Compliance pre-send check, real segment→recipient resolution** |
| **Templates** | Live (read) | **Thin** | **CRUD + version history + "Use in Compose" + AI draft from template** |
| Inbox | Live | Partial | reply + resolve **actions**; thread view; link to resident |
| **Work Orders** | Live (read) | **Thin** | **Create WO + "Generate Drafts" (notice pipeline) + status workflow** (matches real Fuse5) |
| Residents | Live | Good | add/edit/detail (CRUD), import from Yardi |
| Contacts | Live | Good | CRUD |
| Segments | Live | Partial | **real rule builder + dynamic count** (drives Compose targeting) |
| Surveys | Live (read) | Thin | build → send → collect responses |
| Compliance | Live | Good | RentSafeTO feed + reminders/escalation |
| Calendar | Live (read) | Partial | real calendar grid + create scheduled sends |
| Displays | Live | Good | push content to displays (ties to Content) |
| Emergency | Live (write) | Good | add AI generation + severity-based channel routing |
| Admin | Live | Good | **invite users, edit roles, real Stripe billing** |
| **Channels** | **Demo** | Thin | **persist channel config + provider connect (Twilio/email)** |
| **Content on Demand** | **Demo** | Thin | media library CRUD + assign to displays |
| **Integrations** | **Demo** | Thin | **real connect: Yardi sync, RentSafeTO, Twilio, email provider** |
| **AI Agents** | **Demo** (stub) | Playground | wire into flows; live with `ANTHROPIC_API_KEY` |

## 3. Prioritized build-out

**P0 — make the notice pipeline real (highest value, matches demo.fuse5.ca):**
1. **Work Orders → "Create & Generate Drafts"** — structured notice fields → Content Composer (Claude) → per-channel drafts → save. Connects WO + AI + Compose.
2. **Templates CRUD + "Use in Compose"** — create/edit/version templates; Compose loads one as a starting point. Kills the dead-end.
3. **Wire AI agents into Compose** — Content Composer (generate), Translation (the 7 languages), Compliance Guardian (pre-send CASL/RTA check).

**P1 — real operations:**
4. CRUD on Residents / Work Orders / Contacts (add/edit/detail).
5. **Channels** config persistence + **Integrations** real connect (Yardi + email first).
6. Inbox reply/resolve actions; Segments rule builder + live count.

**P2 — depth:**
7. Real engagement tracking (open/click) → Analytics.
8. Surveys build/send/collect; Calendar real grid; Admin invites + Stripe.

## 4. What's solid (don't touch)
Auth + session gate, multi-tenant schema + RLS, the design system, the live read layer (`queries.ts`), Compose send + Emergency broadcast write paths, audit logging.
