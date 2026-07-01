// Professional, branded HTML email renderer for the Template Library.
//
// Pure string output (client + server safe): the templates gallery previews it in
// an iframe, and it can back a real send. Self-contained inline styles + a 600px
// table shell — the only thing email clients reliably render — but styled to feel
// modern and on-brand (Aurora teal/coral), not like a 2005 newsletter.
//
// Category-aware theming picks an accent, emoji, and default CTA from the
// template's category/name so every notice type looks purpose-built.

export interface TemplateTheme {
  key: string;
  accent: string; // header + CTA colour
  soft: string; // tint behind the icon
  emoji: string;
  cta: string; // default call-to-action label
  kicker: string; // small label above the title
}

const THEMES: TemplateTheme[] = [
  { key: "emergency", accent: "#DC2626", soft: "#FEE2E2", emoji: "🚨", cta: "Safety information", kicker: "Emergency notice" },
  { key: "rent", accent: "#FD5A19", soft: "#FFE9DF", emoji: "💳", cta: "Pay rent", kicker: "Account notice" },
  { key: "payment", accent: "#FD5A19", soft: "#FFE9DF", emoji: "💳", cta: "Make a payment", kicker: "Account notice" },
  { key: "water", accent: "#2563EB", soft: "#DBEAFE", emoji: "💧", cta: "Learn more", kicker: "Service notice" },
  { key: "heat", accent: "#EA580C", soft: "#FFEDD5", emoji: "🌡️", cta: "Learn more", kicker: "Service notice" },
  { key: "elevator", accent: "#7C3AED", soft: "#EDE9FE", emoji: "🛗", cta: "Learn more", kicker: "Service notice" },
  { key: "pest", accent: "#059669", soft: "#D1FAE5", emoji: "🐜", cta: "Preparation steps", kicker: "Service notice" },
  { key: "maintenance", accent: "#009999", soft: "#D5F5F5", emoji: "🔧", cta: "View details", kicker: "Maintenance notice" },
  { key: "repair", accent: "#009999", soft: "#D5F5F5", emoji: "🔧", cta: "View details", kicker: "Maintenance notice" },
  { key: "event", accent: "#7C3AED", soft: "#EDE9FE", emoji: "🎉", cta: "RSVP", kicker: "Community" },
  { key: "community", accent: "#7C3AED", soft: "#EDE9FE", emoji: "🎉", cta: "RSVP", kicker: "Community" },
  { key: "welcome", accent: "#059669", soft: "#D1FAE5", emoji: "👋", cta: "Get started", kicker: "Welcome" },
  { key: "survey", accent: "#00A3A3", soft: "#D5F5F5", emoji: "📋", cta: "Take the survey", kicker: "We want your input" },
  { key: "inspection", accent: "#0E7490", soft: "#CFF3F5", emoji: "🛡️", cta: "View details", kicker: "Compliance notice" },
];
const DEFAULT_THEME: TemplateTheme = { key: "general", accent: "#009999", soft: "#D5F5F5", emoji: "📢", cta: "Read more", kicker: "Resident notice" };

/** Pick a theme from category + name keywords. */
export function themeForTemplate(category: string, name = ""): TemplateTheme {
  const hay = `${category} ${name}`.toLowerCase();
  return THEMES.find((t) => hay.includes(t.key)) ?? DEFAULT_THEME;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Sample values used to fill {{placeholders}} in the preview. */
export const SAMPLE_VARS: Record<string, string> = {
  name: "Jordan Rivera",
  resident_name: "Jordan Rivera",
  first_name: "Jordan",
  unit: "Unit 412",
  property: "WoodGreen — Danforth",
  date: "Saturday, July 12",
  time: "9:00 AM – 12:00 PM",
  amount: "$1,240.00",
  due_date: "July 1",
  org: "WoodGreen Community Housing",
  contact: "416-555-0142",
};

/**
 * Render the body: escape the raw text ONCE, then swap {{placeholders}} for HTML
 * (known vars → bold sample value, unknown → a subtle accent chip), and turn blank
 * lines into paragraphs. Placeholders survive escaping (no HTML-special chars),
 * so this order is safe and never corrupts ordinary body words.
 */
function renderBody(body: string, accent: string, vars: Record<string, string>): string {
  const filled = escapeHtml(body).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key.toLowerCase()];
    if (v != null) return `<strong style="color:#111827">${escapeHtml(v)}</strong>`;
    return `<span style="display:inline-block;background:${accent}1a;color:${accent};font-weight:600;font-size:12px;padding:1px 7px;border-radius:6px">{{${escapeHtml(key)}}}</span>`;
  });
  const paras = filled.split(/\n{2,}/).map((p) => p.replace(/\n/g, "<br/>"));
  return paras.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151">${p}</p>`).join("");
}

export interface TemplatePreviewInput {
  name: string;
  category: string;
  body: string;
  orgName?: string;
  cta?: string;
  vars?: Record<string, string>;
}

/** Full, self-contained branded HTML email for one template. */
export function renderTemplateHtml(input: TemplatePreviewInput): string {
  const theme = themeForTemplate(input.category, input.name);
  const org = input.orgName || SAMPLE_VARS.org;
  const vars = { ...SAMPLE_VARS, ...(input.vars ?? {}) };
  const cta = (input.cta ?? theme.cta).trim();
  const bodyHtml = renderBody(input.body || "Your message content will appear here.", theme.accent, vars);
  const title = escapeHtml(input.name || "Resident notice");

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:'Figtree',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,0.08)">
      <tr><td style="background:linear-gradient(135deg,${theme.accent},${theme.accent}cc);padding:20px 28px">
        <table role="presentation" width="100%"><tr>
          <td style="color:#ffffff;font-size:15px;font-weight:800;letter-spacing:.3px">${escapeHtml(org)}</td>
          <td align="right" style="color:#ffffff;opacity:.9;font-size:12px;font-weight:600">Resident Communications</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:30px 28px 6px">
        <table role="presentation"><tr>
          <td style="width:52px;vertical-align:top">
            <div style="width:46px;height:46px;border-radius:12px;background:${theme.soft};text-align:center;line-height:46px;font-size:24px">${theme.emoji}</div>
          </td>
          <td style="padding-left:14px;vertical-align:top">
            <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${theme.accent}">${escapeHtml(theme.kicker)}</div>
            <div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.25;margin-top:3px">${title}</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:18px 28px 4px">${bodyHtml}</td></tr>
      ${cta ? `<tr><td style="padding:8px 28px 26px"><a href="#" style="display:inline-block;background:${theme.accent};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px">${escapeHtml(cta)} →</a></td></tr>` : ""}
      <tr><td style="padding:0 28px"><div style="height:1px;background:#e5e7eb"></div></td></tr>
      <tr><td style="padding:16px 28px 4px">
        <table role="presentation" width="100%"><tr>
          <td style="font-size:12px;color:#6b7280;line-height:1.5">
            <strong style="color:#374151">${escapeHtml(vars.property)}</strong><br/>
            Questions? Contact your housing office at <span style="color:${theme.accent}">${escapeHtml(vars.contact)}</span>.
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 28px 24px">
        <div style="font-size:11px;color:#9ca3af;line-height:1.6">
          You're receiving this because you're a resident of ${escapeHtml(org)}.
          &nbsp;·&nbsp; <a href="#" style="color:#9ca3af;text-decoration:underline">Manage preferences</a>
          &nbsp;·&nbsp; <a href="#" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a><br/>
          Sent with care via <strong style="color:#009999">fuse<span style="color:#FD5A19">5</span></strong>.
        </div>
      </td></tr>
    </table>
    <div style="height:20px"></div>
  </td></tr></table>
</body></html>`;
}
