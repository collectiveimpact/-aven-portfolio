-- ============================================================================
-- Fuse5 Hub — Admin persistence (0020)
-- The platform-admin panels (admin-panels-v2.tsx) and the provider/role/workflow
-- actions were client-optimistic + audit-only: every change wrote to audit_log
-- but nowhere durable. This migration adds the real org-scoped tables those
-- actions now INSERT/UPDATE alongside the existing audit_log trace.
--
-- Pattern copied verbatim from 0013 / 0019:
--   • org_id uuid not null references organizations(id) on delete cascade
--   • member read via f5_is_member(org_id) (+ f5_is_super() so the cross-org
--     platform console can read), admin write via
--     f5_has_role(org_id, array['super_admin','org_admin']::f5_role[])
--   • additive + idempotent: create table if not exists / drop policy if exists.
-- Secrets: integration_configs mirrors channels_config (0001) — config lives in a
-- free-form `settings jsonb`; no dedicated plaintext-secret column is introduced.
-- ============================================================================

-- ---------------------------------------------------------------- providers
-- One row per provider org the platform operator manages (the cards in the
-- Providers panel). `key` is the stable slug used in app code (e.g. 'woodgreen').
create table if not exists providers (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizations(id) on delete cascade,
  key                 text not null,
  name                text not null,
  tier                text,
  yardi_sync          boolean not null default false,
  compliance_target   int not null default 0,
  compliance_framework text,
  active              boolean not null default true,
  color               text,
  created_at          timestamptz not null default now(),
  unique (org_id, key)
);
create index if not exists idx_providers_org on providers(org_id);

alter table providers enable row level security;
drop policy if exists providers_read on providers;
create policy providers_read on providers for select
  using (f5_is_member(org_id) or f5_is_super());
drop policy if exists providers_write on providers;
create policy providers_write on providers for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));

-- ---------------------------------------------------------------- provider_role_templates
-- Saved role definitions (the role library). `permissions` jsonb mirrors the
-- PERM_MODULES level map / grant list the panel edits.
create table if not exists provider_role_templates (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  key         text not null,
  label       text not null,
  permissions jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  unique (org_id, key)
);
create index if not exists idx_role_templates_org on provider_role_templates(org_id);

alter table provider_role_templates enable row level security;
drop policy if exists provider_role_templates_read on provider_role_templates;
create policy provider_role_templates_read on provider_role_templates for select
  using (f5_is_member(org_id) or f5_is_super());
drop policy if exists provider_role_templates_write on provider_role_templates;
create policy provider_role_templates_write on provider_role_templates for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));

-- ---------------------------------------------------------------- approval_workflows
-- Saved approval-workflow templates (steps + auto-route threshold). `steps` jsonb
-- holds the ordered [{ label, approverRole }] list the builder produces.
create table if not exists approval_workflows (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  key        text not null,
  name       text not null,
  steps      jsonb not null default '[]',
  threshold  int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, key)
);
create index if not exists idx_approval_workflows_org on approval_workflows(org_id);

alter table approval_workflows enable row level security;
drop policy if exists approval_workflows_read on approval_workflows;
create policy approval_workflows_read on approval_workflows for select
  using (f5_is_member(org_id) or f5_is_super());
drop policy if exists approval_workflows_write on approval_workflows;
create policy approval_workflows_write on approval_workflows for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));

-- ---------------------------------------------------------------- approval_queue
-- Items moving through the approval workflow. status defaults to 'pending';
-- decided_by / decided_at / note are filled on approve|reject.
create table if not exists approval_queue (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  title        text not null,
  category     text,
  tier         int not null default 0,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_by uuid references auth.users(id) on delete set null,
  decided_by   uuid references auth.users(id) on delete set null,
  decided_at   timestamptz,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_approval_queue_org on approval_queue(org_id, status);

alter table approval_queue enable row level security;
drop policy if exists approval_queue_read on approval_queue;
create policy approval_queue_read on approval_queue for select
  using (f5_is_member(org_id) or f5_is_super());
drop policy if exists approval_queue_write on approval_queue;
create policy approval_queue_write on approval_queue for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));

-- ---------------------------------------------------------------- integration_configs
-- Per-(org, source) integration toggle + config. Mirrors channels_config (0001):
-- all config lives in a free-form `settings jsonb` — NO plaintext-secret column.
create table if not exists integration_configs (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  source_key     text not null,
  enabled        boolean not null default false,
  settings       jsonb not null default '{}',
  last_tested_at timestamptz,
  created_at     timestamptz not null default now(),
  unique (org_id, source_key)
);
create index if not exists idx_integration_configs_org on integration_configs(org_id);

alter table integration_configs enable row level security;
drop policy if exists integration_configs_read on integration_configs;
create policy integration_configs_read on integration_configs for select
  using (f5_is_member(org_id) or f5_is_super());
drop policy if exists integration_configs_write on integration_configs;
create policy integration_configs_write on integration_configs for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));

-- ---------------------------------------------------------------- permission_grants
-- Resolved per-(role, module) access level. level mirrors PermLevel
-- (0 None · 1 Read · 2 R/W · 3 Full) from src/lib/platform.ts.
create table if not exists permission_grants (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  role       text not null,
  module_key text not null,
  level      int not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, role, module_key)
);
create index if not exists idx_permission_grants_org on permission_grants(org_id);

alter table permission_grants enable row level security;
drop policy if exists permission_grants_read on permission_grants;
create policy permission_grants_read on permission_grants for select
  using (f5_is_member(org_id) or f5_is_super());
drop policy if exists permission_grants_write on permission_grants;
create policy permission_grants_write on permission_grants for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));
