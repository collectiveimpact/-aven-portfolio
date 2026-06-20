// One-time production bootstrap: create the FIRST organization + the FIRST
// Fuse5 super-admin, against a fresh cloud Supabase project that already has
// migrations 0001–0011 applied. No demo data — real orgs onboard after this.
// Plain fetch (PostgREST + GoTrue admin), no SDK.
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co \
//   SERVICE_ROLE_KEY=eyJ... \
//   ORG_NAME="Fuse5" ORG_SLUG=fuse5 \
//   ADMIN_EMAIL=you@fuse5.ca ADMIN_PASSWORD='change-me-strong' ADMIN_NAME="Your Name" \
//   node scripts/bootstrap-prod.mjs

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SERVICE_ROLE_KEY;
const ORG_NAME = process.env.ORG_NAME || "Fuse5";
const ORG_SLUG = process.env.ORG_SLUG || "fuse5";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || "Fuse5 Admin";

if (!URL || !KEY) { console.error("Set SUPABASE_URL and SERVICE_ROLE_KEY"); process.exit(1); }
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) { console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD"); process.exit(1); }
if (ADMIN_PASSWORD.length < 10) { console.error("ADMIN_PASSWORD must be at least 10 characters."); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(method, path, body, prefer) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method, headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 404) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res;
}
const upsert = (t, rows, onConflict) =>
  rest("POST", onConflict ? `${t}?on_conflict=${onConflict}` : t, rows, "resolution=merge-duplicates,return=representation");

async function main() {
  // 1. First organization (idempotent on slug).
  const orgRes = await upsert("organizations", [{ name: ORG_NAME, slug: ORG_SLUG, region: "ca-central-1" }], "slug");
  const org = (await orgRes.json())[0];
  const orgId = org.id;
  console.log(`✓ org: ${ORG_NAME} (${orgId})`);

  // 2. First super-admin auth user (create or find).
  let userId;
  const create = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST", headers: H,
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true }),
  });
  if (create.ok) {
    userId = (await create.json()).id;
    console.log(`✓ created auth user ${ADMIN_EMAIL}`);
  } else {
    const list = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: H });
    const data = await list.json();
    userId = (data.users ?? data).find((u) => u.email === ADMIN_EMAIL)?.id;
    console.log(`• auth user ${ADMIN_EMAIL} already exists`);
  }
  if (!userId) throw new Error("Could not create or find the admin user.");

  // 3. Profile + super_admin membership.
  await upsert("profiles", [{ id: userId, full_name: ADMIN_NAME, email: ADMIN_EMAIL }], "id");
  await upsert("org_members", [{ org_id: orgId, user_id: userId, role: "super_admin" }], "org_id,user_id");

  console.log(`✓ ${ADMIN_NAME} is super_admin of ${ORG_NAME}`);
  console.log(`\nDone. Sign in at your deployed URL as ${ADMIN_EMAIL}. Onboard real providers from Admin → All Providers.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(String(e)); process.exit(1); });
