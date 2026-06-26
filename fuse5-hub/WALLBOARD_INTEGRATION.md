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
| `WALLBOARD_API_KEY` | `wb_live_…` | Bearer token (Wallboard → API key) |
| `WALLBOARD_MCP_URL` | `https://…/mcp` | (optional) MCP server for AI control |

- **Auth:** `Authorization: Bearer <WALLBOARD_API_KEY>`, base path `/api/v2`.
- **Devices** → the Displays grid (online/offline, current content).
- **Content / Playlist (simple loop) / Schedules** → publish Fuse5 notices, images
  and videos to Wallboard; schedule overrides (lunch menus, emergency takeovers).
- Validate exact endpoint/parameter names against your tenant's OpenAPI on first
  connect — Wallboard versions some paths.

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
