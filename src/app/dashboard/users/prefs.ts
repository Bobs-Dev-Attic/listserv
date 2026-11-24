"use server";

import { createClient } from "@/lib/supabase/server";

/** Persist a per-user UI preference blob (RLS-scoped to the caller). */
export async function savePrefsAction(key: string, value: unknown) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_prefs").upsert(
    {
      profile_id: user.id,
      key,
      value: value as object,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,key" },
  );
}
