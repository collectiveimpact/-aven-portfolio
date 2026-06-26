import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

// Service-role client for trusted server-side paths that act WITHOUT a user
// session — e.g. the public survey-response endpoint (residents aren't logged in)
// and headless agents. Never import this into client code. Returns null when the
// service key isn't configured so callers can degrade gracefully.
export function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
