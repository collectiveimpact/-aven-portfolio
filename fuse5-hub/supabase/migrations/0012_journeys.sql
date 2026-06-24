-- Journeys: lifecycle automation (trigger + ordered steps). One row per journey;
-- trigger + steps are jsonb matching src/lib/journeys.ts. Enrollment/run tracking
-- is a later addition; v1 stores the definition + a denormalized enrolled count.
create table if not exists journeys (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  trigger     jsonb not null default '{}',
  status      text not null default 'draft' check (status in ('draft','active','paused')),
  steps       jsonb not null default '[]',
  enrolled    int not null default 0,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table journeys enable row level security;
create policy journeys_read on journeys for select using (f5_is_member(org_id) or f5_is_super());
create policy journeys_write on journeys for all
  using (f5_has_role(org_id, array['super_admin','org_admin','manager','comms_manager','publisher']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin','manager','comms_manager','publisher']::f5_role[]));
