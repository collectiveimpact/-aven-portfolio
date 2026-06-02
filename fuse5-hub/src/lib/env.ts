// Fuse5 Hub environment. The app runs WITHOUT these (demo data) so it is
// demoable immediately; set them to connect the real backend / providers.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasBackend = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Server-only provider keys (never exposed to the browser).
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
export const hasAI = Boolean(ANTHROPIC_API_KEY);
export const hasEmail = Boolean(RESEND_API_KEY);
