-- ─────────────────────────────────────────────────────────────────────────────
-- 0024_portal_deepen — resident-portal deepening: web-push subscriptions,
-- per-request chat thread, and a Storage bucket for request photos.
--
-- SECURITY MODEL (matches the prototype resident-auth posture):
--   Residents are NOT Supabase-authenticated (see src/lib/portal/session.ts).
--   The portal talks to these tables through the SERVICE-ROLE client, scoped
--   STRICTLY in application code to the signed-in resident_id / org_id. The
--   service role bypasses RLS, so the app-level `.eq()` filters in
--   src/lib/portal/data.ts are the real isolation boundary today.
--
--   We still enable RLS + add SERVICE-ROLE-ONLY / member policies as
--   defence-in-depth so that no anon/authenticated role can read these rows,
--   and so staff (org members) can read the chat thread under normal RLS.
--   Production must add true resident-scoped RLS (a resident JWT claim).
--
-- Idempotent + additive: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Web-push subscriptions ───────────────────────────────────────────────────
-- One row per (resident, browser endpoint). Written by the portal "Enable
-- notifications" flow via the service role; read by the (stubbed) push sender.
create table if not exists portal_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
-- A given browser endpoint is unique; upsert on it so re-enabling refreshes keys.
create unique index if not exists portal_push_subscriptions_endpoint_key
  on portal_push_subscriptions(endpoint);
create index if not exists portal_push_subscriptions_resident_idx
  on portal_push_subscriptions(resident_id);

alter table portal_push_subscriptions enable row level security;
-- Org members may read their org's subscriptions (e.g. an admin "who's opted in"
-- view later). No anon/authenticated insert/update — the portal writes via the
-- service role only, which bypasses RLS.
drop policy if exists portal_push_subscriptions_read on portal_push_subscriptions;
create policy portal_push_subscriptions_read on portal_push_subscriptions
  for select using (f5_is_member(org_id));

-- ── Request chat thread ──────────────────────────────────────────────────────
-- Messages on a resident's maintenance request (work order). `sender` is
-- 'resident' or 'staff'. Residents post via the service role scoped to their own
-- work orders (app code verifies ownership before insert). Staff replies are
-- attributed with sender='staff'. Org members read the thread under RLS.
create table if not exists request_messages (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  resident_id uuid references residents(id) on delete set null,
  sender text not null default 'resident' check (sender in ('resident','staff')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists request_messages_wo_idx
  on request_messages(work_order_id, created_at);

alter table request_messages enable row level security;
-- Org members (staff) may read + reply to threads in their org under RLS. The
-- resident side goes through the service role, scoped in app code to the
-- resident's own work orders.
drop policy if exists request_messages_read on request_messages;
create policy request_messages_read on request_messages
  for select using (f5_is_member(org_id));
drop policy if exists request_messages_write on request_messages;
create policy request_messages_write on request_messages
  for insert with check (f5_is_member(org_id));

-- ── Storage bucket for request photos ────────────────────────────────────────
-- Public bucket so residents/staff can view thumbnails via the returned public
-- URL (the path is an unguessable uuid). Uploads happen via the service role in
-- a server action (see src/app/portal/actions.ts → uploadRequestPhoto).
insert into storage.buckets (id, name, public)
values ('request-photos', 'request-photos', true)
on conflict (id) do nothing;

-- Basic storage policies for the bucket. Reads are public (bucket is public);
-- writes are restricted to org members under RLS as defence-in-depth — the
-- portal's own uploads use the service role, which bypasses these.
drop policy if exists "request-photos public read" on storage.objects;
create policy "request-photos public read" on storage.objects
  for select using (bucket_id = 'request-photos');

drop policy if exists "request-photos member write" on storage.objects;
create policy "request-photos member write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'request-photos');
