// Compliance Score Sync Agent.
//
// Auto-pulls each provider's building-evaluation score from the open-data feeds
// (RentSafeTO live, Hamilton SAB configurable), averages them into a provider
// score, persists the latest into `compliance_scores`, and returns a summary.
// Invoked on demand (admin "Sync now" button) or on a schedule
// (/api/agents/compliance-sync).
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROVIDER_COMPLIANCE } from "@/lib/platform-admin";
import { fetchRentSafeScores, fetchHamiltonByAddress, COMPLIANCE_SOURCE_LABEL } from "./sources";

export type SyncStatus = "ok" | "partial" | "no_feed" | "error";
export type AddressSource = "portfolio" | "configured";
export interface ProviderSyncResult {
  provider: string;
  framework: string;
  score: number | null;
  matched: number;
  total: number;
  status: SyncStatus;
  source: string;
  addressSource: AddressSource;   // "portfolio" = pulled from the org's real properties
  buildings: { address: string; score: number | null }[];
}
export interface SyncSummary { syncedAt: string; live: boolean; results: ProviderSyncResult[] }

const avg = (xs: number[]): number | null => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

// Pull the real building addresses for an org from the properties table.
async function getOrgPropertyAddresses(supabase: SupabaseClient | null, orgId: string | null): Promise<string[]> {
  if (!supabase || !orgId) return [];
  const { data } = await supabase.from("properties").select("address").eq("org_id", orgId).limit(50);
  return (data ?? []).map((r) => (r as { address: string | null }).address).filter((a): a is string => !!a && a.trim().length > 0);
}

// Run the sync. `supabase` may be null (no persistence — still returns live pulls).
export async function runComplianceSync(supabase: SupabaseClient | null, orgId: string | null): Promise<SyncSummary> {
  const results: ProviderSyncResult[] = [];

  // Resolve the operator org's real portfolio so its provider entry scores its
  // ACTUAL buildings. Other (demo) providers fall back to their configured list.
  let operatorOrgName = "";
  if (supabase && orgId) {
    const { data } = await supabase.from("organizations").select("name").eq("id", orgId).single();
    operatorOrgName = (data as { name?: string } | null)?.name ?? "";
  }
  const portfolioAddresses = await getOrgPropertyAddresses(supabase, orgId);

  for (const p of PROVIDER_COMPLIANCE) {
    const isToronto = p.framework === "rentsafeto" || p.city.toLowerCase() === "toronto";
    // Use the org's real properties when this provider IS the operator org.
    const isOperatorOrg = !!operatorOrgName && operatorOrgName.toLowerCase().includes(p.provider.toLowerCase());
    const usePortfolio = isOperatorOrg && portfolioAddresses.length > 0;
    const addresses = usePortfolio ? portfolioAddresses : p.addresses;
    const addressSource: AddressSource = usePortfolio ? "portfolio" : "configured";
    let r: ProviderSyncResult;

    if (isToronto) {
      const got = await fetchRentSafeScores(addresses);
      const buildings = addresses.map((a, i) => ({ address: got[i]?.address ?? a, score: got[i]?.score ?? null }));
      const scores = got.map((g) => g?.score ?? null).filter((s): s is number => s != null);
      const score = avg(scores);
      const status: SyncStatus = scores.length === 0 ? "error" : scores.length < addresses.length ? "partial" : "ok";
      r = { provider: p.provider, framework: "rentsafeto", score, matched: scores.length, total: addresses.length, status, source: COMPLIANCE_SOURCE_LABEL.rentsafeto, addressSource, buildings };
    } else {
      // Hamilton SAB — only live if HAMILTON_COMPLIANCE_URL is configured.
      const got = await Promise.all(addresses.map((a) => fetchHamiltonByAddress(a)));
      const scores = got.filter(Boolean).map((g) => g!.score).filter((s): s is number => s != null);
      if (scores.length) {
        r = { provider: p.provider, framework: "hamilton-sab", score: avg(scores), matched: scores.length, total: addresses.length, status: scores.length < addresses.length ? "partial" : "ok", source: COMPLIANCE_SOURCE_LABEL["hamilton-sab"], addressSource, buildings: addresses.map((a, i) => ({ address: a, score: got[i]?.score ?? null })) };
      } else {
        // No public feed → keep the manually-entered baseline, flag as manual.
        r = { provider: p.provider, framework: "hamilton-sab", score: p.hamiltonScore, matched: 0, total: addresses.length, status: "no_feed", source: COMPLIANCE_SOURCE_LABEL["hamilton-sab"], addressSource, buildings: [] };
      }
    }
    results.push(r);

    if (supabase && orgId) {
      await supabase.from("compliance_scores").upsert(
        {
          org_id: orgId, provider_key: r.provider, framework: r.framework,
          score: r.score, matched: r.matched, total: r.total,
          source: r.source, status: r.status, raw: { buildings: r.buildings },
          synced_at: new Date().toISOString(),
        },
        { onConflict: "org_id,provider_key,framework" },
      );
    }
  }

  if (supabase && orgId) {
    const okCount = results.filter((r) => r.status === "ok" || r.status === "partial").length;
    await supabase.from("audit_log").insert({
      org_id: orgId, action: "Compliance Scores Synced",
      detail: `Pulled ${okCount}/${results.length} provider scores from open-data feeds`,
    });
  }

  return { syncedAt: new Date().toISOString(), live: true, results };
}

// Read the latest persisted scores for an org (used to hydrate the panel on load).
export async function getLatestComplianceScores(supabase: SupabaseClient | null, orgId: string | null) {
  if (!supabase || !orgId) return [] as { provider_key: string; framework: string; score: number | null; status: string; synced_at: string; source: string }[];
  const { data } = await supabase.from("compliance_scores").select("provider_key,framework,score,status,synced_at,source").eq("org_id", orgId);
  return data ?? [];
}
