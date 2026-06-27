import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";
import { hasBackend } from "@/lib/env";
import { SignInForm } from "./signin-form";

export default async function PortalSignInPage() {
  // Already signed in → straight to the portal home.
  const session = await getPortalSession();
  if (session) redirect("/portal");

  return (
    <div className="f5-card" style={{ width: 420, maxWidth: "100%", padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span
          style={{
            display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 10,
            background: "var(--f5-gradient-teal, var(--f5-teal))", color: "#04201f", fontWeight: 800, fontSize: 14,
          }}
        >
          F5
        </span>
        <div>
          <div style={{ fontWeight: 800, color: "var(--f5-text)", fontSize: 17 }}>Resident Portal</div>
          <div style={{ color: "var(--f5-text-muted)", fontSize: 12.5 }}>Sign in to your home community</div>
        </div>
      </div>

      <p style={{ color: "var(--f5-text-muted)", fontSize: 13, lineHeight: 1.5, margin: "0 0 18px" }}>
        See your notices, submit and track maintenance requests, answer surveys, and ask questions.
      </p>

      <SignInForm />

      {!hasBackend && (
        <div style={{ marginTop: 16, fontSize: 12, color: "var(--f5-text-muted)", lineHeight: 1.5 }}>
          Demo note: this environment has no backend configured, so resident sign-in can&apos;t verify accounts here.
        </div>
      )}

      <div
        style={{
          marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--f5-border)",
          fontSize: 11.5, color: "var(--f5-text-muted)", lineHeight: 1.5,
        }}
      >
        Prototype sign-in. Production uses verified resident accounts (magic-link / OTP)
        and database-enforced privacy.
      </div>
    </div>
  );
}
