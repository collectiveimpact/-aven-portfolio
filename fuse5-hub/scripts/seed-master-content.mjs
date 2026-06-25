// Seed the Fuse5 Master Template Library (universal housing content templates)
// into an org's content library. Run after bootstrap, or per new provider.
//   SUPABASE_URL=… SERVICE_ROLE_KEY=… ORG_ID=… node scripts/seed-master-content.mjs
import { readFile } from "node:fs/promises";
const URL = process.env.SUPABASE_URL, KEY = process.env.SERVICE_ROLE_KEY, ORG = process.env.ORG_ID;
if (!URL || !KEY || !ORG) { console.error("Set SUPABASE_URL, SERVICE_ROLE_KEY, ORG_ID"); process.exit(1); }
const rows = JSON.parse(await readFile(new URL("./master-content.json", import.meta.url)));
const body = rows.map((r) => ({ org_id: ORG, title: r.title, type: "notice", duration_s: r.duration }));
const res = await fetch(`${URL}/rest/v1/content_items`, {
  method: "POST",
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
  body: JSON.stringify(body),
});
console.log(res.ok ? `✓ seeded ${body.length} master templates` : `✗ ${res.status} ${await res.text()}`);
process.exit(res.ok ? 0 : 1);
