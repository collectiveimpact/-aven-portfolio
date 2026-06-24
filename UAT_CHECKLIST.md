# Fuse5 Hub — UAT Checklist & User Guide

**Product:** Fuse5 Hub — Tenant Communications platform for housing providers
**Build:** Next.js 16 + React 19 + Supabase (Postgres + Auth + RLS) · Aurora design system
**Audience:** UAT testers / first-time users
**How to read this:** Each test is written as **Action → Expected Result**. Tick the box ☐ when the Expected Result matches. If it doesn't, note what you saw in the "Issue" column at the end of each section.

---

## 0. Before you start (one-time setup)

You only need to do this once per machine. If someone has already started the app for you and given you the URL, skip to **Section 1 — Logging in**.

| # | Action | Expected Result |
|---|--------|-----------------|
| 0.1 | Open Docker Desktop and make sure it's running | Docker shows "running" (green) |
| 0.2 | In a terminal: `cd fuse5-hub` then `npx supabase status` | Lists running services with an **API URL** of `http://127.0.0.1:54321`. If it says "not running", run `npx supabase start` first (takes ~1 min the first time). |
| 0.3 | First time only: `pnpm install` | Dependencies install with no fatal errors |
| 0.4 | Confirm `fuse5-hub/.env.local` exists and contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Both keys present. (Values come from the `npx supabase status` output — `API URL` and `anon key`.) |
| 0.5 | Run `pnpm dev` | Terminal prints `✓ Ready` and `Local: http://localhost:3000` |
| 0.6 | Open **http://localhost:3000** in your browser | You are redirected to the **/login** page (you are not logged in yet) |

> **Tip — what works without extra keys:** Everything in this guide works against the local database out of the box. Three features become "live" only when optional provider keys are set in `.env.local`:
> - **AI draft generation** (Compose / Work Order notices) → set `ANTHROPIC_API_KEY`. Without it, the app generates a clean *deterministic draft* instead and labels it `(stub)`.
> - **Real email send** → set `RESEND_API_KEY`. Without it, sends are simulated and logged.
> - **Real SMS send** → set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`. Without them, sends are simulated.
> - **Excel (.xlsx) Yardi import** → run `pnpm add xlsx`. CSV import works without it.
>
> None of these block UAT — the app tells you when it used the stub/simulated path.

---

## 1. Logging in & navigating (start here)

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 1.1 | Go to **http://localhost:3000** | Redirected to the login screen titled "TENANT COMMUNICATIONS HUB" | ☐ |
| 1.2 | Confirm the demo credentials are pre-filled: **clinton@fuse5.ca** / **demo12345** (shown as •••••••••) | Both fields populated; hint line reads "Demo: clinton@fuse5.ca / demo12345" | ☐ |
| 1.3 | Click **Sign In** | You land in the app on the **Overview** page. Top bar shows "WoodGreen Community Housing", "All Properties (31)", a green **LIVE** badge, and your name pill "Clinton Reid · Fuse5 Super Admin" | ☐ |
| 1.4 | Look at the left sidebar | Five groups of links: **Operations** (Overview, Dashboard, Analytics), **Communicate** (Compose, Journeys, Inbox, Templates, Channels, Calendar, Emergency), **Audience** (Residents, Contacts, Segments, Surveys), **Property Ops** (Properties, Work Orders, Submit Request, Displays, Content on Demand, Compliance), **Platform** (Integrations, AI Agents, Admin, Settings) | ☐ |
| 1.5 | Click the **☀ / ☾** theme toggle in the top bar | The whole app switches between dark and light mode; text stays readable in both | ☐ |
| 1.6 | **Security check:** open a private/incognito window and go to **http://localhost:3000/dashboard** | You are redirected to **/login** (you cannot reach any app page without signing in) | ☐ |
| 1.7 | Back in your logged-in window, click **Logout** (top right) | You return to the login screen | ☐ |

*Issues found in this section:* _______________________________________________

---

## 2. Overview & Dashboard (your daily snapshot)

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 2.1 | Click **Overview** | A summary page loads with headline KPIs and recent activity for WoodGreen | ☐ |
| 2.2 | Click **Dashboard** | A denser operational dashboard loads with metric cards and tables; no error messages | ☐ |
| 2.3 | On any data card, confirm the figures look like real WoodGreen numbers (not blanks) | Cards show populated values | ☐ |
| 2.4 | Scroll to the bottom of a data page | A small "Data source: live" note appears, confirming the page is reading the database | ☐ |

*Issues found:* _______________________________________________

---

## 3. Compose — send a broadcast (core flow)

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 3.1 | Click **Compose** | The message composer loads with channel options (Email / SMS / etc.) and an audience selector | ☐ |
| 3.2 | Type a subject and a short message body | Text appears in the fields | ☐ |
| 3.3 | (If available) Click an **AI / Generate** helper | A draft is produced. If `ANTHROPIC_API_KEY` is set it's labelled `(AI)`; otherwise a clean draft labelled `(stub)` | ☐ |
| 3.4 | Pick an audience (a property or a saved segment) | The estimated recipient count updates | ☐ |
| 3.5 | Click **Save Draft** | A confirmation appears; the draft is persisted (you can navigate away and it remains) | ☐ |
| 3.6 | Click **Send** (or **Broadcast**) | A success state shows the number of recipients. If email/SMS keys aren't set, the send is simulated and labelled `(demo)` — this is expected | ☐ |
| 3.7 | Go to **Analytics → Overview** afterward | The notice funnel / activity reflects that a send occurred | ☐ |

*Issues found:* _______________________________________________

---

## 4. Journeys — build an automation (Klaviyo-style)

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 4.1 | Click **Journeys** | The Journeys list loads. At least one journey exists (seeded) | ☐ |
| 4.2 | Click **New from template** (or the template gallery) | Six starter templates are offered: Move-in Onboarding, Lease Renewal 60-Day, Arrears Escalation, Maintenance Follow-up, Inspection Prep, Re-engagement | ☐ |
| 4.3 | Pick **Move-in Onboarding** | A new draft journey opens in the visual builder, pre-populated with a trigger card and a sequence of steps | ☐ |
| 4.4 | Inspect the canvas | You see a **Trigger** card at the top, then **Message**, **Delay**, and (where present) **Split** step cards arranged as a sequence; a Split shows **Yes / No** lanes | ☐ |
| 4.5 | Click a step card to edit it | A step editor opens; you can change the channel/message/delay and save | ☐ |
| 4.6 | Click **+ Add step** | A menu lets you insert a Message, Delay, or Split | ☐ |
| 4.7 | Click **Save** | The journey persists (it appears in the list with your changes) | ☐ |
| 4.8 | Set the journey status to **Active** (or toggle status) | The status updates to Active; enrolled count is shown | ☐ |
| 4.9 | Delete a test journey you created | It disappears from the list after confirmation | ☐ |

*Issues found:* _______________________________________________

---

## 5. Segments — target the right residents

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 5.1 | Click **Segments** | The Segments list loads with several saved segments (seeded) | ☐ |
| 5.2 | Find the **"Describe your audience"** box and type e.g. *"tenants in arrears"* then run it | The app interprets the phrase into a rule and shows an estimated segment size | ☐ |
| 5.3 | Open the **Smart Segments** gallery | Predictive presets are offered (e.g. Arrears risk, Low engagement, Non-responders, Upcoming renewal) | ☐ |
| 5.4 | Click a **Smart Segment** preset | A rule summary and estimated count appear in a preview | ☐ |
| 5.5 | Save a segment | It appears in the Segments list and becomes selectable in Compose / Work Orders audience pickers | ☐ |

*Issues found:* _______________________________________________

---

## 6. Inbox — two-way conversations

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 6.1 | Click **Inbox** | A 3-panel view loads: conversation list (left), thread (centre), context (right) | ☐ |
| 6.2 | Click a conversation in the list | The thread loads in the centre panel with message history | ☐ |
| 6.3 | Type a reply and send | The reply appears in the thread | ☐ |

*Issues found:* _______________________________________________

---

## 7. Templates, Channels & Calendar

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 7.1 | Click **Templates** | A library of reusable message templates loads | ☐ |
| 7.2 | Click **Channels** | Per-channel performance cards (SMS, Email, Digital Display, WhatsApp) appear at the top, then channel configuration | ☐ |
| 7.3 | Toggle/edit a channel setting and save | The change persists | ☐ |
| 7.4 | Click **Calendar** | The Comms Calendar loads in **List** view, grouped by date, showing scheduled sends (e.g. "June Newsletter", "Fire drill notice") | ☐ |
| 7.5 | Click the **Month** toggle (top right) | The view switches to a **month grid**: weekday header row, day cells, and colour-tinted event chips on the right days. Prev / Next buttons change the month | ☐ |
| 7.6 | Click **Month → List** back | Returns to the grouped list view | ☐ |
| 7.7 | Click **+ New Event**, fill Title + Date, choose a channel, Save | The event appears on both the list and the month grid on its date | ☐ |

*Issues found:* _______________________________________________

---

## 8. Emergency Broadcast (use with care)

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 8.1 | Click **Emergency** | A red-bordered Emergency Broadcast Console loads | ☐ |
| 8.2 | Click a **one-click incident** (Fire, Gas Leak, Flood, Power, Elevator, Security, General) | The incident type and a ready-to-send message are pre-filled automatically | ☐ |
| 8.3 | Click **✓ All Clear** | The message switches to an "all clear / resolved" message | ☐ |
| 8.4 | (Optional) Pick a **fan-out template** and enter a property | The message body is filled from the template with the property name substituted | ☐ |
| 8.5 | Click **⚠ Broadcast to all residents** | A confirmation shows the recipient count. Without provider keys it's labelled `(demo)` | ☐ |

*Issues found:* _______________________________________________

---

## 9. Audience — Residents, Contacts, Surveys, Properties

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 9.1 | Click **Residents** | A list of WoodGreen residents loads (seeded). Click one to open the 4-tab resident profile slide-out (profile / activity / etc.) | ☐ |
| 9.2 | Click **Contacts** | A contacts directory loads | ☐ |
| 9.3 | Click **Surveys** | Survey tools load; you can view/create a survey | ☐ |
| 9.4 | Click **Properties** | The WoodGreen property portfolio loads (multiple properties) | ☐ |

*Issues found:* _______________________________________________

---

## 10. Work Orders & Notices (maintenance → tenant notice)

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 10.1 | Click **Work Orders** | A KPI strip (Open, In Progress, Overdue, Resolved, Avg Resolution, Cost This Month) sits above the work-order queue | ☐ |
| 10.2 | Use the filter chips **All / Open / Urgent** | The table filters accordingly | ☐ |
| 10.3 | Click **+ Add Work Order** (or **New Work Order**) | A modal opens with Notice Type, Property, Category, **Priority** chips (Low / Medium / High / 🔴 Urgent), Title, and notice-content fields | ☐ |
| 10.4 | Choose **🔴 Urgent**, enter a Title and the required notice fields, pick channels, then **Create & Generate Drafts** | The work order is created with **Urgent** priority and multi-channel drafts are generated (labelled `AI` or `stub`) | ☐ |
| 10.5 | Back on the queue, confirm the new row shows the **Urgent** badge | Priority column shows the correct badge colour | ☐ |
| 10.6 | Open a work order → submit its notice **for review** | Status moves Draft → In Review | ☐ |
| 10.7 | As an approver, **Approve** the notice | Status moves to Approved | ☐ |
| 10.8 | **Publish** the approved notice | It sends to the property's residents by their preferred channel; status moves to **Sent** and the recipient count is reported | ☐ |
| 10.9 | Click **⚙ Configure fields** | You can set notice fields Required / Optional / Hidden per notice type (system-mandatory fields are locked) | ☐ |
| 10.10 | Click **Submit Request** (sidebar) | The frontline request-submission screen loads — the simple intake a building staffer would use | ☐ |

*Issues found:* _______________________________________________

---

## 11. Displays — digital signage network

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 11.1 | Click **Displays** | A grid of display player cards loads (seeded) | ☐ |
| 11.2 | Inspect a player card | It shows status (Online/Warning/Offline), property · location, and a telemetry panel: **Now playing**, **Resolution**, **Last heartbeat**, **Signal** (bar meter) **· uptime** | ☐ |
| 11.3 | Scroll below the grid | A **Proof-of-Play Log** table lists every display with Content, Resolution, Last heartbeat, Uptime (24h) and Status | ☐ |
| 11.4 | Click **+ Add Display**, fill Name + Property + Location, Save | The new display appears in the grid and the proof-of-play log | ☐ |
| 11.5 | Edit then delete a test display | Changes persist; delete removes it after confirmation | ☐ |

*Issues found:* _______________________________________________

---

## 12. Content on Demand & Compliance

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 12.1 | Click **Content on Demand** | A content library loads; you can add/edit a content item | ☐ |
| 12.2 | Click **Compliance** | Scored framework tiles load — Overall, RentSafeTO, Hamilton SAB, AODA — each with a score and a health bar | ☐ |
| 12.3 | Review the proof-of-delivery / regulation detail | Supporting compliance detail is shown beneath the tiles | ☐ |

*Issues found:* _______________________________________________

---

## 13. Analytics — the measurement loop

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 13.1 | Click **Analytics** | A tabbed analytics view loads (Overview, Devices, Channels, Engagement, Compliance, Reports) | ☐ |
| 13.2 | On **Overview**, find the **Notice Funnel** | A funnel shows Sent → Delivered → Acknowledged → Resolved with real counts | ☐ |
| 13.3 | Review **Monitors** and the **provider benchmark** | Threshold cards and a benchmark comparison are shown | ☐ |
| 13.4 | Use the header **date-range / compare / export** controls | The view updates; export produces a downloadable summary | ☐ |
| 13.5 | Open **Devices**, **Channels**, **Engagement** (best-times heatmap), **Compliance**, **Reports** tabs | Each renders its own breadth of data without errors | ☐ |

*Issues found:* _______________________________________________

---

## 14. Platform — Integrations, AI Agents, Admin, Settings

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 14.1 | Click **Integrations** | Configurable integration cards load (e.g. Yardi, providers); you can toggle/configure one and it persists | ☐ |
| 14.2 | Click **AI Agents** | The AI agents area loads (wired to Claude when `ANTHROPIC_API_KEY` is set) | ☐ |
| 14.3 | Click **Admin** | The multi-panel admin console loads with a sub-navigation across all panels | ☐ |
| 14.4 | Browse the admin panels (tenants/orgs, users & roles, branding, etc.) | Each panel renders its data; no errors | ☐ |
| 14.5 | (Super admin only) Try **impersonation** / tenant-portal tools if present | The impersonation banner appears when active and can be exited | ☐ |
| 14.6 | Click **Settings** | Org/profile settings load; change a setting and save | The change persists after reload | ☐ |

*Issues found:* _______________________________________________

---

## 15. Roles & permissions (RBAC) — optional deeper test

The platform enforces 8 roles: *super_admin, org_admin, manager, property_manager, comms_manager, publisher, frontline, viewer*. Security is enforced at the **database (RLS)** and **server-action** levels, not just the UI.

| # | Action | Expected Result | ☐ |
|---|--------|-----------------|---|
| 15.1 | As the demo **Super Admin**, confirm you can broadcast, publish notices, and open Admin | All allowed | ☐ |
| 15.2 | (If you create a lower-role user) Sign in as a **viewer/frontline** user | Publish/approve/admin actions are hidden or rejected with a clear "Your role cannot…" message | ☐ |
| 15.3 | Confirm a user only ever sees **their own organization's** data | No cross-org data is visible (enforced by row-level security) | ☐ |

*Issues found:* _______________________________________________

---

## 16. Known limitations & expected behaviours (not bugs)

- **AI drafts say `(stub)`** until `ANTHROPIC_API_KEY` is set — the deterministic draft is intentional and well-formed.
- **Email/SMS sends say `(demo)`** until `RESEND_API_KEY` / Twilio keys are set — sends are simulated and logged, not delivered.
- **Excel (.xlsx) Yardi import** needs `pnpm add xlsx`; **CSV import works without it.**
- **Demo data fallback:** in local/dev, empty tables show illustrative rows so the app is never blank. In production this is off, so a real, empty org sees true empty states.
- **Local-only:** this build runs against your local Supabase. Going to a shared/cloud environment is a separate deployment step.

---

## 17. Sign-off

| Area | Tester | Date | Pass / Fail | Notes |
|------|--------|------|-------------|-------|
| Login & navigation | | | | |
| Overview & Dashboard | | | | |
| Compose | | | | |
| Journeys | | | | |
| Segments | | | | |
| Inbox / Templates / Channels / Calendar | | | | |
| Emergency | | | | |
| Audience (Residents/Contacts/Surveys/Properties) | | | | |
| Work Orders & Notices | | | | |
| Displays | | | | |
| Content & Compliance | | | | |
| Analytics | | | | |
| Platform (Integrations/AI/Admin/Settings) | | | | |
| Roles & permissions | | | | |

**Overall UAT result:** ☐ Pass ☐ Pass with notes ☐ Fail
**Signed:** ________________________  **Date:** ____________

---

*Generated for the Fuse5 Hub build. Login: **clinton@fuse5.ca / demo12345** at **http://localhost:3000**.*
