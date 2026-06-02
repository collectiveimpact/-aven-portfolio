-- Inbound resident messages (replies to broadcasts, inbound SMS/email/WhatsApp).
-- Backs the Inbox section. RLS: org members read; staff-and-up manage.

create table if not exists inbound_messages (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  resident_id uuid references residents(id) on delete set null,
  channel     text not null default 'sms' check (channel in ('email','sms','whatsapp','voice')),
  subject     text,
  body        text not null default '',
  status      text not null default 'open' check (status in ('open','awaiting','resolved')),
  received_at timestamptz not null default now()
);
create index if not exists idx_inbound_org on inbound_messages(org_id, received_at desc);

alter table inbound_messages enable row level security;

create policy inbound_read on inbound_messages for select using (f5_is_member(org_id));
create policy inbound_write on inbound_messages for all
  using (f5_has_role(org_id, array['super_admin','org_admin','manager','comms_manager','frontline']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin','manager','comms_manager','frontline']::f5_role[]));
