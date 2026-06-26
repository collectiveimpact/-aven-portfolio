# Wallboard — Fuse5 Digital Signage Partner

Fuse5's **Displays** section is powered by [Wallboard](https://wallboard.us). Two
ways to connect, both supported:

## 1. REST API (the app's deterministic path)

The adapter lives in `src/lib/wallboard/api.ts`. It's env-gated — dormant until
credentials are set, at which point the Displays section syncs **live devices** and
can **publish Content-library assets** to screens.

Set on the server (InMotion env / `.env.local`):

| Var | Example | Purpose |
|---|---|---|
| `WALLBOARD_BASE_URL` | `https://app.wallboard.us` | Your tenant API host |
| `WALLBOARD_API_KEY` | `eyJ…` (a JWT) | API key, sent as `Authorization: Bearer` |
| `WALLBOARD_DATASOURCE_ID` | `ds-uuid-123` | The Wallboard datasource Fuse5 feeds |
| `WALLBOARD_MCP_URL` | `https://…/mcp` | (optional) MCP server for AI control |

**The API key is the integration path — and it's datasource-centric.** Wallboard
API keys (Settings → Integrations → API Keys) are **HMAC-signed JWTs** with a
**scope**: `Webhook API Call`, `Proof of Play Read`, **`Internal Datasource Write`**,
`Datasource Data Read`. A key therefore CANNOT do device/content CRUD (that's the
OAuth/admin path) — instead, the clean integration is:

- **Fuse5 → Wallboard datasource (write):** `PUT /api/datasource/{WALLBOARD_DATASOURCE_ID}/data`
  with `{ "data": { …live feed… } }`. Fuse5 publishes a **multi-zone signage feed**
  (emergency banner, notices ticker, resident-survey QR, KPI strip) — Wallboard
  slides bind to those fields, so one push refreshes **every screen**. Built by
  `src/lib/wallboard/feed.ts`; pushed from **Displays → "Push to Wallboard"** (or
  automatically on an emergency broadcast).
- **Read:** `GET /api/datasource/{id}/data?parseData=true`.
- **Proof of Play (read):** which content actually played, where and when — pull for
  compliance documentation ("emergency notice confirmed on 28 screens").
- **Webhook API Call:** Wallboard → Fuse5 events.
- Create the key with **Internal Datasource Write** scope, and a datasource Fuse5
  owns. Device/content CRUD + scheduling stay on the **OAuth or MCP** path below.

Capabilities Fuse5 can drive once connected (from the current Wallboard platform):
slide/playlist embedding for multi-zone layouts, **Schedules** (what/when/where, no
device assignment), background audio with ducking, file-replace-everywhere, Power BI
and SharePoint datasources, **Vistar SSP** programmatic ads (monetize screens),
ePaper device support, SAML SSO + magic-code login.

## 2. MCP — AI-driven signage (Wallboard's headline feature)

Wallboard ships a **Model Context Protocol** server with OAuth. That means Fuse5's
AI agents (and Claude/Cursor directly) can **manage devices, organize content,
configure schedules, and more in natural language** — no custom code per action.

To enable: add the Wallboard MCP server URL to your AI client / Fuse5 AI Agents
config (set `WALLBOARD_MCP_URL`). Authentication is OAuth — the client is prompted
once. Then prompts like *"put the heat-alert notice on every Jane St lobby screen
until Friday"* are executed against your signage network.

This pairs naturally with Fuse5: the Content library + Surveys + Emergency broadcasts
become things the AI can push to physical displays through Wallboard.

## Where it shows in Fuse5

- **Displays** → "powered by Wallboard" banner: connected status + live device grid;
  data source flips to "Wallboard (live)" when the key is set.
- **Integrations** → the **Wallboard Digital Signage** connector (configure key + base URL).
- Not connected → graceful local/demo data + a "Connect Wallboard" CTA.
