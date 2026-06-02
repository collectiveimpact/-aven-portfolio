-- Notice approval workflow: Draft → Review → Approved → Sent (published).
-- Extend notice_status with the review states.

alter table work_orders drop constraint if exists work_orders_notice_status_check;
alter table work_orders add constraint work_orders_notice_status_check
  check (notice_status in ('none','draft','pending_review','approved','published'));

alter table work_orders add column if not exists submitted_by uuid references auth.users(id) on delete set null;
alter table work_orders add column if not exists approved_by uuid references auth.users(id) on delete set null;
