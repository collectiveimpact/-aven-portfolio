# Fuse5 Hub — Current-State Assessment, Prototype Comparison & Enhancement Roadmap

_As of branch `claude/amazing-shockley-2de65f` @ `a59db4c` (June 2026). 11 migrations · 25 routes · 23 server-action files._

---

## 1. What Fuse5 is today

A **real, operational tenant-communications SaaS** (not a prototype): Next.js 16 + React 19 + Tailwind v4 + Supabase, running on local Supabase with real auth, RLS, 8-role RBAC, and audit logging on every write.

**Strengths**
- All 20 provider sections built and **write-capable** (live CRUD + audit), not mockups.
- **Compose**: manual + templates + AI drafts, send-by-preferred-channel, Save Draft, Draft→Review→Approved→Sent approval.
- **Work Orders + Notice Studio**: per-type fields, AI multi-channel drafts, approval gate, publish fan-out, Yardi CSV import.
- **Inbox**: full 3-panel conversation tool (live reply/resolve).
- **Residents**: CRUD + 4-tab Yardi-style profile slide-out.
- **Admin**: 16-panel super-admin platform console + impersonation + permission matrix + tenant-portal config.
- **Analytics**: 6 tabs incl. best-times heatmap, cost-efficiency, proof-of-delivery, report-builder UI.
- 8-role RBAC, segments w/ live count, Aurora design (dark + light), production prep (DEPLOY.md, env gating, bootstrap script).

**Honest gaps**
1. **No automation** — everything is a manual send or one-off scheduled event. (The big one.)
2. **Segments are rule-only** — no predictive/risk scoring, no natural-language creation.
3. **Analytics is mostly demo data** — report builder is UI-only; funnel/cohort/benchmarks not computing on live data.
4. **A few sections below the newest (v2.0.x) depth** — Displays, Compliance scores, WO maintenance layer, Emergency one-click, Channels metrics, Templates previews, Calendar month-grid.
5. **Impersonation doesn't re-scope data** (banner + audit only).
6. **Not deployed**; AI/email/SMS/billing stubbed until cloud Supabase + provider keys + Stripe.

---

## 2. v8.1 prototype vs. this build

The difference is one of **kind, not features**. `Fuse5_Communication_Hub_v8.1.html` is a single ~1.2 MB static HTML file with hardcoded demo data — a clickable picture. This build is the working product.

| | v8.1 HTML | This build |
|---|---|---|
| What it is | One static `.html`, client JS, fake data | Next.js + Supabase SaaS (25 routes, 23 actions) |
| Data | In-memory, resets on refresh | Real Postgres, 11 migrations, persists |
| Auth / Security | None | Supabase auth + RLS everywhere + 8-role RBAC |
| Multi-tenant | Faked via JS var | Real org isolation via RLS + super-admin cross-org |
| Audit | None | Every write → audit_log |
| Messaging | Inert buttons | Real send path (email/SMS adapters, AI), stub until keys |
| Deploy | Open the file | Production-prepped (runbook, env, bootstrap) |

**This build adds vs v8.1:** real CRUD everywhere; live Compose send + Save Draft; approval workflow; Yardi import; 5 sections v8.1 lacked (Segments, Surveys, Properties, Content, Settings); full super-admin console; 3-panel Inbox; 4-tab resident profile; enriched Analytics + Dashboard.

**Handled differently:** SafeArrival (bundled in v8.1 as `sa-*`) was split into its **own separate product** with its own backend (deliberate). v8.1's `data-upload` became Yardi import inside Work Orders + Integrations.

**Equal on one thing:** lifecycle **automation / journeys** — neither has it. That's the highest-leverage thing to build next.

---

## 3. Benchmark: Klaviyo (what to adopt)

Klaviyo's loop is **segment → automate → measure**. Fuse5 has *segment* and *measure*; the missing middle is *automate*.

- **Flows (automation)** — visual canvas: trigger → time delay → message → conditional/trigger split → A/B, with Smart Sending (frequency cap) and a pre-built flow library. **Fuse5 translation:** a Journey Builder with housing-native templates (Move-in Onboarding, Lease Renewal 60-day, Arrears Escalation, Maintenance Follow-up, Inspection Prep, Re-engagement).
- **Segments** — real-time dynamic, live size preview (Fuse5 has this), predictive (churn/CLV/RFM), **Segments AI** (natural-language). **Adopt:** arrears-risk / low-engagement / non-responder scoring + "describe the audience in plain English."
- **Reporting** — custom Report Builder, real-time monitors/alerts, retroactive attribution, industry benchmarks, funnel + cohort. **Adopt:** make the report builder real; Notice funnel (Sent→Delivered→Acknowledged→Resolved); provider benchmarks (super-admin already holds cross-org data); threshold alerts.
- **UI/UX to steal:** the visual canvas builder; live preview while building; "describe in plain English" AI entry points; real-time monitor cards with alert thresholds; benchmark context inline ("top 10%").

---

## 4. Enhancement roadmap (priority tiers)

**Tier 1 — Strategic leap (close the automate gap):**
1. ★ **Journey / Flow Builder** — visual canvas + housing template library. Reuses channels + approval + segments. Turns Fuse5 from a send-tool into a platform. _Biggest payoff._
2. **Predictive + natural-language segments** — feed the journeys.
3. **Real analytics loop** — report builder generates real reports; Notice funnel + cohort + provider benchmarks.

**Tier 2 — Finish v2.0.x provider-facing parity (cheap, in our control):**
Displays player cards/scheduler · Compliance scored KPIs · WO maintenance layer (+ fix hard-coded `medium` priority) · Notice Studio (duration/char-counter/dispatch) · Emergency one-click incidents · Channels metrics · Calendar month-grid.

**Tier 3 — Go to production (needs accounts):**
Cloud Supabase (ca-central-1) → migrations → bootstrap → deploy; wire Anthropic/Resend/Twilio; Stripe for billing. Scaffolded in `DEPLOY.md`.

**Tier 4 — Deeper platform:**
Impersonation real org re-scoping · SafeArrival operationalization · real Yardi/RentSafeTO API sync (beyond CSV).

---

## 5. Recommendation

Build **Tier 1, starting with the Journey Builder.** It's the differentiator, it compounds (segments feed it, analytics measure it), and every dependency it needs already exists in the build. Parity polish is nice-to-have; production is gated on accounts; the Journey engine is what makes Fuse5 strategically complete.
