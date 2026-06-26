import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: "Proxy" is the renamed Middleware. Must live at src/proxy.ts
// (same level as src/app) and export a function named `proxy`. Runs on the
// nodejs runtime. This is the UX auth gate (redirect to /login); the security
// boundary is RLS + server-action role checks.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on all routes except static assets / images / video / the API / the public
  // survey-response pages (/s/… — residents fill these out without logging in).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|s/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov|m4v)$).*)"],
};
