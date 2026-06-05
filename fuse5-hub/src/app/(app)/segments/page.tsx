import { getSegments, getProperties } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { SegmentBuilder } from "./segment-builder";

export default async function SegmentsPage() {
  const [segments, properties, me] = await Promise.all([getSegments(), getProperties(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;

  return (
    <main className="f5-content">
      <SegmentBuilder segments={segments} properties={properties} canEdit={canEdit} />
    </main>
  );
}
