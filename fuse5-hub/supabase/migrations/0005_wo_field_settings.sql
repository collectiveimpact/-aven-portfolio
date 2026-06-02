-- Per-client (org) work-order/notice field configuration. One row per field the
-- client has customized. System (minimum-mandatory) fields are enforced in code
-- and never stored here. Member read; admin/manager write.

create table if not exists wo_field_settings (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references organizations(id) on delete cascade,
  field_key text not null,
  enabled   boolean not null default true,
  required  boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (org_id, field_key)
);

alter table wo_field_settings enable row level security;

create policy wofs_read on wo_field_settings for select using (f5_is_member(org_id));
create policy wofs_write on wo_field_settings for all
  using (f5_has_role(org_id, array['super_admin','org_admin','manager']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin','manager']::f5_role[]));
