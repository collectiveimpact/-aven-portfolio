// SafeArrival environment. The app runs WITHOUT these (falls back to demo seed
// data) so it is demoable immediately; set them to connect its own Supabase.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True only when SafeArrival's own backend is configured. */
export const hasBackend = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
