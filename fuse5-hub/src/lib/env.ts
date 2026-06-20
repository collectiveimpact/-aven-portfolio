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
export const hasAI = Boolean(ANTHROPIC_API_KEY);
export const hasEmail = Boolean(RESEND_API_KEY);
export const hasSms = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM);

// Demo affordances (prefilled login creds, demo hints). ON for local/dev; OFF in
// production unless NEXT_PUBLIC_DEMO=true is set explicitly. Client-safe flag.
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "true" || process.env.NODE_ENV !== "production";
