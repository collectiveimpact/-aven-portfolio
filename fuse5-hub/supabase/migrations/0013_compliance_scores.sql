-- Compliance scores pulled by the auto-sync agent from open-data feeds.
-- One row per (operator org, provider, framework) holding the latest synced
-- score. org_id = the platform operator running the sync; provider_key is the
-- provider whose buildings were scored. Refreshed by lib/compliance/agent.ts
-- (on-demand button or the scheduled /api/agents/compliance-sync route).
create table if not exists compliance_scores (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  provider_key  text not null,
  framework     text not null,                 -- 'rentsafeto' | 'hamilton-sab'
  score         numeric,
  proactive     numeric,
  reactive      numeric,
  colour        text,
  matched       int not null default 0,        -- buildings matched in the feed
  total         int not null default 0,        -- buildings attempted
  source        text,
  status        text not null default 'ok',    -- ok | partial | no_feed | error
  synced_at     timestamptz not null default now(),
  raw           jsonb,
  unique (org_id, provider_key, framework)
);
alter table compliance_scores enable row level security;
create policy compliance_scores_read on compliance_scores for select
  using (f5_is_member(org_id) or f5_is_super());
-- Writes come from the sync agent, gated to platform/admin tiers.
create policy compliance_scores_write on compliance_scores for all
  using (f5_has_role(org_id, array['super_admin','org_admin','manager']::f5_role[]) or f5_is_super())
  with check (f5_has_role(org_id, array['super_admin','org_admin','manager']::f5_role[]) or f5_is_super());
