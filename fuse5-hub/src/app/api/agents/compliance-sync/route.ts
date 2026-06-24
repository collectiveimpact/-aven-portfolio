import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";
import { runComplianceSync } from "@/lib/compliance/agent";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, COMPLIANCE_SYNC_ORG_ID } from "@/lib/env";

// Compliance Score Sync Agent — HTTP entrypoint.
//
// Two ways to invoke:
//  1. Headless / scheduled: `Authorization: Bearer $CRON_SECRET`. Uses the
//     service-role key and COMPLIANCE_SYNC_ORG_ID (or ?org=) to write. Point a
//     cron (Vercel Cron, GitHub Action, etc.) at this route to auto-pull daily.
//  2. Authenticated admin: a logged-in org_admin/super_admin session. Syncs
//     for their own org.
async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const orgParam = req.nextUrl.searchParams.get("org") || undefined;

  // Headless path (cron).
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) {
    const orgId = orgParam || COMPLIANCE_SYNC_ORG_ID;
    if (!orgId) return NextResponse.json({ ok: false, error: "Set COMPLIANCE_SYNC_ORG_ID or pass ?org=" }, { status: 400 });
    if (!SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 400 });
    const admin = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const summary = await runComplianceSync(admin, orgId);
    return NextResponse.json({ ok: true, mode: "cron", summary });
  }

  // Authenticated-admin path.
  const me = await getCurrentUser();
  if (!me?.orgId || !me.role || !canAdmin(me.role)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const supabase = await createServerClient();
  const summary = await runComplianceSync(supabase, me.orgId);
  return NextResponse.json({ ok: true, mode: "session", summary });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
