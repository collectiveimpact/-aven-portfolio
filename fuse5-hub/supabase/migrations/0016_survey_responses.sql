-- Survey responses: one row per resident submission. answers is a JSON map of
-- question id -> value (scale index 0-4, nps 0-10, option string, string[] for
-- multi, or free text). Inserts come from the public /s/[id] endpoint via the
-- service role; org members read aggregates under RLS.
create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  survey_id uuid not null references surveys(id) on delete cascade,
  resident_id uuid references residents(id) on delete set null,
  channel text,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);
create index if not exists survey_responses_survey_idx on survey_responses(survey_id);

alter table survey_responses enable row level security;
drop policy if exists survey_responses_read on survey_responses;
create policy survey_responses_read on survey_responses for select using (f5_is_member(org_id));
drop policy if exists survey_responses_write on survey_responses;
create policy survey_responses_write on survey_responses for insert with check (f5_is_member(org_id));
