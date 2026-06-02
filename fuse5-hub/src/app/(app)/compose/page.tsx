import Composer from "./composer";

export default async function ComposePage() {
  return (
    <main className="f5-content">
      <div className="f5-page-title">Compose Broadcast</div>
      <div className="f5-page-sub">
        Build a multi-channel resident broadcast — pick channels, target segments, and send or schedule.
      </div>
      <Composer />
    </main>
  );
}
