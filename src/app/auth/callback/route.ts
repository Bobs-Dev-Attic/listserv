import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/**
 * OAuth (and email-link) callback. Exchanges the auth code for a session,
 * then redirects to `next` (defaults to /groups).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/groups";
  const next = nextParam.startsWith("/") ? nextParam : "/groups";

  // Resolve the correct base URL when running behind Vercel's proxy.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const fwd = request.headers.get("x-forwarded-for");
      const ip = fwd ? fwd.split(",")[0].trim() : request.headers.get("x-real-ip");
      await logAudit({
        action: "login",
        actorId: user?.id ?? null,
        actorEmail: user?.email ?? null,
        ip,
        userAgent: request.headers.get("user-agent"),
        summary: "Signed in via Google",
      });
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
