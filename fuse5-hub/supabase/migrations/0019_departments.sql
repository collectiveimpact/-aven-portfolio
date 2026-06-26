-- ============================================================================
-- Fuse5 Hub — Departments axis (0019)
-- Adds a DEPARTMENT dimension alongside the existing role model (src/lib/rbac.ts).
-- A department groups an org's users (Housing, Communications, Maintenance, …) so
-- each department gets its own people and its own dashboard view. ORTHOGONAL to
-- role — a user has BOTH a role (what they can do) and a department (where they sit).
-- Additive + idempotent: safe to re-run. Does NOT touch the f5_role enum or any
-- existing RLS helper / policy.
-- ============================================================================

-- ---------------------------------------------------------------- departments
-- Org-scoped department catalog. `key` is a stable slug used in app code; `label`
-- is the display name. Unique per org so two orgs can both have a "housing".
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (org_id, key)
);
create index if not exists idx_departments_org on departments(org_id);

-- ---------------------------------------------------------------- membership link
-- Tie a user to a department. Nullable (unassigned by default) and ON DELETE SET
-- NULL so removing a department never orphans/locks a member. We store the FK on
-- org_members (the existing membership table — see 0001_init.sql).
alter table org_members
  add column if not exists department_id uuid references departments(id) on delete set null;
create index if not exists idx_members_department on org_members(department_id);

-- ---------------------------------------------------------------- RLS
alter table departments enable row level security;

-- Members of the org may read its departments (needed to render dashboards/pickers).
drop policy if exists departments_read on departments;
create policy departments_read on departments for select
  using (f5_is_member(org_id));

-- Only Super Admin / Org Admin manage the department catalog (mirrors the
-- members_manage idiom and the canAdmin tier in rbac.ts).
drop policy if exists departments_write on departments;
create policy departments_write on departments for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));

-- ---------------------------------------------------------------- seed (demo org)
-- Seed the six default departments for the WoodGreen demo org (slug 'woodgreen').
-- Idempotent via the (org_id, key) unique constraint. No-op if the org is absent.
insert into departments (org_id, key, label)
select o.id, d.key, d.label
from organizations o
cross join (values
  ('housing',        'Housing'),
  ('communications', 'Communications'),
  ('maintenance',    'Maintenance'),
  ('creative',       'Creative'),
  ('ux',             'UX'),
  ('it',             'IT')
) as d(key, label)
where o.slug = 'woodgreen'
on conflict (org_id, key) do nothing;
