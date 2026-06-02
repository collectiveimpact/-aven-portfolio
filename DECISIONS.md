# Fuse5 Hub — Locked Product Decisions (2026-06)

Decisions from Clinton that drive the build. Update when they change.

## 1. Scope — KEEP THE SUPERSET
Keep all 20 sections (Compose, Templates, Inbox, Surveys, Compliance, AI Agents, etc.)
**and** the Fuse5-style Work Orders & Notices studio. We are a richer product than the
Fuse5 demo; their WO/Notice flow is one (central) part of ours. Do not strip down.

## 2. Publish → SEND NOW per chosen channels
Publishing a notice **dispatches immediately** to the affected property's tenants on
their channels. Email is live now (adapter); SMS/voice activate when those provider
keys are added. (This is what's built — keep it; extend to SMS/voice when keyed.)

## 3. Field config — PER CLIENT **+ PER NOTICE TYPE**
Mandatory/optional field configuration must vary by **notice type** (e.g. Emergency vs
Maintenance vs Newsletter vs Inspection), not just per client.
→ Build: add a `notice_type` dimension to `wo_field_settings`; the Add/Studio forms pick
a notice type and load that type's field config; minimum-mandatory (system) fields still
locked across all types.

## 4. Recipients — PROPERTY TENANTS BY PREFERRED CHANNEL **+ SEGMENTS/GROUPS**
A notice targets the affected property's tenants on their **preferred channel**, AND can
also target saved **Segments / Tenant Groups** (e.g. Floors 1–5, French speakers, arrears).
→ Build: add explicit `preferred_channel` to residents/tenants; add segment/group
targeting to the notice studio + recipient resolution.

---

## Resulting next builds (priority)
1. **Notice types + per-type field config** (decision #3) — notice_type on settings,
   type picker in Add/Studio + field-config page, seed default types.
2. **Preferred channel + segment targeting** (decision #4) — tenant preferred_channel
   field; recipient resolver honors it; segment/group selector in the studio.
3. **SMS/voice channel send** (decision #2) — Twilio adapter mirroring email; activates on key.
4. Bulk Upload; Audit Reports; tenant/property field fidelity (from FUSE5_DEMO_SPEC.md).

## QA baseline (2026-06, all passing)
Auth gate + login; live Overview/sections (0 console errors); Compose send; Emergency
broadcast; WO → AI notice generation; Notice Studio (signage/email/SMS previews +
publish); per-client field config (required enforcement). Verified against local Supabase.
