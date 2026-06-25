-- Hardening: pin search_path on the security-definer super check (clears the
-- function_search_path_mutable advisor). The other RBAC helpers already set it.
create or replace function f5_is_super()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from org_members m
    where m.user_id = auth.uid() and m.role = 'super_admin'::f5_role
  );
$$;
