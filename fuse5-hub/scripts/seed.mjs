// Seed WoodGreen demo data + a demo auth user into local Supabase.
// Uses plain fetch (PostgREST + GoTrue admin) — no SDK, no WebSocket needed.
// Usage: SUPABASE_URL=... SERVICE_ROLE_KEY=... node scripts/seed.mjs
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("Set SUPABASE_URL and SERVICE_ROLE_KEY"); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const ORG = "00000000-0000-0000-0000-0000000000a1";
const DEMO_EMAIL = "clinton@fuse5.ca";
const DEMO_PASSWORD = "demo12345";

async function rest(method, path, body, prefer) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method, headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 404) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res;
}
const insert = (t, rows) => rest("POST", t, rows, "return=minimal");
const upsert = (t, rows, onConflict) =>
  rest("POST", onConflict ? `${t}?on_conflict=${onConflict}` : t, rows, "resolution=merge-duplicates,return=minimal");
const wipe = (t) => rest("DELETE", `${t}?org_id=eq.${ORG}`, undefined, "return=minimal");

async function main() {
  await upsert("organizations", [{ id: ORG, name: "WoodGreen Community Housing", slug: "woodgreen", region: "Toronto" }], "id");

  for (const t of ["message_recipients","messages","work_orders","displays","content_items","surveys","compliance_items","calendar_events","segments","contacts","residents","properties","templates","audit_log"]) {
    await wipe(t);
  }

  const props = [
    { id: "00000000-0000-0000-0000-0000000000d1", org_id: ORG, name: "WoodGreen — Danforth", address: "1004 Danforth Ave", units: 142 },
    { id: "00000000-0000-0000-0000-0000000000d2", org_id: ORG, name: "WoodGreen — East York", address: "850 Coxwell Ave", units: 98 },
    { id: "00000000-0000-0000-0000-0000000000d3", org_id: ORG, name: "WoodGreen — Riverdale", address: "55 Boulton Ave", units: 76 },
  ];
  await insert("properties", props);

  const langs = ["en","fr","es","zh","pt"];
  const names = ["Amara Johnson","Liam Chen","Sofia Rossi","Noah Williams","Maya Patel","Omar Haddad","Grace Kim","Ethan Brown","Lucia Mendez","Aisha Mohammed","Daniel Park","Chloe Tremblay"];
  await insert("residents", Array.from({ length: 24 }).map((_, i) => ({
    org_id: ORG, property_id: props[i % 3].id, unit: `${100 + i}`,
    name: names[i % 12] + (i >= 12 ? ` ${Math.floor(i / 12) + 1}` : ""),
    email: `resident${i + 1}@example.org`, phone: `416-555-${String(1000 + i)}`,
    language: langs[i % langs.length], status: i % 9 === 0 ? "moved_out" : "active",
  })));

  await insert("templates", [
    { org_id: ORG, name: "Emergency Evacuation", category: "Emergency", channels: ["display","sms","email"], mandatory: true, version: "2.1", body: "Evacuate now via nearest exit." },
    { org_id: ORG, name: "Water Shutoff", category: "Maintenance", channels: ["display","sms","email"], mandatory: true, version: "1.8", body: "Water will be shut off {{date}} {{time}}." },
    { org_id: ORG, name: "Monthly Newsletter", category: "Community", channels: ["email"], mandatory: false, version: "3.0", body: "This month at {{property}}…" },
    { org_id: ORG, name: "Rent Reminder", category: "Billing", channels: ["email","sms"], mandatory: false, version: "1.2", body: "Friendly reminder: rent is due {{date}}." },
  ]);

  const cats = ["Plumbing","Electrical","HVAC","Pest","General"], prio = ["low","medium","high","urgent"], stat = ["open","in_progress","resolved"];
  await insert("work_orders", Array.from({ length: 14 }).map((_, i) => ({
    org_id: ORG, property_id: props[i % 3].id, unit: `${200 + i}`,
    title: `${cats[i % 5]} issue — unit ${200 + i}`, category: cats[i % 5], priority: prio[i % 4], status: stat[i % 3],
  })));

  await insert("displays", Array.from({ length: 12 }).map((_, i) => ({
    org_id: ORG, property_id: props[i % 3].id, name: `Lobby Display ${i + 1}`,
    location: ["Main Lobby","Elevator A","Mailroom","Community Room"][i % 4],
    status: i % 7 === 0 ? "offline" : i % 5 === 0 ? "warning" : "online",
  })));

  await insert("surveys", [
    { org_id: ORG, title: "Annual Resident Satisfaction", status: "live", sent: 1284, responses: 842 },
    { org_id: ORG, title: "Maintenance Response Feedback", status: "closed", sent: 410, responses: 268 },
  ]);
  await insert("compliance_items", [
    { org_id: ORG, property_id: props[0].id, kind: "RentSafeTO Audit", due: "2026-06-20", status: "due_soon" },
    { org_id: ORG, property_id: props[1].id, kind: "Fire Inspection", due: "2026-05-10", status: "overdue" },
    { org_id: ORG, property_id: props[2].id, kind: "Elevator Cert", due: "2026-09-01", status: "compliant" },
  ]);
  await insert("contacts", [
    { org_id: ORG, name: "Tom Bradley", role: "Property Manager", email: "t.bradley@woodgreen.org", phone: "416-555-2001", property: "Danforth" },
    { org_id: ORG, name: "Maria Rodriguez", role: "Comms Manager", email: "m.rodriguez@woodgreen.org", phone: "416-555-2002", property: "All" },
  ]);
  await insert("segments", [
    { org_id: ORG, name: "All Residents", rule: { all: true }, size: 316 },
    { org_id: ORG, name: "Arrears > 30 days", rule: { arrears_days: 30 }, size: 42 },
    { org_id: ORG, name: "French speakers", rule: { language: "fr" }, size: 58 },
  ]);
  await insert("calendar_events", [
    { org_id: ORG, title: "June Newsletter", day: "2026-06-05", channel: "email", status: "scheduled" },
    { org_id: ORG, title: "Fire drill notice", day: "2026-06-12", channel: "multi", status: "scheduled" },
  ]);

  // Demo auth user
  let userId;
  const create = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST", headers: H,
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true }),
  });
  if (create.ok) {
    userId = (await create.json()).id;
  } else {
    const list = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: H });
    const data = await list.json();
    userId = (data.users ?? data).find((u) => u.email === DEMO_EMAIL)?.id;
  }
  if (userId) {
    await upsert("profiles", [{ id: userId, full_name: "Clinton Reid", email: DEMO_EMAIL }], "id");
    await upsert("org_members", [{ org_id: ORG, user_id: userId, role: "org_admin" }], "org_id,user_id");
  }

  console.log(`Seeded WoodGreen (24 residents) + demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD} (uid: ${userId ?? "?"})`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(String(e)); process.exit(1); });
