import { notFound } from "next/navigation";
import { getWorkOrder, getRecipientSummary } from "@/lib/queries";
import { NoticeStudio } from "./studio";

export default async function WorkOrderStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wo = await getWorkOrder(id);
  if (!wo) notFound();
  const recipients = await getRecipientSummary(wo.propertyId);
  return <NoticeStudio wo={wo} recipients={recipients} />;
}
