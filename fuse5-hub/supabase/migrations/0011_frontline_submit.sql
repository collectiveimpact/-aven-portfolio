-- Frontline staff can SUBMIT work orders (maintenance requests) but not edit or
-- resolve them. Additive INSERT policy — the existing publisher-tier _write
-- policy still governs update/delete, so frontline can create and then only view.
create policy work_orders_frontline_insert on work_orders for insert
  with check (f5_has_role(org_id, array['frontline']::f5_role[]));
