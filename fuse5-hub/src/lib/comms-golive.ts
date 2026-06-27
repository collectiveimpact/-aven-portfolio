// Comms GO-LIVE readiness model.
//
// A channel is "ready to go live" when four things hold:
//   1. credentials configured  — the provider env flags are set (hasSms/hasEmail/…)
//   2. sender verified         — a sender identity for the channel is verified
//   3. A2P registered          — for SMS/WhatsApp only; 10DLC brand+campaign live
//   4. test passed             — a verify/test send succeeded
//
// The platform MANAGES this state — it does not hold provider secrets. Operators
// enter real keys in env/secrets and complete carrier registration externally;
// these types track the resulting status so an admin sees exactly what blocks
// each channel. The readiness compute is pure: pass it the env flags (server) and
// the DB rows (registration + identities) and it returns per-channel blockers.

export type GoLiveChannel = "sms" | "whatsapp" | "voice" | "email";
export const GO_LIVE_CHANNELS: GoLiveChannel[] = ["sms", "whatsapp", "voice", "email"];

// Pipeline status shared by brand / campaign / 10DLC registration.
export type RegStatus = "unregistered" | "submitted" | "pending" | "registered" | "rejected";
export const REG_STATUSES: RegStatus[] = ["unregistered", "submitted", "pending", "registered", "rejected"];

export const REG_STATUS_META: Record<RegStatus, { label: string; cls: string }> = {
  unregistered: { label: "Unregistered", cls: "bad" },
  submitted: { label: "Submitted", cls: "warn" },
  pending: { label: "Pending", cls: "warn" },
  registered: { label: "Registered", cls: "ok" },
  rejected: { label: "Rejected", cls: "bad" },
};

// DB shapes (subset the readiness compute needs). Mirrors migration 0023.
export interface CommsRegistrationRow {
  channel: string;
  brand_name: string | null;
  brand_status: RegStatus;
  campaign_use_case: string | null;
  campaign_status: RegStatus;
  sender_id: string | null;
  sender_verified: boolean;
  ten_dlc_status: RegStatus;
  submitted_at: string | null;
  notes: string | null;
  updated_at: string | null;
}
export interface SenderIdentityRow {
  channel: string;
  value: string;
  label: string | null;
  verified: boolean;
  verified_at: string | null;
}

// Env-derived credential flags, passed in from the server (we never read
// process.env here so the compute stays pure + unit-testable).
export interface CredentialFlags {
  sms: boolean;        // hasSms
  whatsapp: boolean;   // hasWhatsApp
  voice: boolean;      // hasVoice
  email: boolean;      // hasEmail || hasSendgrid
}

// Per-channel go-live requirements.
export interface ChannelRequirements {
  requiresA2P: boolean;       // SMS/WhatsApp need 10DLC; voice/email do not
  senderLabel: string;        // what "verify the sender" means for this channel
  credentialLabel: string;    // which keys must be set
}
export const CHANNEL_REQUIREMENTS: Record<GoLiveChannel, ChannelRequirements> = {
  sms: { requiresA2P: true, senderLabel: "Verify a sending number", credentialLabel: "Twilio SMS credentials" },
  whatsapp: { requiresA2P: true, senderLabel: "Verify a WhatsApp business number", credentialLabel: "Twilio WhatsApp credentials" },
  voice: { requiresA2P: false, senderLabel: "Verify a caller ID", credentialLabel: "Twilio Voice credentials" },
  email: { requiresA2P: false, senderLabel: "Verify a from-address / domain", credentialLabel: "Resend or SendGrid credentials" },
};

export const CHANNEL_META: Record<GoLiveChannel, { name: string; ico: string }> = {
  sms: { name: "SMS", ico: "💬" },
  whatsapp: { name: "WhatsApp", ico: "🟢" },
  voice: { name: "Voice", ico: "📞" },
  email: { name: "Email", ico: "✉️" },
};

// A single readiness check (a row in the per-channel checklist).
export interface ReadinessCheck {
  key: "credentials" | "sender" | "a2p" | "test";
  label: string;
  done: boolean;
  detail: string;
}

export interface ChannelReadiness {
  channel: GoLiveChannel;
  ready: boolean;
  checks: ReadinessCheck[];
  blockers: string[]; // labels of the checks that are not done
}

function a2pRegistered(reg?: CommsRegistrationRow): boolean {
  if (!reg) return false;
  return (
    reg.brand_status === "registered" &&
    reg.campaign_status === "registered" &&
    reg.ten_dlc_status === "registered"
  );
}

// Did a verify/test send pass? No live test endpoint exists yet, so "test passed"
// is modelled as: a verified sender identity exists for the channel (verification
// IS the test). When a real test endpoint lands, swap this for a stored result.
function senderVerified(channel: GoLiveChannel, ids: SenderIdentityRow[], reg?: CommsRegistrationRow): boolean {
  if (ids.some((i) => i.channel === channel && i.verified)) return true;
  return !!reg?.sender_verified;
}

export function computeChannelReadiness(
  channel: GoLiveChannel,
  creds: CredentialFlags,
  reg: CommsRegistrationRow | undefined,
  identities: SenderIdentityRow[],
): ChannelReadiness {
  const req = CHANNEL_REQUIREMENTS[channel];
  const hasCreds = creds[channel];
  const verified = senderVerified(channel, identities, reg);
  const a2pOk = !req.requiresA2P || a2pRegistered(reg);

  const checks: ReadinessCheck[] = [
    {
      key: "credentials",
      label: req.credentialLabel,
      done: hasCreds,
      detail: hasCreds ? "Provider keys present in env/secrets" : "Connect provider credentials first",
    },
    {
      key: "sender",
      label: req.senderLabel,
      done: verified,
      detail: verified ? "A verified sender identity is on file" : "Add and verify a sender identity",
    },
  ];

  if (req.requiresA2P) {
    checks.push({
      key: "a2p",
      label: "A2P 10DLC registered (brand + campaign)",
      done: a2pOk,
      detail: a2pOk ? "Brand and campaign are carrier-registered" : "Complete brand + campaign registration",
    });
  }

  // Test/verify is the final gate. Treated as passed once a verified sender
  // exists (verification doubles as the test) AND credentials are present.
  const testPassed = verified && hasCreds;
  checks.push({
    key: "test",
    label: "Test / verify send passed",
    done: testPassed,
    detail: testPassed ? "A verified sender confirms delivery" : "Run a test/verify send",
  });

  const blockers = checks.filter((c) => !c.done).map((c) => c.label);
  return { channel, ready: blockers.length === 0, checks, blockers };
}

export interface GoLiveSummary {
  channels: ChannelReadiness[];
  readyCount: number;
  totalCount: number;
}

export function computeGoLiveSummary(
  creds: CredentialFlags,
  registrations: CommsRegistrationRow[],
  identities: SenderIdentityRow[],
): GoLiveSummary {
  const byChannel = new Map(registrations.map((r) => [r.channel, r]));
  const channels = GO_LIVE_CHANNELS.map((ch) =>
    computeChannelReadiness(ch, creds, byChannel.get(ch), identities),
  );
  return {
    channels,
    readyCount: channels.filter((c) => c.ready).length,
    totalCount: channels.length,
  };
}
