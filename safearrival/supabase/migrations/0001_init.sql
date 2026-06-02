-- ============================================================================
-- SafeArrival — independent backend schema (0001 init)
-- Standalone product. Owns its own orgs, auth-linked profiles, RBAC, audit,
-- and youth-program domain. No dependency on the Fuse5 Hub backend.
-- Target: Supabase (Postgres + auth.users + Row-Level Security).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Platform core (SafeArrival's own)
-- ---------------------------------------------------------------------------

-- A customer org = a youth-program provider (Boys & Girls Club, Scouts, City AfterSchool…)
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  region      text,
  created_at  timestamptz not null default now()
);

-- Roles within an org (SafeArrival's own RBAC, independent of Fuse5's 8-role model)
do $$ begin
  create type sa_role as enum (
    'org_admin',        -- full control of the org
    'program_director', -- manages programs + staff + reports
    'coordinator',      -- runs day-to-day attendance for assigned programs
    'staff',            -- frontline check-in/out
    'viewer',           -- read-only (board, funder)
    'parent'            -- guardian portal access only
  );
exception when duplicate_object then null; end $$;

-- Profile extends Supabase auth.users
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  created_at  timestamptz not null default now()
);

-- Membership join: which user belongs to which org, in which role
create table if not exists org_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        sa_role not null default 'staff',
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists idx_org_members_user on org_members(user_id);

-- Append-only audit trail (SafeArrival's own, e.g. 7-year retention policy)
create table if not exists audit_log (
  id          bigint generated always as identity primary key,
  org_id      uuid references organizations(id) on delete set null,
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_org on audit_log(org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- SafeArrival domain
-- ---------------------------------------------------------------------------

create table if not exists programs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  site        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_programs_org on programs(org_id);

create table if not exists children (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  program_id    uuid references programs(id) on delete set null,
  first_name    text not null,
  last_name     text not null,
  grade         text,
  date_of_birth date,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_children_org on children(org_id);
create index if not exists idx_children_program on children(program_id);

create table if not exists guardians (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null, -- linked when guardian has portal login
  full_name   text not null,
  phone       text,
  email       text,
  created_at  timestamptz not null default now()
);

create table if not exists child_guardians (
  child_id    uuid not null references children(id) on delete cascade,
  guardian_id uuid not null references guardians(id) on delete cascade,
  relationship text,
  is_primary  boolean not null default false,
  primary key (child_id, guardian_id)
);

-- One row per child per program-day (the attendance roster unit)
create table if not exists attendance_days (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  program_id  uuid not null references programs(id) on delete cascade,
  child_id    uuid not null references children(id) on delete cascade,
  day         date not null,
  status      text not null default 'expected'
              check (status in ('expected','present','absent','excused','late','checked_out')),
  created_at  timestamptz not null default now(),
  unique (program_id, child_id, day)
);
create index if not exists idx_attendance_org_day on attendance_days(org_id, day);

-- Individual check-in / check-out events (who, when, by whom)
create table if not exists check_events (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  child_id      uuid not null references children(id) on delete cascade,
  program_id    uuid not null references programs(id) on delete cascade,
  kind          text not null check (kind in ('check_in','check_out')),
  occurred_at   timestamptz not null default now(),
  recorded_by   uuid references auth.users(id) on delete set null,
  released_to   text, -- guardian name for check_out
  created_at    timestamptz not null default now()
);
create index if not exists idx_check_events_org on check_events(org_id, occurred_at desc);

-- Unexplained / flagged absences that need follow-up
create table if not exists absences (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  child_id     uuid not null references children(id) on delete cascade,
  program_id   uuid not null references programs(id) on delete cascade,
  day          date not null,
  state        text not null default 'open'
               check (state in ('open','notifying','escalated','resolved')),
  reason       text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index if not exists idx_absences_org_state on absences(org_id, state);

-- Safety / behaviour incidents
create table if not exists incidents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  child_id     uuid references children(id) on delete set null,
  program_id   uuid references programs(id) on delete set null,
  severity     text not null default 'low' check (severity in ('low','medium','high','critical')),
  summary      text not null,
  detail       text,
  reported_by  uuid references auth.users(id) on delete set null,
  status       text not null default 'open' check (status in ('open','investigating','closed')),
  created_at   timestamptz not null default now()
);
create index if not exists idx_incidents_org on incidents(org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RBAC helpers (security definer, used by RLS policies)
-- ---------------------------------------------------------------------------

create or replace function sa_is_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function sa_has_role(target_org uuid, roles sa_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members m
    where m.org_id = target_org and m.user_id = auth.uid() and m.role = any(roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security — every table, org-scoped
-- ---------------------------------------------------------------------------

alter table organizations  enable row level security;
alter table profiles       enable row level security;
alter table org_members    enable row level security;
alter table audit_log      enable row level security;
alter table programs       enable row level security;
alter table children       enable row level security;
alter table guardians      enable row level security;
alter table child_guardians enable row level security;
alter table attendance_days enable row level security;
alter table check_events   enable row level security;
alter table absences       enable row level security;
alter table incidents      enable row level security;

-- Org: members can read their org; only org_admin can update it.
create policy org_read   on organizations for select using (sa_is_member(id));
create policy org_update on organizations for update using (sa_has_role(id, array['org_admin']::sa_role[]));

-- Profiles: you can see/maintain your own profile.
create policy profile_self_read   on profiles for select using (id = auth.uid());
create policy profile_self_write  on profiles for update using (id = auth.uid());
create policy profile_self_insert on profiles for insert with check (id = auth.uid());

-- Members: visible to co-members; managed by admins/directors.
create policy members_read on org_members for select using (sa_is_member(org_id));
create policy members_manage on org_members for all
  using (sa_has_role(org_id, array['org_admin','program_director']::sa_role[]))
  with check (sa_has_role(org_id, array['org_admin','program_director']::sa_role[]));

-- Audit: readable by admins/directors; inserts allowed for any member (app writes them).
create policy audit_read on audit_log for select using (sa_has_role(org_id, array['org_admin','program_director']::sa_role[]));
create policy audit_insert on audit_log for insert with check (sa_is_member(org_id));

-- Generic org-scoped read for all members + write for staff-and-up on domain tables.
-- (parent/viewer get read only; staff/coordinator/director/admin can write.)
create policy programs_read  on programs  for select using (sa_is_member(org_id));
create policy programs_write on programs  for all
  using (sa_has_role(org_id, array['org_admin','program_director']::sa_role[]))
  with check (sa_has_role(org_id, array['org_admin','program_director']::sa_role[]));

create policy children_read  on children  for select using (sa_is_member(org_id));
create policy children_write on children  for all
  using (sa_has_role(org_id, array['org_admin','program_director','coordinator']::sa_role[]))
  with check (sa_has_role(org_id, array['org_admin','program_director','coordinator']::sa_role[]));

create policy guardians_read  on guardians for select using (sa_is_member(org_id));
create policy guardians_write on guardians for all
  using (sa_has_role(org_id, array['org_admin','program_director','coordinator']::sa_role[]))
  with check (sa_has_role(org_id, array['org_admin','program_director','coordinator']::sa_role[]));

create policy cg_read  on child_guardians for select using (
  exists (select 1 from children c where c.id = child_id and sa_is_member(c.org_id)));
create policy cg_write on child_guardians for all using (
  exists (select 1 from children c where c.id = child_id
          and sa_has_role(c.org_id, array['org_admin','program_director','coordinator']::sa_role[])))
  with check (
  exists (select 1 from children c where c.id = child_id
          and sa_has_role(c.org_id, array['org_admin','program_director','coordinator']::sa_role[])));

create policy attendance_read  on attendance_days for select using (sa_is_member(org_id));
create policy attendance_write on attendance_days for all
  using (sa_has_role(org_id, array['org_admin','program_director','coordinator','staff']::sa_role[]))
  with check (sa_has_role(org_id, array['org_admin','program_director','coordinator','staff']::sa_role[]));

create policy checks_read  on check_events for select using (sa_is_member(org_id));
create policy checks_write on check_events for insert
  with check (sa_has_role(org_id, array['org_admin','program_director','coordinator','staff']::sa_role[]));

create policy absences_read  on absences for select using (sa_is_member(org_id));
create policy absences_write on absences for all
  using (sa_has_role(org_id, array['org_admin','program_director','coordinator','staff']::sa_role[]))
  with check (sa_has_role(org_id, array['org_admin','program_director','coordinator','staff']::sa_role[]));

create policy incidents_read  on incidents for select using (sa_is_member(org_id));
create policy incidents_write on incidents for all
  using (sa_has_role(org_id, array['org_admin','program_director','coordinator','staff']::sa_role[]))
  with check (sa_has_role(org_id, array['org_admin','program_director','coordinator','staff']::sa_role[]));
