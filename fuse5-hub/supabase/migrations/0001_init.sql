-- ============================================================================
-- Fuse5 Hub — backend schema (0001 init)
-- Tenant Communications platform for housing providers.
-- Multi-tenant Postgres + Supabase auth + Row-Level Security on every table.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 8-role model (mirrors src/lib/rbac.ts)
do $$ begin
  create type f5_role as enum (
    'super_admin','org_admin','manager','property_manager',
    'comms_manager','publisher','frontline','viewer'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- core
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique not null, region text,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', email text not null,
  created_at timestamptz not null default now()
);

create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role f5_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists idx_members_user on org_members(user_id);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  org_id uuid references organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null, detail text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_org on audit_log(org_id, created_at desc);

-- ---------------------------------------------------------------- audience
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null, address text, units int not null default 0
);
create index if not exists idx_props_org on properties(org_id);

create table if not exists residents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  unit text, name text not null, email text, phone text, language text default 'en',
  status text not null default 'active' check (status in ('active','moved_out')),
  created_at timestamptz not null default now()
);
create index if not exists idx_res_org on residents(org_id);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null, role text, email text, phone text, property text
);

create table if not exists segments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null, rule jsonb not null default '{}', size int not null default 0
);

-- ---------------------------------------------------------------- comms
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade, -- null = Fuse5 master
  name text not null, category text, channels text[] not null default '{}',
  mandatory boolean not null default false, version text default '1.0', body text default '',
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  subject text not null, body text not null default '',
  channels text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft','pending_approval','approved','scheduled','sending','sent','failed')),
  priority text not null default 'normal' check (priority in ('normal','high','emergency')),
  audience_count int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), scheduled_for timestamptz
);
create index if not exists idx_msg_org on messages(org_id, created_at desc);

create table if not exists message_recipients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  message_id uuid not null references messages(id) on delete cascade,
  resident_id uuid references residents(id) on delete set null,
  channel text not null,
  status text not null default 'queued' check (status in ('queued','delivered','opened','bounced'))
);
create index if not exists idx_mr_msg on message_recipients(message_id);

create table if not exists channels_config (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  channel text not null, enabled boolean not null default true, settings jsonb not null default '{}',
  unique (org_id, channel)
);

-- ---------------------------------------------------------------- ops / engagement
create table if not exists work_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  unit text, title text not null, category text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz not null default now()
);
create index if not exists idx_wo_org on work_orders(org_id, status);

create table if not exists displays (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  name text not null, location text,
  status text not null default 'online' check (status in ('online','offline','warning')),
  content_id uuid
);

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null, type text not null check (type in ('image','video','notice','playlist')),
  duration_s int, updated_at timestamptz not null default now()
);

create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null, status text not null default 'draft' check (status in ('draft','live','closed')),
  sent int not null default 0, responses int not null default 0
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null, day date not null, channel text, status text not null default 'scheduled'
);

-- ---------------------------------------------------------------- compliance / integrations / AI
create table if not exists compliance_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  kind text not null, due date,
  status text not null default 'compliant' check (status in ('compliant','due_soon','overdue'))
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  provider text not null, status text not null default 'disconnected', settings jsonb not null default '{}',
  last_sync_at timestamptz, unique (org_id, provider)
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  agent_key text not null, input text, output text, tokens int,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- billing (Phase 5)
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade unique,
  plan text not null default 'trial', seats int not null default 5,
  status text not null default 'trialing', stripe_customer_id text
);

-- ---------------------------------------------------------------- RBAC helpers
create or replace function f5_is_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members m where m.org_id = target_org and m.user_id = auth.uid());
$$;

create or replace function f5_has_role(target_org uuid, roles f5_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members m where m.org_id = target_org and m.user_id = auth.uid() and m.role = any(roles));
$$;

-- ---------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','org_members','audit_log','properties','residents','contacts',
    'segments','templates','messages','message_recipients','channels_config','work_orders',
    'displays','content_items','surveys','calendar_events','compliance_items','integrations',
    'agent_runs','subscriptions'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- Profiles: self.
create policy profile_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- Org: members read; admins update.
create policy org_read on organizations for select using (f5_is_member(id));
create policy org_admin on organizations for update using (f5_has_role(id, array['super_admin','org_admin']::f5_role[]));

-- Members visible to co-members; managed by admins.
create policy members_read on org_members for select using (f5_is_member(org_id));
create policy members_manage on org_members for all
  using (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin']::f5_role[]));

-- Generic org-scoped tables: members read; broadcast/publish roles write.
-- (Applied uniformly; refine per-table later as needed.)
do $$
declare t text;
begin
  foreach t in array array[
    'audit_log','properties','residents','contacts','segments','templates','messages',
    'message_recipients','channels_config','work_orders','displays','content_items',
    'surveys','calendar_events','compliance_items','integrations','agent_runs','subscriptions'
  ] loop
    execute format($f$
      create policy %1$s_read on %1$I for select using (f5_is_member(org_id));
    $f$, t);
    execute format($f$
      create policy %1$s_write on %1$I for all
        using (f5_has_role(org_id, array['super_admin','org_admin','manager','comms_manager','publisher']::f5_role[]))
        with check (f5_has_role(org_id, array['super_admin','org_admin','manager','comms_manager','publisher']::f5_role[]));
    $f$, t);
  end loop;
end $$;
