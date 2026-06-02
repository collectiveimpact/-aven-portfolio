"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasBackend } from "@/lib/env";

/** Browser Supabase client. Null when the backend isn't configured. */
export function createClient() {
  if (!hasBackend) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
