-- Yardi ETL import: external ids for idempotent upsert + connection config.

-- external_id = the Yardi code (PropertyCode / TenantCode / WONumber) for each
-- row, so re-importing the same export updates rows instead of duplicating them.
-- Existing seeded rows keep external_id = null (NULLS DISTINCT → no conflicts).
alter table properties  add column if not exists external_id text;
alter table residents   add column if not exists external_id text;
alter table work_orders add column if not exists external_id text;

create unique index if not exists uq_props_ext  on properties(org_id, external_id);
create unique index if not exists uq_res_ext    on residents(org_id, external_id);
create unique index if not exists uq_wo_ext     on work_orders(org_id, external_id);

-- Per-org Yardi connection config. Holds NON-SECRET fields only
-- (endpoint/database/username/mode). API passwords + interface licenses live in
-- server env / a secret store, never in this row (org members can read it).
create table if not exists yardi_connections (
  org_id       uuid primary key references organizations(id) on delete cascade,
  mode         text not null default 'file' check (mode in ('file','sftp','api')),
  config       jsonb not null default '{}',
  last_sync_at timestamptz,
  last_sync_summary text,
  updated_at   timestamptz not null default now()
);
alter table yardi_connections enable row level security;
create policy yardi_conn_read on yardi_connections for select using (f5_is_member(org_id));
create policy yardi_conn_write on yardi_connections for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));
