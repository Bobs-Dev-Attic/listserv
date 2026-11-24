import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

/** Current auth user or null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Current user's profile row (includes role) or null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}

/** Require any authenticated, active user, else redirect. Returns the profile. */
export async function requireUser(redirectTo = "/groups"): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  if (profile.status !== "active") redirect("/blocked");
  return profile;
}

/** Require an authenticated, active admin, else redirect. Returns the profile. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login?redirect=/dashboard");
  if (profile.status !== "active") redirect("/blocked");
  if (profile.role !== "admin") redirect("/forbidden");
  return profile;
}
