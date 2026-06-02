import Anthropic from "@anthropic-ai/sdk";

// POST /api/agents — runs one of the 7 Fuse5 agents.
// Live (ANTHROPIC_API_KEY set) → calls Claude. Otherwise → canned demo response.

const SYSTEM_PROMPTS: Record<string, string> = {
  content_composer:
    "You are the Fuse5 Content Composer for affordable-housing property managers. Draft clear, warm, plain-language resident communications (notices, newsletters, signage copy). Keep it concise and professional, use simple sentences, and include a clear subject line and call to action where relevant.",
  compliance_guardian:
    "You are the Fuse5 Compliance Guardian for Ontario residential tenancies. Review the user's notice or message for compliance with the Residential Tenancies Act and LTB form requirements (notice periods, required fields, prohibited content). Reply with a short verdict (Compliant / Needs changes), then a bulleted list of specific issues and fixes. Note you are not legal advice.",
  translation:
    "You are the Fuse5 Translation agent for property communications. Translate the user's message accurately into the requested language(s) while preserving tone and any dates, times, and addresses. If no target language is given, default to French and Spanish. Label each translation with its language.",
  scheduling_optimizer:
    "You are the Fuse5 Scheduling Optimizer. Given a message and audience, recommend the best send window per channel (email, SMS, display) for high engagement among residents, considering quiet hours and urgency. Reply with a short table-like list of channel → recommended time → one-line rationale.",
  tenant_inquiry:
    "You are the Fuse5 Tenant Inquiry assistant. Answer resident questions helpfully and accurately in a friendly tone, based on common property-management knowledge (rent, maintenance, amenities, policies). If something requires staff or is property-specific, say so and offer to route it.",
  maintenance_request:
    "You are the Fuse5 Maintenance Request triage agent. From the resident's description, classify the work order: category, priority (low/medium/high/urgent), suggested trade/assignee, and a one-line summary. Flag any safety or emergency conditions clearly.",
  emergency_broadcast:
    "You are the Fuse5 Emergency Broadcast composer. Write an urgent, calm, action-oriented safety alert suitable for multi-channel delivery (SMS, email, display). Keep the SMS version under 320 characters. Lead with what to do, then why, then where to get updates.",
};

const DEMO_RESPONSES: Record<string, string> = {
  content_composer:
    "Subject: Scheduled Water Shut-Off — Saturday 9 AM to 12 PM\n\nDear Residents of Building B,\n\nPlease be advised that water service will be temporarily interrupted on Saturday from 9:00 AM to 12:00 PM for essential maintenance. We recommend filling a container of water beforehand for your needs.\n\nWe expect service to resume by 12:00 PM. Thank you for your patience.\n\n— Property Management",
  compliance_guardian:
    "Verdict: Needs changes\n\n• Notice period: A rent increase (N1) requires 90 days' written notice — confirm the effective date meets this.\n• Required fields: Add the tenant's full address and the exact new rent amount.\n• Format: Use the official LTB N1 form; a plain letter is not sufficient on its own.\n\nNote: This is guidance, not legal advice.",
  translation:
    "French (Français):\nAvis : interruption d'eau prévue samedi de 9 h à 12 h dans le bâtiment B.\n\nSpanish (Español):\nAviso: corte de agua programado el sábado de 9 a. m. a 12 p. m. en el Edificio B.",
  scheduling_optimizer:
    "Recommended send windows:\n• Email → Tue 9:30 AM → highest open rates for non-urgent notices.\n• SMS → Tue 5:30 PM → after work, before quiet hours.\n• Display → Mon–Wed all day → maximizes lobby impressions before the event.",
  tenant_inquiry:
    "Great question! Rent is due on the 1st of each month and can be paid via the resident portal, pre-authorized debit, or at the office. A grace period applies to the 5th. If you'd like, I can route you to your property manager to set up auto-pay.",
  maintenance_request:
    "Work Order Triage:\n• Category: Plumbing\n• Priority: High\n• Suggested assignee: Licensed plumber\n• Summary: Active leak under kitchen sink, water pooling.\n\n⚠️ Possible water damage — recommend same-day response.",
  emergency_broadcast:
    "SMS: ALERT — Fire alarm activated at Northgate Tower. Evacuate now via nearest stairwell. Do NOT use elevators. Gather at the north parking lot. Updates to follow.\n\nEmail/Display: Emergency — please evacuate immediately using the stairs and proceed to the north parking lot muster point. Emergency services have been notified. Await all-clear from staff before re-entering.",
};

const DEFAULT_DEMO =
  "This is a demo response. Set ANTHROPIC_API_KEY to connect this agent to Claude for live output.";

export async function POST(req: Request) {
  let agentKey = "";
  let input = "";
  try {
    const body = (await req.json()) as { agentKey?: unknown; input?: unknown };
    agentKey = typeof body.agentKey === "string" ? body.agentKey : "";
    input = typeof body.input === "string" ? body.input : "";
  } catch {
    return Response.json({ text: "Invalid request body.", mode: "demo" }, { status: 400 });
  }

  const system = SYSTEM_PROMPTS[agentKey];
  if (!system) {
    return Response.json({ text: "Unknown agent.", mode: "demo" }, { status: 400 });
  }
  if (!input.trim()) {
    return Response.json({ text: "Please provide some input for the agent.", mode: "demo" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const text = DEMO_RESPONSES[agentKey] ?? DEFAULT_DEMO;
    return Response.json({ text, mode: "demo" }, { status: 200 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: input }],
    });
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    return Response.json({ text: text || "(No content returned.)", mode: "live" }, { status: 200 });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ text: `Agent error: ${detail}`, mode: "live" }, { status: 502 });
  }
}
