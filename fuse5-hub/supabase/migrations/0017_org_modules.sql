-- Per-account module activation. enabled_modules is a JSON array of module keys
-- (see src/lib/modules.ts). NULL = use the default starter set; an array = exactly
-- those modules (plus core/required, resolved in app code).
alter table organizations add column if not exists enabled_modules jsonb;
