# Fuse5 Product Deep-Dive — demo.fuse5.ca (build spec)

Full walkthrough of the real Fuse5 demo, captured to build parity. Logged in as a
single Admin (admin@fuse5.com). Light theme, indigo accent. 6 nav items.

## 1. The product in one line
Fuse5 turns a **work order into a multi-channel tenant notice**: enter operational
facts → AI generates Email + SMS content and renders a **digital-signage** card →
target the property's tenants (by their preferred channel) → schedule → **Publish**.
Everything is logged for **audit reporting**.

## 2. Navigation / sections
| Nav | Reality |
|---|---|
| Dashboard | route 404 in demo — app effectively lands on WO & Notices |
| **WO & Notices** | the core: work-order list + the notice studio (detail) |
| **Tenants** | recipient directory (per property, with preferred channel) |
| **Properties** | portfolio (type, occupancy, manager contact) |
| **Analytics** | = **Reports**: Tenant Notification Audit per quarter |
| **Settings** | tenant groups, data collection, audit/reporting automation |

Note: far leaner than our 20-section build. Fuse5 is focused on **notices + audit**.

## 3. Data model (observed)
- **Property** `#383`: name, address, **type** (Commercial/Industrial/Residential), **occupancy** (occupied/total, e.g. 31/40), manager contact (name/email/phone). Bulk Upload + Add.
- **Tenant** `#472`: name, **age**, **type** (Residential/Commercial), **property** (FK), **contact** with a **preferred channel** (📱 = SMS, 📧 = email) + email + phone. Bulk Upload + Add. → the recipient source.
- **Work Order / Notice** `1009`:
  - list fields: title, property, **affected floors/units**, **channels** (email/SMS/signage icons), **status** (Draft/Published), created.
  - content fields: **Contact Info**, **Operation Title**, **Image** + **incident category** (Water / Fire / Elevator / Heat / Pest / Default; Delete/Replace), **Date**, **Title**, **Floors/Units Affected**, **CTA**.
  - generated: **Email** (AI, rendered HTML preview), **SMS** (AI), **Signage** (rendered from **Template OP-1**, code `WO-OP345`, themed image + headline + date + unit + CTA + accent bar).
  - **Recipient List**: auto-derived from the property's tenants (shows count; "No tenants found for this property" when empty).
  - **Schedule**: "same for all channels" toggle, **start/end** date+time, send mode: **once / as notification / as reminder**.
  - lifecycle: **Save Draft** → **Publish** (Cancel/Publish in header).
- **Tenant Groups** (Settings): name, description, parent group, **priority index**, automation rule/key — audience segmentation.
- **Audit data** (Settings → Data Collection): message events, **delivery logs (email/SMS)**, **signage proof-of-play**, audience groups, **acknowledgements/responses**, system errors.

## 4. The Notice Studio (WO detail) — the heart of the product
`/work-orders/[id]` — two-pane editor:
- **Left — WO Content** (editable): Contact Info, Operation Title, Image (category picker), Date, Title, Floors/Units, CTA, **Save Draft**.
- **Right — live previews:**
  - **Digital Signage Preview** — branded template card (image themed to incident category, headline, date/time, unit, CTA, colored accent bar, template id + code).
  - **Email** — "AI generated content" + rendered HTML **Preview** (branded header graphic).
  - **SMS** — "AI generated content" (short).
  - **Recipient List (N)** — from the property's tenants.
  - **Schedule** — window + once/notification/reminder.
- Header: **Cancel / Publish**.

**Flow:** Add Work Order (Property, Title, Description + Notice Content Details: Operation Title, Date/Time, Contact, Floors/Units, CTA) → **Create & Generate Drafts** → lands in this studio → edit/preview → Publish. **Bulk Upload** creates many at once.

## 5. Analytics = Reports
"Tenant Notification Audit" per quarter (Q3/Q4 2025): reporting period, **Total Notifications** (e.g. 4,352), averages. Settings drives this: collects message/delivery/proof-of-play/ack data → normalizes → scheduled transforms → **PDF/Excel report**, per-building/floor viz, **ML anomaly detection**, response-time trends, anomaly alerts.

## 6. Our build vs Fuse5 — parity gaps
| Capability | Fuse5 | Ours | Action |
|---|---|---|---|
| WO list w/ channels + Draft/Published | ✅ | ✅ | — |
| Add WO → structured fields → generate | ✅ | ✅ | — |
| AI per-channel content | ✅ | ✅ (stub/Claude) | — |
| **Notice Studio detail page** | ✅ | ❌ | **build `/workorders/[id]`** |
| **Signage preview (template + incident image)** | ✅ | ❌ | build template renderer + image categories |
| **Email HTML preview** | ✅ | ❌ (plain text) | build branded email render |
| **Recipient list from property tenants + preferred channel** | ✅ | ⚠️ caps residents | derive recipients per channel from tenants |
| **Scheduling (window, once/notification/reminder)** | ✅ | ⚠️ send-now/schedule | add schedule model to WO/notice |
| **Edit-then-Publish lifecycle** | ✅ | ⚠️ draft only | add Publish from studio → send path |
| **Bulk Upload (WOs/Tenants/Properties)** | ✅ | ❌ | CSV import |
| Properties: type + occupancy + manager | ✅ | ⚠️ basic | add fields |
| Tenants: age, type, preferred channel | ✅ | ⚠️ residents basic | add preferred channel + age/type |
| Analytics = audit reports (PDF, per-building, anomalies) | ✅ | ⚠️ message stats | build audit report generation |
| Tenant Groups (Settings) | ✅ | ⚠️ Segments | align to groups + priority |
| Proof-of-play / delivery logs / acknowledgements | ✅ | ❌ | add event logging tables |

## 7. Build plan to reach parity (priority)
**P0 — Notice Studio (`/workorders/[id]`):** editable content + image category → live **signage preview** + **email HTML preview** + SMS → recipient list from property tenants (by preferred channel) → schedule → **Save Draft / Publish** (Publish fires existing send path + logs delivery).
**P1 — Recipient + data fidelity:** tenants get preferred channel/age/type; properties get type/occupancy/manager; recipient resolution per channel; delivery-log + proof-of-play tables.
**P2 — Bulk Upload** (WOs, Tenants, Properties via CSV).
**P3 — Audit Reports** (Analytics): quarterly Tenant Notification Audit, per-building viz, PDF export.
**P4 — Settings:** Tenant Groups + automation rules.

## 8. Note on our build's broader scope
Our app has 14 sections Fuse5 doesn't (Compose, Templates, Inbox, Surveys, Compliance, Calendar, Emergency, AI Agents, etc.). That's a richer surface — but the **Fuse5 core is the Notice Studio + audit**. Decide: match Fuse5 exactly (lean), or keep our superset and fold the Studio in as the WO flow. Recommended: **fold the Notice Studio into our Work Orders** (P0 above) and keep our extras as differentiators.
