import "server-only";
import { redirect } from "next/navigation";
import { getPortalSession, type PortalSession } from "./session";
import { getResident, type ResidentRow } from "./data";

/**
 * Resolve the current resident for an authenticated portal page. Redirects to
 * the portal sign-in if there is no valid session or the resident no longer
 * resolves (e.g. moved out / session points at a stale id).
 */
export async function requireResident(): Promise<{ session: PortalSession; resident: ResidentRow }> {
  const session = await getPortalSession();
  if (!session) redirect("/portal/signin");
  const resident = await getResident(session);
  if (!resident) redirect("/portal/signin");
  return { session, resident };
}
