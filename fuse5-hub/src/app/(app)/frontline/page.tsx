import { getProperties } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { FrontlineForm } from "./frontline-form";

// Frontline submit — simplified maintenance-request entry for day-to-day staff.
export default async function FrontlineSubmitPage() {
  const [properties, me] = await Promise.all([getProperties(), getCurrentUser()]);
  const canSubmit = !!me?.role && (canPublish(me.role) || me.role === "frontline" || me.role === "property_manager");

  return (
    <main className="f5-content">
      <div className="f5-page-title">Submit a Request</div>
      <div className="f5-page-sub">Report a maintenance issue. It enters the Work Order queue for triage.</div>
      <FrontlineForm properties={properties} canSubmit={canSubmit} />
    </main>
  );
}
