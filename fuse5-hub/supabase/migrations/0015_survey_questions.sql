-- Survey builder: store the question set + an optional description on each survey.
-- questions is an ordered JSON array of { id, type, text, options?, required? }
-- where type ∈ sat5 | agree5 | nps11 | change5 | multi | single | text.
alter table surveys add column if not exists description text;
alter table surveys add column if not exists questions jsonb not null default '[]'::jsonb;
