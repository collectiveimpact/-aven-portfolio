-- ----------------------------------------------------------------------------
-- 0018_resident_demographics
-- Adds a demographics layer to the resident directory, modelled on a Yardi
-- social-housing (Voyager / RentCafe Affordable) export for an Ontario provider.
--
-- Design: a companion `resident_demographics` table (1:1 with residents) rather
-- than widening the residents table, so the sensitive demographic + consent data
-- lives in its own row that a Yardi feed can upsert independently. A couple of
-- light, low-sensitivity tenancy convenience columns are also added directly to
-- `residents` so the directory list can render them without a join.
--
-- Additive + idempotent: safe to re-run. No backfill of synthetic data — rows
-- are created on demand by the Yardi import / in-app edit. The app gracefully
-- renders "—" where a demographics row does not yet exist.
-- ----------------------------------------------------------------------------

-- 1. Light tenancy columns on residents (cheap to surface in the list view).
alter table residents add column if not exists tenant_code text;        -- Yardi tenant/lease code (tcode)
alter table residents add column if not exists preferred_channel text;  -- defensive: present in app already, ensure column exists
alter table residents add column if not exists last_contacted_at timestamptz;
alter table residents add column if not exists tenancy_start date;
alter table residents add column if not exists tenancy_end date;

-- preferred_channel default + check (no-op if column predates this migration)
alter table residents alter column preferred_channel set default 'email';

-- 2. Companion demographics table (1:1 with residents, org-scoped).
create table if not exists resident_demographics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  resident_id uuid not null references residents(id) on delete cascade,

  -- Household composition
  household_size int check (household_size is null or household_size >= 0),
  household_composition text,                       -- e.g. 'Single adult', 'Lone parent + 2 children', 'Senior couple'
  occupant_type text,                               -- 'head_of_household' | 'occupant' | 'co_tenant' | 'dependent'
  age_band text,                                    -- '18-24','25-34','35-44','45-54','55-64','65-74','75+' (banded — never a DOB)
  dependents int check (dependents is null or dependents >= 0),

  -- Language & communication needs
  primary_language text,
  secondary_languages text[] not null default '{}',
  interpreter_required boolean not null default false,

  -- Accessibility (drives AODA-compliant notice formatting + emergency routing)
  accessibility_needs text[] not null default '{}', -- e.g. {'large_print','visual_alerts','step_free'}
  mobility text,                                     -- 'none' | 'cane_walker' | 'wheelchair' | 'mobility_scooter'
  service_animal boolean not null default false,
  emergency_assembly text,                          -- assembly point / evacuation note

  -- Income & subsidy (banded only — no raw income figures)
  income_band text,                                 -- e.g. '0-15k','15-30k','30-45k','45-60k','60k+'
  subsidy_type text,                                -- 'rgi' (rent-geared-to-income) | 'market' | 'portable_housing_benefit' | 'affordable'
  rent_share numeric(10,2),                         -- tenant's monthly portion, if tracked

  -- Support network
  support_agency text,                              -- partnered agency (e.g. 'CMHA Toronto', 'LOFT Community Services')
  case_worker text,
  case_worker_contact text,

  -- Emergency contact
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,

  -- Consent flags (CASL + privacy / data-sharing)
  consent_casl boolean not null default false,            -- commercial electronic message consent
  consent_sms boolean not null default false,
  consent_data_sharing boolean not null default false,    -- share demographics with partner support agencies
  consent_emergency_only boolean not null default true,   -- emergency broadcasts always permitted
  consent_updated_at timestamptz,

  notes text,

  source text not null default 'manual',            -- 'manual' | 'yardi' — provenance for the Yardi feed
  updated_at timestamptz not null default now(),

  unique (resident_id)
);

create index if not exists idx_resident_demographics_org on resident_demographics(org_id);
create index if not exists idx_resident_demographics_resident on resident_demographics(resident_id);

-- keep updated_at fresh on write
create or replace function f5_touch_resident_demographics()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_resident_demographics on resident_demographics;
create trigger trg_touch_resident_demographics
  before update on resident_demographics
  for each row execute function f5_touch_resident_demographics();

-- 3. RLS — org-scoped, matching the app's existing idiom (f5_is_member for read,
--    f5_has_role for write so only manager/admin/publisher roles can edit).
alter table resident_demographics enable row level security;

drop policy if exists resident_demographics_read on resident_demographics;
create policy resident_demographics_read on resident_demographics
  for select using (f5_is_member(org_id));

drop policy if exists resident_demographics_write on resident_demographics;
create policy resident_demographics_write on resident_demographics
  for all
  using (f5_has_role(org_id, array['super_admin','org_admin','manager','comms_manager','publisher']::f5_role[]))
  with check (f5_has_role(org_id, array['super_admin','org_admin','manager','comms_manager','publisher']::f5_role[]));
