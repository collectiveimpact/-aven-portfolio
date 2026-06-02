import { notFound } from "next/navigation";
import { getWorkOrder, getRecipientSummary } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canBroadcast } from "@/lib/rbac";
import { NoticeStudio } from "./studio";

export default async function WorkOrderStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wo = await getWorkOrder(id);
  if (!wo) notFound();
  const [recipients, me] = await Promise.all([getRecipientSummary(wo.propertyId), getCurrentUser()]);
  const canApprove = !!me?.role && canBroadcast(me.role);
  return <NoticeStudio wo={wo} recipients={recipients} canApprove={canApprove} />;
}
