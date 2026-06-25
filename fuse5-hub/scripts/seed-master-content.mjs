// Seed the Fuse5 Master Template Library (universal housing content templates)
// into an org's content library. Run after bootstrap, or per new provider.
//   SUPABASE_URL=… SERVICE_ROLE_KEY=… ORG_ID=… node scripts/seed-master-content.mjs
import { readFile } from "node:fs/promises";
import { join } from "node:path";
const here = import.meta.dirname;
const URL = process.env.SUPABASE_URL, KEY = process.env.SERVICE_ROLE_KEY, ORG = process.env.ORG_ID;
if (!URL || !KEY || !ORG) { console.error("Set SUPABASE_URL, SERVICE_ROLE_KEY, ORG_ID"); process.exit(1); }
// Real WoodGreen creatives mined from the NoviSign exports, plus the generated
// gap-filler templates. Dedupe by title (real wins), carry real type (notice/video).
const real = JSON.parse(await readFile(join(here, "woodgreen-content.json")));
const filler = JSON.parse(await readFile(join(here, "master-content.json")));
const seen = new Set(real.map((r) => r.title));
const rows = [
  ...real.map((r) => ({ title: r.title, type: r.type ?? "notice", duration: r.duration })),
  ...filler.filter((r) => !seen.has(r.title)).map((r) => ({ title: r.title, type: "notice", duration: r.duration })),
];
const body = rows.map((r) => ({ org_id: ORG, title: r.title, type: r.type, duration_s: r.duration }));
const res = await fetch(`${URL}/rest/v1/content_items`, {
  method: "POST",
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
  body: JSON.stringify(body),
});
console.log(res.ok ? `✓ seeded ${body.length} master templates` : `✗ ${res.status} ${await res.text()}`);
process.exit(res.ok ? 0 : 1);
