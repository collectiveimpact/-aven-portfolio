import Composer from "./composer";
import { getComposeTemplates } from "@/lib/queries";

export default async function ComposePage() {
  const templates = await getComposeTemplates();
  return (
    <main className="f5-content">
      <div className="f5-page-title">Compose Broadcast</div>
      <div className="f5-page-sub">
        Build a multi-channel resident broadcast — start from a template, generate with AI, or write your own.
      </div>
      <Composer templates={templates} />
    </main>
  );
}
