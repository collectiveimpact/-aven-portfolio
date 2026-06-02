-- Notice Studio: store the editable notice facts + schedule on a work order
-- so the detail editor can re-render previews, regenerate, and publish.

alter table work_orders
  add column if not exists notice jsonb,      -- {operationTitle, contactInfo, dateText, affected, cta, imageCategory}
  add column if not exists schedule jsonb;     -- {start, end, mode, sameAll}
