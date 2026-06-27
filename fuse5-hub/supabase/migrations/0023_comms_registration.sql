-- Comms GO-LIVE management layer.
-- The platform MANAGES carrier/provider registration state; it never holds the
-- secrets. Operators enter real provider keys in env/secrets and complete the
-- external Twilio/carrier registration themselves — these tables track + manage
-- the process (brand/campaign pipeline, sender-identity verification) so an admin
-- can see, at a glance, what is blocking each channel from going live.
--
-- Additive + idempotent: safe to re-run. Org-scoped RLS mirrors the channels
-- model — members read, admin/manager tiers write (matches the channels_config
-- publisher-tier write policy and f5_has_role idiom used elsewhere).

-- ---------------------------------------------------------------- registration
-- One row per (org, channel). Holds the A2P 10DLC brand + campaign registration
-- pipeline state for a channel. NO secrets are stored here — only the legal /
-- business metadata carriers require and the externally-tracked status values.
create table if not exists comms_registration (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations(id) on delete cascade,
  channel           text not null,                          -- 'sms' | 'whatsapp' | 'voice' | 'email'
  -- Brand registration (the legal entity behind the messaging).
  brand_name        text,                                   -- legal business name
  brand_status      text not null default 'unregistered',   -- unregistered | submitted | pending | registered | rejected
  -- Campaign registration (the use-case carriers approve messaging under).
  campaign_use_case text,                                   -- e.g. 'Tenant/property notifications'
  campaign_status   text not null default 'unregistered',   -- unregistered | submitted | pending | registered | rejected
  -- Sender + 10DLC roll-up.
  sender_id         text,                                   -- the registered sending number / sender
  sender_verified   boolean not null default false,
  ten_dlc_status    text not null default 'unregistered',   -- unregistered | submitted | pending | registered | rejected
  submitted_at      timestamptz,                            -- when the operator initiated the external process
  notes             text,                                   -- EIN / business info / sample messages / opt-in flow (NO secrets)
  updated_at        timestamptz not null default now(),
  unique (org_id, channel)
);
create index if not exists comms_registration_org_idx on comms_registration(org_id);

alter table comms_registration enable row level security;
drop policy if exists comms_registration_read on comms_registration;
create policy comms_registration_read on comms_registration for select
  using (f5_is_member(org_id) or f5_is_super());
drop policy if exists comms_registration_write on comms_registration;
create policy comms_registration_write on comms_registration for all
  using (f5_has_role(org_id, array['super_admin','org_admin','manager']::f5_role[]) or f5_is_super())
  with check (f5_has_role(org_id, array['super_admin','org_admin','manager']::f5_role[]) or f5_is_super());

-- ---------------------------------------------------------------- identities
-- Sender identities to verify per channel: phone numbers (SMS/WhatsApp/Voice)
-- and from-addresses (email). Tracks verified state so the go-live readiness
-- model can require a verified sender before a channel is allowed live.
create table if not exists sender_identities (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  channel      text not null,                       -- 'sms' | 'whatsapp' | 'voice' | 'email'
  value        text not null,                       -- the number or from-address
  label        text,                                -- human label, e.g. 'Lobby line', 'Notices inbox'
  verified     boolean not null default false,
  verified_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (org_id, channel, value)
);
create index if not exists sender_identities_org_idx on sender_identities(org_id);

alter table sender_identities enable row level security;
drop policy if exists sender_identities_read on sender_identities;
create policy sender_identities_read on sender_identities for select
  using (f5_is_member(org_id) or f5_is_super());
drop policy if exists sender_identities_write on sender_identities;
create policy sender_identities_write on sender_identities for all
  using (f5_has_role(org_id, array['super_admin','org_admin','manager']::f5_role[]) or f5_is_super())
  with check (f5_has_role(org_id, array['super_admin','org_admin','manager']::f5_role[]) or f5_is_super());
