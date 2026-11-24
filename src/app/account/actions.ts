"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUserClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

export interface FormState {
  error: string | null;
  message: string | null;
}

export async function updateNameAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUserClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", user.id);
  if (error) return { error: error.message, message: null };
  revalidatePath("/account");
  return { error: null, message: "Name updated." };
}

export async function updateEmailAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUserClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", message: null };
  }
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message, message: null };
  return {
    error: null,
    message: `We sent a confirmation link to ${email}. Your sign-in email changes once you confirm it.`,
  };
}

/** Set avatar_url ("emoji:…" preset or an uploaded image URL). */
export async function setAvatarAction(formData: FormData) {
  const { supabase, user } = await requireUserClient();
  const url = String(formData.get("avatar_url") ?? "").trim();
  await supabase
    .from("profiles")
    .update({ avatar_url: url || null })
    .eq("id", user.id);
  revalidatePath("/account");
  revalidatePath("/groups");
}
