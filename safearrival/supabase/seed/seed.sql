-- SafeArrival demo seed (domain data; members/auth created via Supabase auth signup).
-- Safe to run against a fresh local Supabase: supabase db reset loads this.

insert into organizations (id, name, slug, region) values
  ('00000000-0000-0000-0000-0000000000a1', 'Boys & Girls Club — Durham', 'bgc-durham', 'Durham')
on conflict (id) do nothing;

insert into programs (id, org_id, name, site, active) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'After-School Care', 'Oshawa Main', true),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'Scouts Canada — Troop 47', 'Whitby Hall', true),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1', 'Summer Camp', 'Lakeview', true)
on conflict (id) do nothing;

-- A small roster
insert into children (id, org_id, program_id, first_name, last_name, grade) values
  ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','Amara','Johnson','4'),
  ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','Liam','Chen','3'),
  ('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b2','Sofia','Rossi','5'),
  ('00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b3','Noah','Williams','6')
on conflict (id) do nothing;

-- Today's check-ins
insert into check_events (org_id, child_id, program_id, kind, released_to) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000b1','check_in', null),
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000b1','check_in', null);

-- An open absence + an incident for the dashboard
insert into absences (org_id, child_id, program_id, day, state, reason) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000b2', current_date, 'escalated', 'No check-in by 4:15pm');

insert into incidents (org_id, child_id, program_id, severity, summary, status) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-0000000000b3','medium','Minor scrape during outdoor activity, first aid applied','open');
