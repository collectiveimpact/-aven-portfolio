import { getTemplates } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { TemplatesTable } from "./templates-table";

export default async function TemplatesPage() {
  const [templates, me] = await Promise.all([getTemplates(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;
  const mandatoryCount = templates.filter((t) => t.mandatory).length;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Template Library</div>
      <div className="f5-page-sub">
        Master (Fuse5-managed) and organization templates. {templates.length} total · {mandatoryCount} mandatory.
      </div>

      <TemplatesTable templates={templates} canEdit={canEdit} />
    </main>
  );
}
