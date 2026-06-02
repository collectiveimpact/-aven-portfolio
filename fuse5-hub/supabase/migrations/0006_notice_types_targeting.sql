-- Per-notice-type field config + segment/group targeting + tenant preferred channel.

-- 1) Field config becomes per (org, notice_type, field)
alter table wo_field_settings add column if not exists notice_type text not null default 'general';
alter table wo_field_settings drop constraint if exists wo_field_settings_org_id_field_key_key;
do $$ begin
  alter table wo_field_settings add constraint wo_field_settings_unique unique (org_id, notice_type, field_key);
exception when duplicate_object then null; end $$;

-- 2) A work order carries its notice type + audience target
alter table work_orders add column if not exists notice_type text not null default 'general';
alter table work_orders add column if not exists target jsonb;  -- {scope:'property'|'segments'|'both', segmentIds:[]}

-- 3) Tenants get an explicit preferred channel (null = derive: email if present else sms)
alter table residents add column if not exists preferred_channel text
  check (preferred_channel in ('email','sms','whatsapp'));
