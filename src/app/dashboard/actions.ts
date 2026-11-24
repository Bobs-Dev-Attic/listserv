"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { processMessage } from "@/lib/send-worker";
import type { ListType, PostingPolicy } from "@/lib/database.types";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function requireAdminClient() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Not authorized");
  }
  const supabase = await createClient();
  return { supabase, profile };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// --------------------------- lists ---------------------------

export interface ListFormState {
  error: string | null;
}

export async function createListAction(
  _prev: ListFormState,
  formData: FormData,
): Promise<ListFormState> {
  const { supabase, profile } = await requireAdminClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  let slug = String(formData.get("slug") ?? "").trim();
  slug = slug ? slugify(slug) : slugify(name);
  if (!slug) return { error: "Could not derive a valid slug." };

  const type = (String(formData.get("type") ?? "broadcast") as ListType);
  const posting_policy = (String(
    formData.get("posting_policy") ?? "admins",
  ) as PostingPolicy);

  const { data, error } = await supabase
    .from("lists")
    .insert({
      name,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      type,
      posting_policy,
      reply_to: String(formData.get("reply_to") ?? "").trim() || null,
      is_public: formData.get("is_public") === "on",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "That slug is already taken." };
    return { error: error.message };
  }

  revalidatePath("/dashboard/lists");
  redirect(`/dashboard/lists/${(data as { id: string }).id}`);
}

export async function updateListAction(
  _prev: ListFormState,
  formData: FormData,
): Promise<ListFormState> {
  const { supabase } = await requireAdminClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Missing fields." };

  const { error } = await supabase
    .from("lists")
    .update({
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      type: String(formData.get("type") ?? "broadcast") as ListType,
      posting_policy: String(
        formData.get("posting_policy") ?? "admins",
      ) as PostingPolicy,
      reply_to: String(formData.get("reply_to") ?? "").trim() || null,
      is_public: formData.get("is_public") === "on",
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/lists/${id}`);
  return { error: null };
}

export async function deleteListAction(formData: FormData) {
  const { supabase } = await requireAdminClient();
  const id = String(formData.get("id") ?? "");
  await supabase.from("lists").delete().eq("id", id);
  revalidatePath("/dashboard/lists");
  redirect("/dashboard/lists");
}

// --------------------------- subscribers ---------------------------

export async function addSubscribersAction(
  _prev: { error: string | null; added: number },
  formData: FormData,
): Promise<{ error: string | null; added: number }> {
  const { supabase } = await requireAdminClient();
  const listId = String(formData.get("list_id") ?? "");
  const raw = String(formData.get("emails") ?? "");
  const emails = Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
    ),
  );
  if (!listId || emails.length === 0) {
    return { error: "Enter at least one valid email.", added: 0 };
  }

  // Admin-added subscribers are confirmed immediately.
  const rows = emails.map((email) => ({
    list_id: listId,
    email,
    status: "confirmed" as const,
    confirmed_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("subscriptions")
    .upsert(rows, { onConflict: "list_id,email", ignoreDuplicates: true });

  if (error) return { error: error.message, added: 0 };
  revalidatePath(`/dashboard/lists/${listId}`);
  return { error: null, added: emails.length };
}

export async function setSubscriptionStatusAction(formData: FormData) {
  const { supabase } = await requireAdminClient();
  const id = String(formData.get("id") ?? "");
  const listId = String(formData.get("list_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const patch: Record<string, unknown> = { status };
  if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
  await supabase.from("subscriptions").update(patch).eq("id", id);
  revalidatePath(`/dashboard/lists/${listId}`);
}

export async function removeSubscriptionAction(formData: FormData) {
  const { supabase } = await requireAdminClient();
  const id = String(formData.get("id") ?? "");
  const listId = String(formData.get("list_id") ?? "");
  await supabase.from("subscriptions").delete().eq("id", id);
  revalidatePath(`/dashboard/lists/${listId}`);
}

// --------------------------- messages ---------------------------

export interface ComposeState {
  error: string | null;
}

/** Create a draft message. */
export async function createMessageAction(
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const { supabase, profile } = await requireAdminClient();
  const listId = String(formData.get("list_id") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body_text") ?? "");

  if (!listId || !subject) return { error: "Subject is required." };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      list_id: listId,
      subject,
      body_text: body,
      kind: "broadcast",
      sender_profile_id: profile.id,
      sender_email: profile.email,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/lists/${listId}`);
  redirect(`/dashboard/messages/${(data as { id: string }).id}`);
}

/** Queue a draft (fan out to confirmed subscribers) and attempt to send now. */
export async function sendMessageAction(formData: FormData) {
  // Authorize: caller must be an admin.
  await requireAdminClient();
  const id = String(formData.get("id") ?? "");

  // Fan out via the SECURITY DEFINER function (creates deliveries, status=queued).
  // Called with the service role — EXECUTE is revoked from anon/authenticated
  // so it cannot be triggered directly through the public RPC endpoint.
  const admin = createAdminClient();
  const { error } = await admin.rpc("enqueue_message", { p_message_id: id });
  if (error) throw new Error(error.message);

  // Attempt immediate delivery (no-op if no provider configured yet).
  await processMessage(id);

  revalidatePath(`/dashboard/messages/${id}`);
}
