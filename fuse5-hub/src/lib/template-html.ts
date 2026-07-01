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
  { key: "accessib", accent: "#2563EB", soft: "#DBEAFE", emoji: "♿", cta: "Learn more", kicker: "Accessibility" },
  { key: "security", accent: "#B91C1C", soft: "#FEE2E2", emoji: "🔒", cta: "Safety information", kicker: "Security notice" },
  { key: "arrears", accent: "#FD5A19", soft: "#FFE9DF", emoji: "🤝", cta: "Get support", kicker: "We can help" },
  { key: "eviction", accent: "#B45309", soft: "#FEF3C7", emoji: "⚠️", cta: "Get support", kicker: "Important notice" },
  { key: "insurance", accent: "#0E7490", soft: "#CFF3F5", emoji: "🧾", cta: "Learn more", kicker: "Reminder" },
  { key: "amenit", accent: "#7C3AED", soft: "#EDE9FE", emoji: "🏸", cta: "Book now", kicker: "Amenities" },
  { key: "waste", accent: "#059669", soft: "#D1FAE5", emoji: "♻️", cta: "Learn more", kicker: "Operations" },
  { key: "leasing", accent: "#059669", soft: "#D1FAE5", emoji: "🔑", cta: "View details", kicker: "Leasing" },
  { key: "move", accent: "#059669", soft: "#D1FAE5", emoji: "📦", cta: "View details", kicker: "Leasing & move" },
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
  building: "WoodGreen — Danforth",
  office_phone: "416-645-6000",
  features: "ramps, automatic door buttons, and grab railings",
  deadline: "July 15",
  program: "the Community Kitchen program",
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

/** Darken a #RRGGBB hex toward black by `f` (0..1). */
function darken(hex: string, f: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

interface DetailRow { icon: string; label: string; value: string }
const SCHEDULE_THEMES = new Set(["emergency", "water", "heat", "elevator", "pest", "maintenance", "repair", "event", "community", "inspection"]);
const RENT_THEMES = new Set(["rent", "payment"]);

function detailRowsFor(themeKey: string, vars: Record<string, string>): DetailRow[] {
  if (RENT_THEMES.has(themeKey)) return [
    { icon: "💳", label: "Amount due", value: vars.amount },
    { icon: "📅", label: "Due date", value: vars.due_date },
    { icon: "🏠", label: "Residence", value: vars.property },
  ];
  if (SCHEDULE_THEMES.has(themeKey)) return [
    { icon: "📅", label: "Date", value: vars.date },
    { icon: "⏰", label: "Time", value: vars.time },
    { icon: "📍", label: "Location", value: vars.property },
  ];
  return [{ icon: "🏠", label: "Residence", value: vars.property }];
}

/** Full, self-contained branded HTML email — graphical hero, details panel, CTA. */
export function renderTemplateHtml(input: TemplatePreviewInput): string {
  const theme = themeForTemplate(input.category, input.name);
  const org = input.orgName || SAMPLE_VARS.org;
  const vars = { ...SAMPLE_VARS, ...(input.vars ?? {}) };
  const cta = (input.cta ?? theme.cta).trim();
  const bodyHtml = renderBody(input.body || "Your message content will appear here.", theme.accent, vars);
  const title = escapeHtml(input.name || "Resident notice");
  const deep = darken(theme.accent, 0.62);
  const initials = escapeHtml((org.match(/\b[A-Za-z]/g) || []).slice(0, 2).join("").toUpperCase() || "F5");

  // Decorative gradient hero: layered radial "orbs" over a two-tone brand gradient.
  const heroBg = `background:${theme.accent};background:radial-gradient(circle at 82% 18%, rgba(255,255,255,0.20), rgba(255,255,255,0) 42%),radial-gradient(circle at 12% 96%, rgba(255,255,255,0.14), rgba(255,255,255,0) 46%),linear-gradient(140deg, ${theme.accent} 0%, ${deep} 100%)`;

  const details = detailRowsFor(theme.key, vars).filter((d) => d.value && d.value.trim());
  const detailPanel = details.length ? `
      <tr><td style="padding:6px 30px 4px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.soft};border-radius:14px">
          <tr><td style="padding:14px 18px">
            ${details.map((d, i) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="width:26px;font-size:16px;vertical-align:middle">${d.icon}</td>
              <td style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${deep};vertical-align:middle">${escapeHtml(d.label)}</td>
              <td align="right" style="font-size:14px;font-weight:700;color:#0f172a;vertical-align:middle">${escapeHtml(d.value)}</td>
            </tr>${i < details.length - 1 ? `<tr><td colspan="3" style="padding:8px 0"><div style="height:1px;background:rgba(15,23,42,0.08)"></div></td></tr>` : ""}</table>`).join("")}
          </td></tr>
        </table>
      </td></tr>` : "";

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;padding:26px 12px;background:#eef2f7;font-family:'Figtree',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 18px 48px rgba(2,6,23,0.16)">

      <!-- GRAPHICAL HERO -->
      <tr><td style="${heroBg};padding:26px 30px 34px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="width:30px;height:30px;background:rgba(255,255,255,0.9);border-radius:8px;text-align:center;font-size:12px;font-weight:800;color:${deep};line-height:30px">${initials}</td>
              <td style="padding-left:10px;color:#ffffff;font-size:14px;font-weight:800;letter-spacing:.2px">${escapeHtml(org)}</td>
            </tr></table>
          </td>
          <td align="right" style="color:#ffffff;opacity:.85;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;vertical-align:middle">Resident Communications</td>
        </tr></table>

        <div style="text-align:center;padding-top:22px">
          <div style="display:inline-block;width:82px;height:82px;border-radius:24px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.35);text-align:center;line-height:82px;font-size:40px;box-shadow:0 8px 22px rgba(2,6,23,0.18)">${theme.emoji}</div>
          <div style="margin-top:16px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.9)">${escapeHtml(theme.kicker)}</div>
          <div style="margin-top:6px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;padding:0 8px;text-shadow:0 2px 10px rgba(2,6,23,0.18)">${title}</div>
        </div>
      </td></tr>

      <!-- GREETING + BODY -->
      <tr><td style="padding:26px 30px 4px">
        <p style="margin:0 0 14px;font-size:15px;color:#374151">Hi <strong style="color:#111827">${escapeHtml(vars.first_name)}</strong>,</p>
        ${bodyHtml}
      </td></tr>

      ${detailPanel}

      <!-- CTA -->
      ${cta ? `<tr><td align="center" style="padding:22px 30px 8px">
        <a href="#" style="display:inline-block;background:linear-gradient(135deg, ${theme.accent}, ${deep});color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 32px;border-radius:12px;box-shadow:0 10px 22px ${theme.accent}55">${escapeHtml(cta)}&nbsp;&nbsp;→</a>
      </td></tr>` : ""}

      <!-- CONTACT STRIP -->
      <tr><td style="padding:22px 30px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="border-top:1px solid #eceff3;padding-top:16px;font-size:12.5px;color:#6b7280;line-height:1.6">
            Questions about this notice? Contact <strong style="color:#374151">${escapeHtml(org)}</strong> at <a href="mailto:info@example.org" style="color:${theme.accent};font-weight:700;text-decoration:none">${escapeHtml(vars.contact)}</a>. Need this in another format (large print, translation, screen-reader)? Just reply and we'll help.
          </td>
        </tr></table>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:18px 30px 26px">
        <div style="background:#f8fafc;border-radius:14px;padding:16px 18px;text-align:center">
          <div style="font-size:11.5px;color:#9ca3af;line-height:1.7">
            You're receiving this as a resident of ${escapeHtml(org)}.<br/>
            <a href="#" style="color:${theme.accent};text-decoration:none;font-weight:600">Manage preferences</a> &nbsp;·&nbsp; <a href="#" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
          </div>
          <div style="margin-top:10px;font-size:12px;color:#94a3b8">Sent with care via <strong style="color:#009999">fuse<span style="color:#FD5A19">5</span></strong></div>
        </div>
      </td></tr>
    </table>
    <div style="height:22px"></div>
  </td></tr></table>
</body></html>`;
}
