"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { processMessage } from "@/lib/send-worker";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import { logAudit } from "@/lib/audit";
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

// --------------------------- users ---------------------------

export async function setUserRoleAction(formData: FormData) {
  const { supabase, profile } = await requireAdminClient();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!["admin", "member"].includes(role)) return;
  // Don't let an admin demote themselves (avoid locking out the dashboard).
  if (id === profile.id && role !== "admin") return;
  const { data: target } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("profiles").update({ role }).eq("id", id);
  await logAudit({
    action: "user.role_change",
    actorId: profile.id,
    actorEmail: profile.email,
    targetType: "user",
    targetId: id,
    summary: `Set ${(target as { email: string } | null)?.email ?? id} to ${role}`,
  });
  revalidatePath("/dashboard/users");
}

// --------------------------- smtp / email ---------------------------

export interface TestEmailState {
  error: string | null;
  message: string | null;
}

export async function sendTestEmailAction(
  _prev: TestEmailState,
  formData: FormData,
): Promise<TestEmailState> {
  const { profile } = await requireAdminClient();
  const to = String(formData.get("to") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { error: "Enter a valid email address.", message: null };
  }
  if (!(await isEmailConfigured())) {
    return {
      error: "Email isn't configured — set the LISTSERV_EMAIL_* env vars first.",
      message: null,
    };
  }
  try {
    await sendEmail({
      to,
      subject: "ListServ test email",
      text: "This is a test email from your ListServ admin dashboard. If you received it, outbound email is working.",
    });
    await logAudit({
      action: "email.test",
      actorId: profile.id,
      actorEmail: profile.email,
      targetType: "email",
      summary: `Sent a test email to ${to}`,
    });
    return { error: null, message: `Test email sent to ${to}. (Check spam.)` };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Send failed.",
      message: null,
    };
  }
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

  const newId = (data as { id: string }).id;
  await logAudit({
    action: "list.create",
    actorId: profile.id,
    actorEmail: profile.email,
    targetType: "list",
    targetId: newId,
    summary: `Created list "${name}"`,
  });
  revalidatePath("/dashboard/lists");
  redirect(`/dashboard/lists/${newId}`);
}

export async function updateListAction(
  _prev: ListFormState,
  formData: FormData,
): Promise<ListFormState> {
  const { supabase, profile } = await requireAdminClient();
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
  await logAudit({
    action: "list.update",
    actorId: profile.id,
    actorEmail: profile.email,
    targetType: "list",
    targetId: id,
    summary: `Updated list "${name}"`,
  });
  revalidatePath(`/dashboard/lists/${id}`);
  return { error: null };
}

export async function deleteListAction(formData: FormData) {
  const { supabase, profile } = await requireAdminClient();
  const id = String(formData.get("id") ?? "");
  const { data: listRow } = await supabase
    .from("lists")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("lists").delete().eq("id", id);
  await logAudit({
    action: "list.delete",
    actorId: profile.id,
    actorEmail: profile.email,
    targetType: "list",
    targetId: id,
    summary: `Deleted list "${(listRow as { name: string } | null)?.name ?? id}"`,
  });
  revalidatePath("/dashboard/lists");
  redirect("/dashboard/lists");
}

// --------------------------- subscribers ---------------------------

export interface AddSubscribersState {
  error: string | null;
  message: string | null;
}

export async function addSubscribersAction(
  _prev: AddSubscribersState,
  formData: FormData,
): Promise<AddSubscribersState> {
  const { profile } = await requireAdminClient(); // authorize caller
  const admin = createAdminClient();

  const listId = String(formData.get("list_id") ?? "");
  const skipConfirmation = formData.get("skip_confirmation") === "on";
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
    return { error: "Enter at least one valid email.", message: null };
  }

  const { data: listRow } = await admin
    .from("lists")
    .select("name")
    .eq("id", listId)
    .single();
  const listName = (listRow as { name: string } | null)?.name ?? "the list";

  const { data: existingRows } = await admin
    .from("subscriptions")
    .select("id, email, status, confirm_token")
    .eq("list_id", listId)
    .in("email", emails);
  const existing = new Map(
    ((existingRows as {
      id: string;
      email: string;
      status: string;
      confirm_token: string;
    }[]) ?? []).map((r) => [r.email.toLowerCase(), r]),
  );

  let confirmed = 0;
  let already = 0;
  const pending: { email: string; token: string }[] = [];

  for (const email of emails) {
    const ex = existing.get(email);
    if (ex?.status === "confirmed") {
      already++;
      continue;
    }

    if (skipConfirmation) {
      await admin.from("subscriptions").upsert(
        {
          list_id: listId,
          email,
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        },
        { onConflict: "list_id,email" },
      );
      confirmed++;
    } else if (ex) {
      // Re-send: reset to pending, reuse the row's confirm token.
      await admin
        .from("subscriptions")
        .update({ status: "pending" })
        .eq("id", ex.id);
      pending.push({ email, token: ex.confirm_token });
    } else {
      const { data, error } = await admin
        .from("subscriptions")
        .insert({ list_id: listId, email })
        .select("confirm_token")
        .single();
      if (!error && data) {
        pending.push({
          email,
          token: (data as { confirm_token: string }).confirm_token,
        });
      }
    }
  }

  // Send confirmation (double opt-in) emails to the pending ones.
  let sent = 0;
  let failed = 0;
  if (pending.length > 0) {
    if (!(await isEmailConfigured())) {
      revalidatePath(`/dashboard/lists/${listId}`);
      return {
        error: null,
        message: `${pending.length} added as pending, but email isn't configured, so no confirmation emails were sent.`,
      };
    }
    for (const { email, token } of pending) {
      const confirmUrl = `${siteUrl()}/confirm?token=${token}`;
      try {
        await sendEmail({
          to: email,
          subject: `Confirm your subscription to ${listName}`,
          text:
            `You've been added to "${listName}".\n\n` +
            `Please confirm your subscription:\n${confirmUrl}\n\n` +
            `If you don't want to join, you can ignore this email.`,
        });
        sent++;
      } catch {
        failed++;
      }
    }
  }

  revalidatePath(`/dashboard/lists/${listId}`);

  const parts: string[] = [];
  if (sent) parts.push(`${sent} confirmation email${sent === 1 ? "" : "s"} sent`);
  if (confirmed) parts.push(`${confirmed} added as confirmed`);
  if (already) parts.push(`${already} already subscribed`);
  if (failed) parts.push(`${failed} failed to send`);

  if (sent + confirmed > 0) {
    await logAudit({
      action: "subscription.add",
      actorId: profile.id,
      actorEmail: profile.email,
      targetType: "list",
      targetId: listId,
      summary: `Added ${sent + confirmed} subscriber(s) to "${listName}"`,
      metadata: { sent, confirmed, already, failed },
    });
  }

  return {
    error: null,
    message: parts.length ? parts.join(" · ") : "Nothing to add.",
  };
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
  const { profile } = await requireAdminClient();
  const id = String(formData.get("id") ?? "");

  // Fan out via the SECURITY DEFINER function (creates deliveries, status=queued).
  // Called with the service role — EXECUTE is revoked from anon/authenticated
  // so it cannot be triggered directly through the public RPC endpoint.
  const admin = createAdminClient();
  const { error } = await admin.rpc("enqueue_message", { p_message_id: id });
  if (error) throw new Error(error.message);

  const { data: msg } = await admin
    .from("messages")
    .select("subject, recipient_count")
    .eq("id", id)
    .maybeSingle();
  await logAudit({
    action: "message.send",
    actorId: profile.id,
    actorEmail: profile.email,
    targetType: "message",
    targetId: id,
    summary: `Sent "${(msg as { subject: string } | null)?.subject ?? id}" to ${(msg as { recipient_count: number } | null)?.recipient_count ?? 0} recipients`,
  });

  // Attempt immediate delivery (no-op if no provider configured yet).
  await processMessage(id);

  revalidatePath(`/dashboard/messages/${id}`);
}
