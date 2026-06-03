-- Properties get type + manager contact (Fuse5-parity fields).
alter table properties
  add column if not exists type text not null default 'residential',
  add column if not exists manager_name text,
  add column if not exists manager_email text,
  add column if not exists manager_phone text;

-- Org settings (data-collection / audit toggles + branding), one row per org.
create table if not exists org_settings (
  org_id      uuid primary key references organizations(id) on delete cascade,
  data_residency text not null default 'ca-central-1',
  collect_delivery_logs boolean not null default true,
  collect_proof_of_play boolean not null default true,
  collect_acknowledgements boolean not null default true,
  audit_report_cadence text not null default 'monthly',
  updated_at  timestamptz not null default now()
);
alter table org_settings enable row level security;
create policy org_settings_read on org_settings for select using (f5_is_member(org_id));
create policy org_settings_write on org_settings for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));
