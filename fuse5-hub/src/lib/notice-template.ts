// Isomorphic notice templates — shared by the WO Studio preview (client) and the
// real email send in publishNotice (server). No "server-only": both sides import
// it so the resident sees exactly what the preview showed. Pure string output,
// table + inline styles (the only thing email clients reliably render).

export interface NoticeTheme { emoji: string; color: string }
export const NOTICE_THEME: Record<string, NoticeTheme> = {
  water: { emoji: "💧", color: "#2563EB" },
  fire: { emoji: "🔥", color: "#DC2626" },
  elevator: { emoji: "🛗", color: "#7C3AED" },
  heat: { emoji: "🌡️", color: "#EA580C" },
  pest: { emoji: "🐜", color: "#059669" },
  default: { emoji: "📢", color: "#0E7490" },
};
export const themeFor = (cat: string | undefined): NoticeTheme => NOTICE_THEME[cat ?? "default"] ?? NOTICE_THEME.default;

export interface NoticeEmailInput {
  orgName: string;
  propertyName: string;
  title: string;
  subject?: string;
  body: string;
  cta?: string;
  dateText?: string;
  affected?: string;
  contactInfo?: string;
  imageCategory?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const para = (s: string) => escapeHtml(s).replace(/\n{2,}/g, "</p><p style=\"margin:0 0 14px\">").replace(/\n/g, "<br/>");

// Full branded HTML email. Self-contained (inline styles), 600px table shell.
export function renderNoticeEmailHtml(input: NoticeEmailInput): string {
  const theme = themeFor(input.imageCategory);
  const title = escapeHtml(input.title || input.subject || "Notice");
  const meta = [input.dateText, input.affected].map((x) => (x || "").trim()).filter(Boolean).map(escapeHtml).join(" &middot; ");
  const ctaHtml = input.cta?.trim()
    ? `<tr><td style="padding:4px 28px 24px"><a href="#" style="display:inline-block;background:${theme.color};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:8px">${escapeHtml(input.cta.trim())}</a></td></tr>`
    : "";
  const contactHtml = input.contactInfo?.trim()
    ? `<div style="margin-top:6px">Questions? ${escapeHtml(input.contactInfo.trim())}</div>` : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f4f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f4f8;padding:24px 0">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 1px 4px rgba(16,24,40,.08)">
  <tr><td style="background:${theme.color};padding:22px 28px;color:#ffffff">
    <table role="presentation" width="100%"><tr>
      <td style="font-size:13px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;opacity:.92">${escapeHtml(input.orgName)}</td>
      <td align="right" style="font-size:30px;line-height:1">${theme.emoji}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:26px 28px 6px">
    <div style="font-size:12px;font-weight:700;color:${theme.color};text-transform:uppercase;letter-spacing:.6px">${escapeHtml(input.propertyName)}</div>
    <h1 style="margin:6px 0 4px;font-size:23px;line-height:1.2;color:#0b0e14">${title}</h1>
    ${meta ? `<div style="font-size:13px;color:#667085">${meta}</div>` : ""}
  </td></tr>
  <tr><td style="padding:14px 28px 4px;font-size:15px;line-height:1.6;color:#344054">
    <p style="margin:0 0 14px">${para(input.body || "")}</p>
  </td></tr>
  ${ctaHtml}
  <tr><td style="padding:18px 28px 24px;border-top:1px solid #eaecf0;font-size:12px;color:#98a2b3">
    ${contactHtml}
    <div style="margin-top:6px">Sent by ${escapeHtml(input.orgName)} via Fuse5 Hub &middot; Data stored in ca-central-1</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
