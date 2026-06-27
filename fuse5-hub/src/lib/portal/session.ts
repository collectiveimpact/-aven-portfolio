import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env";

// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE RESIDENT AUTH — read this before trusting it in production.
//
// This is a DEMO-GRADE resident identity layer. A resident proves who they are
// with a light email + (last-name OR unit) check, and we then issue a signed,
// httpOnly cookie carrying their resident id + org id. Every portal query/action
// resolves the current resident from that cookie and scopes a SERVICE-ROLE
// Supabase client STRICTLY to `residentId` / `orgId` (see lib/portal/data.ts).
//
// PRODUCTION REQUIREMENTS (not done here):
//   • Real resident authentication (magic-link / OTP / SSO) — never a guessable
//     "email + last name" check, which is effectively public knowledge.
//   • Postgres RLS keyed to the authenticated resident (a `resident` JWT claim),
//     so the database — not just this app code — enforces row isolation. Today
//     the service-role client BYPASSES RLS, so the ONLY thing standing between
//     one resident and another's data is the manual `.eq("...", residentId)` /
//     `.eq("org_id", orgId)` filters in data.ts. Those filters are mandatory on
//     every query. Never hand the raw admin client to portal code without them.
//   • A real signing secret (see PORTAL_SESSION_SECRET below) set in the env.
// ─────────────────────────────────────────────────────────────────────────────

const COOKIE_NAME = "fuse5-portal-session";
const MAX_AGE_S = 60 * 60 * 24 * 14; // 14 days

// HMAC secret for the session cookie. We reuse the service-role key as the
// signing secret so the prototype "just works" with the keys already present;
// production should set a dedicated PORTAL_SESSION_SECRET. The cookie is httpOnly
// and signed, so a resident cannot forge a session for another resident id.
function secret(): string {
  return process.env.PORTAL_SESSION_SECRET || SUPABASE_SERVICE_ROLE_KEY || "fuse5-portal-dev-secret";
}

export interface PortalSession {
  residentId: string;
  orgId: string;
  name: string;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(session: PortalSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string | undefined): PortalSession | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  // Constant-time compare to reject tampered/forged cookies.
  const expected = sign(payload);
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PortalSession;
    if (!obj?.residentId || !obj?.orgId) return null;
    return obj;
  } catch {
    return null;
  }
}

/** Read + verify the current resident session from the signed httpOnly cookie. */
export async function getPortalSession(): Promise<PortalSession | null> {
  const store = await cookies();
  return decode(store.get(COOKIE_NAME)?.value);
}

/** Issue a signed httpOnly session cookie for a verified resident. */
export async function setPortalSession(session: PortalSession): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encode(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/portal",
    maxAge: MAX_AGE_S,
  });
}

/** Clear the resident session (sign out). */
export async function clearPortalSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
