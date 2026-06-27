import { requireResident } from "@/lib/portal/guard";
import { getProperty, getMyNotices } from "@/lib/portal/data";
import { hasAI } from "@/lib/env";
import { AskChat } from "./ask-chat";

export default async function PortalAskPage() {
  const { session, resident } = await requireResident();
  const [property, notices] = await Promise.all([
    getProperty(session, resident.property_id),
    getMyNotices(session),
  ]);

  // Ground the assistant in this resident's building + a few recent notices.
  // No other resident's data is included — only this resident's own context.
  const recent = notices.slice(0, 5).map((n) => `- ${n.subject}: ${n.body}`).join("\n");
  const context = [
    property ? `Building: ${property.name}${property.address ? ` (${property.address})` : ""}` : null,
    resident.unit ? `Resident's unit: ${resident.unit}` : null,
    recent ? `Recent notices sent to this resident:\n${recent}` : "No recent notices on file.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 className="f5-portal-h1">Ask a question</h1>
        <p className="f5-portal-sub">Get quick help about your home and community.</p>
      </div>
      <AskChat context={context} hasAI={hasAI} />
    </div>
  );
}
