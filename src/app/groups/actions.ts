"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processMessage } from "@/lib/send-worker";
import { logAudit } from "@/lib/audit";
import type { List, Message } from "@/lib/database.types";

export interface PostState {
  error: string | null;
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Link any subscriptions that match the signed-in user's verified email to
 * their profile. Runs with the service role (members can't update orphan rows
 * via RLS). Safe to call on every member-area load.
 */
export async function claimSubscriptions(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ profile_id: user.id })
    .eq("email", user.email)
    .is("profile_id", null);
}

/** Fan a message out to confirmed subscribers and attempt immediate delivery. */
async function fanOut(messageId: string) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("enqueue_message", { p_message_id: messageId });
  if (error) throw new Error(error.message);
  await processMessage(messageId);
}

async function requireSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/groups");
  return { supabase, user };
}

/** Member self-joins a public list (confirmed immediately). */
export async function joinGroupAction(formData: FormData) {
  const { supabase, user } = await requireSessionUser();
  const slug = String(formData.get("slug") ?? "");
  const listId = String(formData.get("list_id") ?? "");
  if (!listId) redirect("/groups");

  // Link any existing (orphan) subscription for this email first, so the
  // upsert's update path satisfies RLS.
  await claimSubscriptions();

  await supabase.from("subscriptions").upsert(
    {
      list_id: listId,
      email: user.email,
      profile_id: user.id,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    },
    { onConflict: "list_id,email" },
  );

  revalidatePath("/groups");
  if (slug) redirect(`/groups/${slug}`);
  redirect("/groups");
}

/** Member sets their own delivery preference for a list. */
export async function setDeliveryModeAction(formData: FormData) {
  const { supabase, user } = await requireSessionUser();
  const listId = String(formData.get("list_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const mode = String(formData.get("mode") ?? "");
  if (!["each", "digest", "none"].includes(mode)) return;
  await supabase
    .from("subscriptions")
    .update({ delivery_mode: mode })
    .eq("list_id", listId)
    .eq("profile_id", user.id);
  if (slug) revalidatePath(`/groups/${slug}`);
}

/** Member leaves a list. */
export async function leaveGroupAction(formData: FormData) {
  const { supabase, user } = await requireSessionUser();
  const listId = String(formData.get("list_id") ?? "");
  await supabase
    .from("subscriptions")
    .update({ status: "unsubscribed" })
    .eq("list_id", listId)
    .eq("profile_id", user.id);
  revalidatePath("/groups");
  redirect("/groups");
}

/** Start a new topic (root post) in a discussion list. */
export async function createTopicAction(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const { supabase, user } = await requireSessionUser();
  const slug = String(formData.get("slug") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body_text") ?? "").trim();
  if (!subject) return { error: "A subject is required." };
  if (!body) return { error: "Write a message." };

  const { data: listRow } = await supabase
    .from("lists")
    .select("id, name, type, posting_policy")
    .eq("slug", slug)
    .maybeSingle();
  const list = listRow as Pick<List, "id" | "name" | "type" | "posting_policy"> | null;
  if (!list) return { error: "Group not found." };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      list_id: list.id,
      kind: "post",
      subject,
      body_text: body,
      sender_profile_id: user.id,
      sender_email: user.email,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "You don't have permission to post to this group." };
  }

  const messageId = (data as { id: string }).id;
  await fanOut(messageId);
  redirect(`/groups/${slug}/topics/${messageId}`);
}

/** Reply to an existing topic. */
export async function replyAction(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const { supabase, user } = await requireSessionUser();
  const slug = String(formData.get("slug") ?? "");
  const topicId = String(formData.get("topic_id") ?? "");
  const body = String(formData.get("body_text") ?? "").trim();
  if (!body) return { error: "Write a reply." };

  const { data: topicRow } = await supabase
    .from("messages")
    .select("id, subject, list_id")
    .eq("id", topicId)
    .maybeSingle();
  const topic = topicRow as Pick<Message, "id" | "subject" | "list_id"> | null;
  if (!topic) return { error: "That topic no longer exists." };

  const subject = topic.subject.replace(/^re:\s*/i, "");

  const { data, error } = await supabase
    .from("messages")
    .insert({
      list_id: topic.list_id,
      kind: "post",
      subject: `Re: ${subject}`,
      body_text: body,
      sender_profile_id: user.id,
      sender_email: user.email,
      reply_to_message_id: topic.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "You don't have permission to post to this group." };
  }

  await fanOut((data as { id: string }).id);
  revalidatePath(`/groups/${slug}/topics/${topicId}`);
  return { error: null };
}

/**
 * Delete a post (and, if it's a topic root, its replies). Authorized by RLS:
 * the "messages: moderator delete" policy only permits the delete when the
 * caller has the `moderate_topics` permission on the message's list (or is an
 * admin). Non-moderators simply delete zero rows.
 */
export async function deletePostAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const messageId = String(formData.get("message_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const isRoot = formData.get("is_root") === "1";
  if (!messageId) return;

  if (isRoot) {
    // Remove the topic and its direct replies.
    await supabase
      .from("messages")
      .delete()
      .or(`id.eq.${messageId},reply_to_message_id.eq.${messageId}`);
    await logAudit({
      action: "post.delete",
      actorId: user.id,
      actorEmail: user.email ?? null,
      targetType: "message",
      targetId: messageId,
      summary: "Deleted a topic (moderation)",
    });
    revalidatePath(`/groups/${slug}`);
    redirect(`/groups/${slug}`);
  }

  await supabase.from("messages").delete().eq("id", messageId);
  await logAudit({
    action: "post.delete",
    actorId: user.id,
    actorEmail: user.email ?? null,
    targetType: "message",
    targetId: messageId,
    summary: "Deleted a reply (moderation)",
  });
  revalidatePath(`/groups/${slug}`);
}
