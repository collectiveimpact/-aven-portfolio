// Fuse5 Hub environment. The app runs WITHOUT these (demo data) so it is
// demoable immediately; set them to connect the real backend / providers.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasBackend = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Server-only provider keys (never exposed to the browser).
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
export const TWILIO_FROM = process.env.TWILIO_FROM ?? "";
// Service-role key + cron secret enable headless agents (e.g. the scheduled
// compliance-score sync) to authenticate and write without a user session.
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const CRON_SECRET = process.env.CRON_SECRET ?? "";
export const COMPLIANCE_SYNC_ORG_ID = process.env.COMPLIANCE_SYNC_ORG_ID ?? "";
export const hasAI = Boolean(ANTHROPIC_API_KEY);
export const hasEmail = Boolean(RESEND_API_KEY);
export const hasSms = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM);

// Demo affordances (prefilled login creds, demo hints). ON for local/dev; OFF in
// production unless NEXT_PUBLIC_DEMO=true is set explicitly. Client-safe flag.
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "true" || process.env.NODE_ENV !== "production";

// Whether list getters fall back to canned demo rows when a backed table is
// EMPTY. ON for local/dev (rich demo); OFF in production so a real org with no
// data renders true empty states instead of fake rows. Follows IS_DEMO.
export const DEMO_FALLBACK = process.env.DEMO_FALLBACK === "true" || (process.env.DEMO_FALLBACK !== "false" && IS_DEMO);
