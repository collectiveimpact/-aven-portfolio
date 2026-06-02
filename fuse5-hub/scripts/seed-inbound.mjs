// Seed inbound resident messages (Inbox). Idempotent-ish: wipes org inbound then inserts.
// Usage: SUPABASE_URL=... SERVICE_ROLE_KEY=... node scripts/seed-inbound.mjs
const URL = process.env.SUPABASE_URL, KEY = process.env.SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("Set SUPABASE_URL and SERVICE_ROLE_KEY"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const ORG = "00000000-0000-0000-0000-0000000000a1";

const residents = await (await fetch(`${URL}/rest/v1/residents?org_id=eq.${ORG}&select=id,name&limit=6`, { headers: H })).json();
await fetch(`${URL}/rest/v1/inbound_messages?org_id=eq.${ORG}`, { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } });

const samples = [
  { channel: "sms", body: "Is the water back on yet? Unit 204.", status: "open" },
  { channel: "email", subject: "Re: Water shutoff", body: "Thanks for the heads up — will the laundry room be affected?", status: "awaiting" },
  { channel: "whatsapp", body: "My fob stopped working at the Danforth entrance.", status: "open" },
  { channel: "sms", body: "Got it, thanks!", status: "resolved" },
  { channel: "email", subject: "Parking", body: "Can I get a visitor parking pass for the weekend?", status: "open" },
];
const rows = samples.map((s, i) => ({ org_id: ORG, resident_id: residents[i]?.id ?? null, channel: s.channel, subject: s.subject ?? null, body: s.body, status: s.status }));
const res = await fetch(`${URL}/rest/v1/inbound_messages`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(rows) });
console.log(res.ok ? `Seeded ${rows.length} inbound messages` : `FAILED ${res.status} ${await res.text()}`);
