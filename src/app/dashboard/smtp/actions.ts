"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

async function adminClient() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") throw new Error("Not authorized");
  return createClient();
}

export interface SaveServerState {
  error: string | null;
  ok: boolean;
}

export async function saveServerAction(
  _prev: SaveServerState,
  formData: FormData,
): Promise<SaveServerState> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const host = String(formData.get("host") ?? "").trim();
  const port = Number(formData.get("port") ?? "587") || 587;
  const secure = formData.get("secure") === "on";
  const username = String(formData.get("username") ?? "").trim();
  const from_email = String(formData.get("from_email") ?? "").trim();
  let password = String(formData.get("password") ?? "");

  if (!name || !host || !username || !from_email) {
    return { ok: false, error: "Name, host, username and From are required." };
  }

  if (id) {
    if (!password) {
      const { data } = await supabase
        .from("email_servers")
        .select("password")
        .eq("id", id)
        .single();
      password = (data as { password: string } | null)?.password ?? "";
    }
    const { error } = await supabase
      .from("email_servers")
      .update({ name, host, port, secure, username, password, from_email })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    if (!password) {
      return { ok: false, error: "Password is required for a new server." };
    }
    const { error } = await supabase
      .from("email_servers")
      .insert({ name, host, port, secure, username, password, from_email });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/smtp");
  return { ok: true, error: null };
}

export async function setActiveServerAction(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const activate = formData.get("activate") !== "false";
  // Clear the current active server, then activate the chosen one.
  await supabase
    .from("email_servers")
    .update({ is_active: false })
    .eq("is_active", true);
  if (id && activate) {
    await supabase
      .from("email_servers")
      .update({ is_active: true })
      .eq("id", id);
  }
  revalidatePath("/dashboard/smtp");
}

export async function deleteServerAction(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  await supabase.from("email_servers").delete().eq("id", id);
  revalidatePath("/dashboard/smtp");
}
