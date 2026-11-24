"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

async function admin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") throw new Error("Not authorized");
  return { supabase: await createClient(), profile };
}

export interface RoleFormState {
  error: string | null;
  ok: boolean;
}

export async function saveRoleAction(
  _prev: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const { supabase, profile } = await admin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const permissions = formData.getAll("permissions").map(String);
  if (!name) return { ok: false, error: "Name is required." };

  if (id) {
    const { error } = await supabase
      .from("roles")
      .update({ name, description, permissions })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("roles")
      .insert({ name, description, permissions });
    if (error) return { ok: false, error: error.message };
  }

  await logAudit({
    action: "role.save",
    actorId: profile.id,
    actorEmail: profile.email,
    targetType: "role",
    targetId: id || null,
    summary: `${id ? "Updated" : "Created"} role "${name}"`,
    metadata: { permissions },
  });
  revalidatePath("/dashboard/roles");
  return { ok: true, error: null };
}

export async function deleteRoleAction(formData: FormData) {
  const { supabase, profile } = await admin();
  const id = String(formData.get("id") ?? "");
  await supabase.from("roles").delete().eq("id", id);
  await logAudit({
    action: "role.delete",
    actorId: profile.id,
    actorEmail: profile.email,
    targetType: "role",
    targetId: id,
    summary: "Deleted a role",
  });
  revalidatePath("/dashboard/roles");
}

export async function assignRoleAction(formData: FormData) {
  const { supabase, profile } = await admin();
  const role_id = String(formData.get("role_id") ?? "");
  const profile_id = String(formData.get("profile_id") ?? "");
  const list_id = String(formData.get("list_id") ?? "") || null;
  if (!role_id || !profile_id) return;
  await supabase
    .from("role_assignments")
    .upsert({ role_id, profile_id, list_id }, { onConflict: "role_id,profile_id,list_id" });
  await logAudit({
    action: "role.assign",
    actorId: profile.id,
    actorEmail: profile.email,
    targetType: "user",
    targetId: profile_id,
    summary: "Assigned a role",
    metadata: { role_id, list_id },
  });
  revalidatePath("/dashboard/roles");
}

export async function unassignRoleAction(formData: FormData) {
  const { supabase, profile } = await admin();
  const id = String(formData.get("id") ?? "");
  await supabase.from("role_assignments").delete().eq("id", id);
  await logAudit({
    action: "role.unassign",
    actorId: profile.id,
    actorEmail: profile.email,
    targetType: "role",
    targetId: id,
    summary: "Removed a role assignment",
  });
  revalidatePath("/dashboard/roles");
}
