-- Platform-operator (Fuse5 super-admin) console: cross-org read scope + the one
-- new config table the panels persist to. Everything else the panels show is
-- read from existing tables (organizations, org_members, displays) or rendered
-- from the static reference data in src/lib/platform.ts.

-- True when the caller holds super_admin in ANY org. Security-definer so it can
-- see org_members without tripping that table's own RLS (mirrors f5_is_member).
create or replace function f5_is_super()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from org_members m
    where m.user_id = auth.uid() and m.role = 'super_admin'::f5_role
  );
$$;

-- Super-admins read ACROSS orgs (the platform console is multi-tenant). These are
-- additive SELECT policies — normal members keep their own-org scope.
create policy organizations_super_read on organizations for select using (f5_is_super());
create policy org_members_super_read  on org_members  for select using (f5_is_super());
create policy displays_super_read      on displays      for select using (f5_is_super());
create policy properties_super_read    on properties    for select using (f5_is_super());

-- Per-org tenant-portal configuration (self-service features, channels, branding,
-- kiosk). One row per org; settings is a free-form jsonb matching PortalConfig.
create table if not exists tenant_portal_config (
  org_id     uuid primary key references organizations(id) on delete cascade,
  settings   jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table tenant_portal_config enable row level security;
create policy tenant_portal_read on tenant_portal_config for select
  using (f5_is_member(org_id) or f5_is_super());
create policy tenant_portal_write on tenant_portal_config for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));
