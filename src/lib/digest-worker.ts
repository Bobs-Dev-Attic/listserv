import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import type { List, Message } from "@/lib/database.types";

export interface DigestSummary {
  lists: number;
  messages: number;
  sent: number;
  failed: number;
  configured: boolean;
}

type DigestMsg = Pick<
  Message,
  "id" | "list_id" | "subject" | "body_text" | "kind" | "reply_to_message_id" | "created_at"
>;

/**
 * Build and send digests of not-yet-digested messages to 'digest' subscribers,
 * one email per list. Marks messages digested so they aren't re-sent.
 */
export async function processDigests(): Promise<DigestSummary> {
  const admin = createAdminClient();
  const summary: DigestSummary = {
    lists: 0,
    messages: 0,
    sent: 0,
    failed: 0,
    configured: await isEmailConfigured(),
  };
  if (!summary.configured) return summary;

  const { data: msgRows } = await admin
    .from("messages")
    .select(
      "id, list_id, subject, body_text, kind, reply_to_message_id, created_at",
    )
    .eq("digested", false)
    .in("status", ["queued", "sending", "sent"])
    .order("created_at", { ascending: true });
  const messages = (msgRows as DigestMsg[]) ?? [];
  if (messages.length === 0) return summary;

  const byList = new Map<string, DigestMsg[]>();
  for (const m of messages) {
    const arr = byList.get(m.list_id) ?? [];
    arr.push(m);
    byList.set(m.list_id, arr);
  }

  for (const [listId, msgs] of byList) {
    const { data: listRow } = await admin
      .from("lists")
      .select("id, name, slug, reply_to")
      .eq("id", listId)
      .single();
    const list = listRow as Pick<List, "id" | "name" | "slug" | "reply_to"> | null;

    const { data: subRows } = await admin
      .from("subscriptions")
      .select("email, unsubscribe_token")
      .eq("list_id", listId)
      .eq("status", "confirmed")
      .eq("delivery_mode", "digest");
    const subs =
      (subRows as { email: string; unsubscribe_token: string }[]) ?? [];

    if (list && subs.length > 0) {
      const lines = msgs.map((m) => {
        const topicId = m.reply_to_message_id ?? m.id;
        const link = `${siteUrl()}/groups/${list.slug}/topics/${topicId}`;
        const snippet = m.body_text.replace(/\s+/g, " ").trim().slice(0, 160);
        return `• ${m.subject}\n  ${snippet}\n  ${link}`;
      });
      const intro = `${list.name} — digest of ${msgs.length} message${
        msgs.length === 1 ? "" : "s"
      }`;
      const body = `${intro}\n\n${lines.join("\n\n")}`;

      summary.lists++;
      summary.messages += msgs.length;

      for (const s of subs) {
        const unsubUrl = `${siteUrl()}/unsubscribe?token=${s.unsubscribe_token}`;
        try {
          await sendEmail({
            to: s.email,
            subject: `[${list.name}] Digest — ${msgs.length} new`,
            text: `${body}\n\n—\nYou're receiving the digest for ${list.name}.\nUnsubscribe: ${unsubUrl}`,
            replyTo: list.reply_to ?? undefined,
            headers: { "List-Unsubscribe": `<${unsubUrl}>` },
          });
          summary.sent++;
        } catch {
          summary.failed++;
        }
      }
    }

    // Mark these messages digested either way, so they don't accumulate.
    await admin
      .from("messages")
      .update({ digested: true })
      .in(
        "id",
        msgs.map((m) => m.id),
      );
  }

  return summary;
}
