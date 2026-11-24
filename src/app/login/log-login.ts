"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit, clientMeta } from "@/lib/audit";

/** Record a login (IP + user-agent, never cookies) after a client sign-in. */
export async function logLoginAction(method = "email code") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const meta = await clientMeta();
  await logAudit({
    action: "login",
    actorId: user.id,
    actorEmail: user.email ?? null,
    ip: meta.ip,
    userAgent: meta.userAgent,
    summary: `Signed in via ${method}`,
  });
}
