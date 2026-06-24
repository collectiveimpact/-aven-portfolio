# Compliance Score Auto-Sync

Pulls each provider's building-evaluation score from open data and benchmarks
providers against the platform average. Surfaced in **Admin → Compliance
Settings** (super/admin).

## Data sources

| Framework | Source | Status |
|-----------|--------|--------|
| **RentSafeTO** | City of Toronto Open Data — *RentSafeTO Building Current Score* (ArcGIS Feature Server, `cot_geospatial8/6`, field `CURRENT_BUILDING_EVAL_SCORE`, refreshed daily) | **Live** — no key required |
| **Hamilton SAB** | Configurable (`HAMILTON_COMPLIANCE_URL`) | Manual until a public per-building feed is connected (Hamilton does not publish one today) |

## How scoring works

For each provider the agent:
1. Reads the provider org's **real building addresses from the `properties` table** (falls back to a configured address list if the org has no properties).
2. Queries the open-data feed per address and reads each building's score.
3. Averages the matched buildings into a **provider score**.
4. Persists to `compliance_scores` (one row per org/provider/framework) and writes an audit entry.

The **platform average** of all provider scores is the benchmark; each provider shows a ▲/▼ delta to it, coloured against each framework's green/yellow thresholds.

## Running it

### On demand (UI)
Admin → Compliance Settings → **⟳ Sync from Open Data**.

### Automatically (daily)
The agent endpoint is `POST /api/agents/compliance-sync`.

**Auth:** send `Authorization: Bearer $CRON_SECRET`. In that mode the agent uses
the service-role key and the `COMPLIANCE_SYNC_ORG_ID` (or `?org=<uuid>`) org.

**Required env (production):**
```
SUPABASE_SERVICE_ROLE_KEY=<service role key>
CRON_SECRET=<a long random string>
COMPLIANCE_SYNC_ORG_ID=<the operator org uuid>     # or pass ?org= per call
HAMILTON_COMPLIANCE_URL=<optional Hamilton feed>   # leave unset → Hamilton stays manual
```

**Schedule — pick one:**

- **Vercel:** [`vercel.json`](./vercel.json) already declares a daily cron
  (`0 6 * * *`). Set `CRON_SECRET` in the project's env vars — Vercel
  automatically attaches `Authorization: Bearer $CRON_SECRET` to cron calls.

- **Any host (GitHub Actions):** [`.github/workflows/compliance-sync.yml`](./.github/workflows/compliance-sync.yml)
  curls the endpoint daily. Add repo secrets `APP_BASE_URL` and `CRON_SECRET`.

- **Self-hosted cron:**
  ```
  0 6 * * *  curl -fsS -X POST https://YOUR_APP/api/agents/compliance-sync \
               -H "Authorization: Bearer $CRON_SECRET"
  ```

### Verify a run
```
curl -s -X POST http://localhost:3000/api/agents/compliance-sync \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```
Returns `{ ok, mode, summary: { syncedAt, results:[{ provider, score, matched/total, status, addressSource, buildings }] } }`.
`addressSource: "portfolio"` means the score came from the org's real properties.
