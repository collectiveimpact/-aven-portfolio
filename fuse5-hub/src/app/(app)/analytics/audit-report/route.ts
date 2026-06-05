import { getAuditReport } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { buildSimplePdf, type PdfLine } from "@/lib/pdf";

const CHANNEL: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp", voice: "Voice", display: "Display" };

// GET /analytics/audit-report → a real downloadable PDF of the current
// Tenant Notification Audit, built from live delivery logs (RLS-scoped).
export async function GET() {
  const [audit, me] = await Promise.all([getAuditReport(), getCurrentUser()]);
  const org = me?.orgName ?? "WoodGreen Community Housing";
  const generated = new Date().toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

  const lines: PdfLine[] = [
    { text: org, size: 18, bold: true, gap: 24 },
    { text: `Tenant Notification Audit — ${audit.period}`, size: 13, bold: true, gap: 26 },

    { text: "Summary", size: 12, bold: true, gap: 20 },
    { text: `Total notifications sent:   ${audit.totalNotifications.toLocaleString()}`, gap: 16 },
    { text: `Delivered:                  ${audit.delivered.toLocaleString()}  (${audit.deliveryRatePct}%)`, gap: 16 },
    { text: `Signage proof-of-play:      ${audit.proofOfPlay.toLocaleString()} notices displayed`, gap: 16 },
    { text: `Tenant acknowledgements:    ${audit.acknowledgements.toLocaleString()}`, gap: 28 },

    { text: "Delivery by channel", size: 12, bold: true, gap: 20 },
    ...audit.byChannel.map((c): PdfLine => ({
      text: `${(CHANNEL[c.channel] ?? c.channel).padEnd(12)} sent ${c.sent.toLocaleString().padStart(7)}    delivered ${c.delivered.toLocaleString().padStart(7)}`,
      gap: 16,
    })),

    { text: "", gap: 24 },
    { text: `Data residency: ca-central-1   ·   Source: ${audit.source === "live" ? "live message / delivery logs" : "demo data"}`, size: 9, gap: 14 },
    { text: `Generated ${generated} · Fuse5 Hub`, size: 9, gap: 14 },
  ];

  const pdf = buildSimplePdf(lines);
  const filename = `audit-${audit.period.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
