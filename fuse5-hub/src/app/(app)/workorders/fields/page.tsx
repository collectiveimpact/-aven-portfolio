import { getWoFieldConfig } from "@/lib/queries";
import { NOTICE_TYPES } from "@/lib/wo-fields";
import { FieldConfig } from "./field-config";

export default async function WoFieldsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const noticeType = NOTICE_TYPES.find((t) => t.key === type)?.key ?? "general";
  const fields = await getWoFieldConfig(noticeType);
  return <FieldConfig key={noticeType} fields={fields} noticeType={noticeType} />;
}
