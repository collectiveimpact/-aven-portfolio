# Fuse5 Hub — build conventions (READ FIRST)

You are building ONE section group of the Fuse5 Hub app. Follow these exactly so
all sections stay consistent and the app builds. Next.js **16.2.7** (App Router,
Turbopack), React 19, Tailwind v4, TypeScript strict.

## Hard rules
1. **Only create files inside the route folders you are assigned.** Do NOT touch
   `src/lib/*`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`,
   `src/components/sidebar.tsx`, or another group's folders. Those are the shared contract.
2. Each section is a folder under `src/app/(app)/<route>/page.tsx`. Routes are already
   in the sidebar — match them exactly (e.g. `/compose` → `src/app/(app)/compose/page.tsx`).
3. Pages are **async server components** by default. Use a `"use client"` child component
   only for genuine interactivity (forms, toggles). Keep client components in the SAME folder
   (e.g. `src/app/(app)/compose/composer.tsx`).
4. Style ONLY with the `.f5-*` classes from globals.css (see list below) + inline `style`
   for layout. Do NOT add CSS files or Tailwind @theme changes. Do NOT add npm deps.
5. All data is **demo data defined locally in your page file** (typed with `@/lib/types`).
   No DB calls required. Match the look/numbers of the v2.0.8 prototype where you can.
6. Next 16: `params`/`searchParams` are Promises — `const { x } = await params`.
   `cookies()`/`headers()` are async. Server actions use `"use server"`.
7. It must `pnpm build` clean: no unused vars, no implicit `any`, no `<a>` for internal
   nav (use `next/link`), escape apostrophes in JSX text (`&apos;`).

## Available `.f5-*` classes (from globals.css)
Layout: `f5-content` (page wrapper), `f5-grid`, `f5-card`.
Type: `f5-page-title`, `f5-page-sub`, `f5-section-title`, `f5-kpi-label`, `f5-kpi-value`, `f5-kpi-sub`.
Color spans: `f5-up` (green), `f5-down` (red), `f5-warn` (amber).
Pills/chips/badges: `f5-pill`, `f5-chip`(+`.active`), `f5-badge`(+`.ok`/`.warn`/`.bad`), `f5-live`.
Buttons: `f5-btn`(+`.primary`). Tables: `f5-table`. Forms: `f5-label`, `f5-input`, `f5-select`, `f5-textarea`.
Trend bars: `f5-bars` > `f5-bar` (set `style={{height:'NN%'}}`, child `<span>` = label).
Feed: `f5-feed-row` + `f5-dot` (set `style={{background:'var(--f5-green|amber|red)'}}`).
CSS vars for inline styles: `var(--f5-text)`, `--f5-text-muted`, `--f5-text-dim`, `--f5-surface-2`, `--f5-border`, `--f5-teal`, `--f5-green`, `--f5-amber`, `--f5-red`.

## The exemplar
`src/app/(app)/page.tsx` (Overview) is the reference. Copy its structure:
page-title + page-sub, a KPI grid of `f5-card`s, `f5-section-title` dividers, tables/feeds/bars.

## Types
Import shapes from `@/lib/types` (Organization, Resident, Template, Message, WorkOrder,
Display, Survey, ComplianceItem, Contact, Segment, AgentDef, Channel, etc.) and
`@/lib/rbac` (F5Role, ROLE_LABELS).

## Deliverable
Each assigned route renders a real, populated, on-brand page (KPIs/tables/forms as fits
the section). Aim for the depth of the v2.0.8 prototype. Return a short list of files created.
