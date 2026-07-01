// Digital-signage template renderer — the DISPLAY-channel counterpart to the
// email renderer (lib/template-html.ts). Reproduces WoodGreen's real signage
// design system (TechTAP/HSC InSite): 16:9 landscape, a slate chrome bar with a
// LIVE clock + weather + building-manager contact, category-colour coding, the
// two master layouts (full-bleed photo + giant headline, and split colour-panel +
// photo), bilingual support, and the org "people" mark.
//
// Pure string output (client + server safe) so the Displays/Content library can
// preview it in an iframe. Uses web fonts (Oswald/Archivo) — fine for the display
// channel, which renders on kiosks/browsers, not email clients.

export interface SignageTheme { key: string; color: string; kicker: string }
const SIGN_THEMES: SignageTheme[] = [
  { key: "emergency", color: "#C0392B", kicker: "Alert" },
  { key: "alert", color: "#C0392B", kicker: "Alert" },
  { key: "safety", color: "#C0392B", kicker: "Safety" },
  { key: "security", color: "#8E1B13", kicker: "Security" },
  { key: "pest", color: "#E08A1E", kicker: "Operations" },
  { key: "operations", color: "#E08A1E", kicker: "Operations" },
  { key: "waste", color: "#B7791F", kicker: "Operations" },
  { key: "water", color: "#1F6FB2", kicker: "Service notice" },
  { key: "elevator", color: "#6D28D9", kicker: "Service notice" },
  { key: "maintenance", color: "#1F6FB2", kicker: "Maintenance" },
  { key: "financial", color: "#1F3A4D", kicker: "Financial" },
  { key: "rent", color: "#1F3A4D", kicker: "Financial" },
  { key: "community", color: "#4E7D2C", kicker: "Community" },
  { key: "social", color: "#7C3AED", kicker: "Community" },
  { key: "event", color: "#7C3AED", kicker: "Community" },
  { key: "fun", color: "#7C3AED", kicker: "Engagement" },
  { key: "health", color: "#0E7A6B", kicker: "Wellness" },
  { key: "welcome", color: "#4E7D2C", kicker: "Welcome" },
  { key: "leasing", color: "#4E7D2C", kicker: "Leasing" },
  { key: "amenit", color: "#6D28D9", kicker: "Amenities" },
  { key: "accessib", color: "#1F6FB2", kicker: "Accessibility" },
];
const SIGN_DEFAULT: SignageTheme = { key: "general", color: "#1F3A4D", kicker: "Notice" };

export function signageTheme(category: string, headline = ""): SignageTheme {
  const hay = `${category} ${headline}`.toLowerCase();
  return SIGN_THEMES.find((t) => hay.includes(t.key)) ?? SIGN_DEFAULT;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const darken = (hex: string, f: number) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = (sh: number) => Math.round(((n >> sh) & 255) * f);
  return `#${((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1)}`;
};

export interface SignageInput {
  orgName: string;
  category: string;
  headline: string;
  subhead?: string;
  dateText?: string;
  timeText?: string;
  secondary?: string; // bilingual line
  layout?: "fullbleed" | "split";
  image?: string; // photo URL
  categoryLabel?: string; // small label on the media (e.g. "Regular maintenance / Mice")
  contactPhone?: string;
  weather?: { city: string; cond: string; temp: string; icon?: string };
}

// A simple "people" mark (echoes a community housing logo without copying one).
const peopleMark = (fill: string) => `<svg width="30" height="20" viewBox="0 0 60 40" fill="${fill}" xmlns="http://www.w3.org/2000/svg"><g><circle cx="12" cy="9" r="6"/><path d="M2 40 V26 a10 10 0 0 1 20 0 V40 Z"/><circle cx="30" cy="6" r="6.5"/><path d="M18.5 40 V24 a11.5 11.5 0 0 1 23 0 V40 Z"/><circle cx="48" cy="9" r="6"/><path d="M38 40 V26 a10 10 0 0 1 20 0 V40 Z"/></g></svg>`;

function chromeBar(input: SignageInput): string {
  const w = input.weather ?? { city: "Toronto", cond: "SNOW", temp: "-10", icon: "❄" };
  const phone = input.contactPhone ?? "416 345 6543";
  return `<div class="chrome">
    <div class="clk"><div class="time" data-clock>11:37</div><div class="date" data-date>Monday, Jan 25</div></div>
    <div class="wx">Today in ${esc(w.city)} <b>${esc(w.cond)}</b> <span class="wxi">${w.icon ?? "❄"}</span> <span class="temp">${esc(w.temp)}°</span></div>
    <div class="ct"><span>Building Manager</span><b>CONTACT: ${esc(phone)}</b></div>
  </div>`;
}
function logoBadge(orgName: string): string {
  return `<div class="logo">${peopleMark("#1F3A4D")}<span>${esc(orgName)}</span></div>`;
}
const clockScript = `<script>(function(){function p(n){return('0'+n).slice(-2)}function t(){var d=new Date(),h=d.getHours();document.querySelectorAll('[data-clock]').forEach(function(e){e.textContent=(h%12||12)+':'+p(d.getMinutes())});document.querySelectorAll('[data-date]').forEach(function(e){e.textContent=d.toLocaleDateString('en-CA',{weekday:'long',month:'short',day:'numeric'})})}t();setInterval(t,1000);})();</script>`;

const shell = (inner: string) => `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Archivo:wght@600;700;800&display=swap" rel="stylesheet">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{background:#0b1220;font-family:'Archivo','Helvetica Neue',Arial,sans-serif}
 .screen{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#c9ced6;color:#fff}
 .chrome{position:absolute;top:0;left:0;right:0;height:11.5%;background:#3b4a5a;display:flex;align-items:center;justify-content:space-between;padding:0 2.2%;z-index:5}
 .clk .time{font-family:'Oswald';font-weight:600;font-size:3.3vw;line-height:1}
 .clk .date{font-size:1.05vw;letter-spacing:.5px;opacity:.9;margin-top:.2vw}
 .wx{font-family:'Oswald';font-size:1.7vw;font-weight:500;display:flex;align-items:center;gap:.6vw}
 .wx b{font-weight:700} .wxi{font-size:2vw} .temp{font-size:2.4vw;font-weight:600}
 .ct{text-align:right;line-height:1.15;font-size:1vw} .ct span{opacity:.85;display:block;font-size:.95vw} .ct b{font-family:'Oswald';font-weight:600;font-size:1.7vw}
 .logo{position:absolute;right:2%;bottom:4%;background:#fff;border-radius:6px;padding:.7vw 1vw;display:flex;flex-direction:column;align-items:center;gap:.2vw;z-index:6}
 .logo span{color:#1F3A4D;font-family:'Oswald';font-weight:600;font-size:.85vw;letter-spacing:2px}
 h1{font-family:'Oswald';font-weight:700;text-transform:uppercase;line-height:.98;letter-spacing:.5px}
 /* full-bleed */
 .stage{position:absolute;inset:0;background-size:cover;background-position:center}
 .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,12,22,.15) 12%,rgba(6,12,22,0) 40%,rgba(6,12,22,.55) 100%)}
 .hero{position:absolute;left:3.5%;bottom:8%;max-width:72%;z-index:4}
 .hero .kick{font-family:'Oswald';font-weight:600;letter-spacing:3px;text-transform:uppercase;font-size:1.2vw;opacity:.9}
 .hero h1{font-size:6.2vw;text-shadow:0 3px 24px rgba(0,0,0,.5);margin-top:.4vw}
 .hero .sub{font-size:2vw;font-weight:600;margin-top:1vw;text-shadow:0 2px 12px rgba(0,0,0,.5)}
 /* split */
 .split{position:absolute;inset:0;display:flex}
 .panel{width:52%;padding:12% 4% 6%;display:flex;flex-direction:column;justify-content:center}
 .panel .kick{font-family:'Oswald';font-weight:600;letter-spacing:3px;text-transform:uppercase;font-size:1.15vw;opacity:.9}
 .panel .dt{font-family:'Oswald';font-weight:500;font-size:2.6vw;margin:.6vw 0 1vw}
 .panel .dt b{font-weight:700}
 .panel h1{font-size:4.2vw}
 .panel .tm{font-family:'Oswald';font-weight:700;font-size:3.4vw;margin-top:1.4vw}
 .panel .tm small{font-size:1.7vw;font-weight:500}
 .panel .rule{height:2px;background:rgba(255,255,255,.5);width:40%;margin:1.4vw 0}
 .panel .sec{font-size:1.9vw;opacity:.92}
 .media{width:48%;position:relative;background-size:cover;background-position:center}
 .catlabel{position:absolute;right:3%;top:20%;text-align:right;font-family:'Oswald';font-weight:500;font-size:2vw;text-shadow:0 2px 10px rgba(0,0,0,.4)}
 .catlabel b{display:block;font-weight:700;font-size:2.6vw}
</style></head><body><div class="screen">${inner}</div>${clockScript}</body></html>`;

/** Full self-contained 16:9 signage template. */
export function renderSignageHtml(input: SignageInput): string {
  const theme = signageTheme(input.category, input.headline);
  const org = input.orgName || "WoodGreen Community Housing";
  const headline = esc(input.headline || "Notice").toUpperCase();
  const layout = input.layout ?? (input.image ? "fullbleed" : "split");
  const catColor = theme.color;

  if (layout === "split") {
    const media = input.image
      ? `<div class="media" style="background-image:url('${esc(input.image)}')">${input.categoryLabel ? `<div class="catlabel">${input.categoryLabel.split("/")[0]}<b>${esc((input.categoryLabel.split("/")[1] || "").trim())}</b></div>` : ""}${logoBadge(org)}</div>`
      : `<div class="media" style="background:linear-gradient(160deg,${darken(catColor, 0.8)},${darken(catColor, 0.5)})">${logoBadge(org)}</div>`;
    return shell(`${chromeBar(input)}
      <div class="split">
        <div class="panel" style="background:${catColor}">
          <div class="kick">${esc(theme.kicker)}</div>
          ${input.dateText ? `<div class="dt">${esc(input.dateText)}</div>` : ""}
          <h1>${headline}</h1>
          ${input.timeText ? `<div class="tm">${esc(input.timeText)}</div>` : ""}
          <div class="rule"></div>
          ${input.secondary ? `<div class="sec">${esc(input.secondary)}</div>` : ""}
          ${input.subhead && !input.secondary ? `<div class="sec">${esc(input.subhead)}</div>` : ""}
        </div>
        ${media}
      </div>`);
  }

  // full-bleed
  const bg = input.image
    ? `background-image:url('${esc(input.image)}')`
    : `background:radial-gradient(circle at 78% 22%, ${catColor}, ${darken(catColor, 0.5)})`;
  return shell(`${chromeBar(input)}
    <div class="stage" style="${bg}"></div>
    <div class="scrim"></div>
    <div class="hero">
      <div class="kick">${esc(theme.kicker)}${input.dateText ? ` · ${esc(input.dateText)}` : ""}</div>
      <h1>${headline}</h1>
      ${input.subhead ? `<div class="sub">${esc(input.subhead)}</div>` : ""}
      ${input.secondary ? `<div class="sub" style="opacity:.9;font-weight:500">${esc(input.secondary)}</div>` : ""}
    </div>
    ${logoBadge(org)}`);
}
