// Fuse5 Hub environment. The app runs WITHOUT these (demo data) so it is
// demoable immediately; set them to connect the real backend / providers.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasBackend = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Server-only provider keys (never exposed to the browser).
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
export const TWILIO_FROM = process.env.TWILIO_FROM ?? "";
// Service-role key + cron secret enable headless agents (e.g. the scheduled
// compliance-score sync) to authenticate and write without a user session.
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const CRON_SECRET = process.env.CRON_SECRET ?? "";
export const COMPLIANCE_SYNC_ORG_ID = process.env.COMPLIANCE_SYNC_ORG_ID ?? "";
export const hasAI = Boolean(ANTHROPIC_API_KEY);
export const hasEmail = Boolean(RESEND_API_KEY);
export const hasSms = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM);

// Demo affordances (prefilled login creds, demo hints). ON for local/dev; OFF in
// production unless NEXT_PUBLIC_DEMO=true is set explicitly. Client-safe flag.
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "true" || process.env.NODE_ENV !== "production";

// Whether list getters fall back to canned demo rows when a backed table is
// EMPTY. ON for local/dev (rich demo); OFF in production so a real org with no
// data renders true empty states instead of fake rows. Follows IS_DEMO.
export const DEMO_FALLBACK = process.env.DEMO_FALLBACK === "true" || (process.env.DEMO_FALLBACK !== "false" && IS_DEMO);

// Yardi Voyager Web Services (paid interface license). When all are present the
// direct-API connector activates; otherwise the app falls back to file ETL import.
export const YARDI_BASE_URL = process.env.YARDI_BASE_URL ?? "";          // e.g. https://www.yardiasp14.com/12345voyager_prod
export const YARDI_USERNAME = process.env.YARDI_USERNAME ?? "";
export const YARDI_PASSWORD = process.env.YARDI_PASSWORD ?? "";
export const YARDI_DATABASE = process.env.YARDI_DATABASE ?? "";
export const YARDI_SERVER = process.env.YARDI_SERVER ?? "";
export const YARDI_PLATFORM = process.env.YARDI_PLATFORM ?? "SQL Server";
export const YARDI_INTERFACE_ENTITY = process.env.YARDI_INTERFACE_ENTITY ?? "";
export const YARDI_INTERFACE_LICENSE = process.env.YARDI_INTERFACE_LICENSE ?? "";
export const hasYardiApi = Boolean(YARDI_BASE_URL && YARDI_USERNAME && YARDI_PASSWORD && YARDI_DATABASE);

export interface YardiCreds {
  baseUrl: string; username: string; password: string; database: string;
  server: string; platform: string; interfaceEntity: string; interfaceLicense: string;
}
export function yardiCreds(): YardiCreds {
  return {
    baseUrl: YARDI_BASE_URL, username: YARDI_USERNAME, password: YARDI_PASSWORD, database: YARDI_DATABASE,
    server: YARDI_SERVER, platform: YARDI_PLATFORM, interfaceEntity: YARDI_INTERFACE_ENTITY, interfaceLicense: YARDI_INTERFACE_LICENSE,
  };
}

// Wallboard digital-signage partner (wallboard.us). When set, the Displays section
// syncs real devices/content from Wallboard and can publish to it; otherwise it runs
// on local/demo data. Base URL is the tenant API host, e.g. https://app.wallboard.us
export const WALLBOARD_BASE_URL = process.env.WALLBOARD_BASE_URL ?? "https://app.wallboard.us";
export const WALLBOARD_API_KEY = process.env.WALLBOARD_API_KEY ?? "";
export const WALLBOARD_MCP_URL = process.env.WALLBOARD_MCP_URL ?? "";   // optional MCP server URL for AI control
export const WALLBOARD_DATASOURCE_ID = process.env.WALLBOARD_DATASOURCE_ID ?? ""; // the Wallboard datasource Fuse5 feeds live signage data into
// Device/content MANAGEMENT needs an OAuth access token (the scoped API key can't
// do device CRUD). Set this to manage screens directly from Fuse5.
export const WALLBOARD_ACCESS_TOKEN = process.env.WALLBOARD_ACCESS_TOKEN ?? "";
export const hasWallboard = Boolean(WALLBOARD_API_KEY);
export const hasWallboardControl = Boolean(WALLBOARD_ACCESS_TOKEN);
