import { getWoFieldConfig } from "@/lib/queries";
import { FieldConfig } from "./field-config";

export default async function WoFieldsPage() {
  const fields = await getWoFieldConfig();
  return <FieldConfig fields={fields} />;
}
