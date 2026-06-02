-- Work orders carry a generated multi-channel notice (matches demo.fuse5.ca:
-- a work order IS a notice). Adds channels, generated drafts, and notice status.

alter table work_orders
  add column if not exists channels text[] not null default '{}',
  add column if not exists drafts jsonb,
  add column if not exists notice_status text not null default 'none'
    check (notice_status in ('none','draft','published'));
