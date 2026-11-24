import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import { logAudit } from "@/lib/audit";
import type { List, Message, Delivery } from "@/lib/database.types";

export interface SendSummary {
  messageId: string;
  attempted: number;
  sent: number;
  failed: number;
  configured: boolean;
}

const BATCH = 100;

/**
 * Process queued deliveries for a single message: send each email and record
 * the result. Safe to call repeatedly — it only touches 'queued' rows.
 */
export async function processMessage(messageId: string): Promise<SendSummary> {
  const admin = createAdminClient();
  const configured = await isEmailConfigured();

  const { data: msgRow } = await admin
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .single();
  const message = msgRow as Message | null;
  if (!message) throw new Error(`message ${messageId} not found`);

  const { data: listRow } = await admin
    .from("lists")
    .select("*")
    .eq("id", message.list_id)
    .single();
  const list = listRow as List;

  if (!configured) {
    // Leave everything queued; surface that nothing was sent.
    return { messageId, attempted: 0, sent: 0, failed: 0, configured: false };
  }

  await admin
    .from("messages")
    .update({ status: "sending" })
    .eq("id", messageId)
    .in("status", ["queued", "sending"]);

  let sent = 0;
  let failed = 0;
  let attempted = 0;

  // Pull queued deliveries in batches, with each recipient's unsubscribe token.
  for (;;) {
    const { data: rows } = await admin
      .from("deliveries")
      .select("*, subscriptions(unsubscribe_token)")
      .eq("message_id", messageId)
      .eq("status", "queued")
      .limit(BATCH);

    const deliveries = (rows as (Delivery & {
      subscriptions: { unsubscribe_token: string } | null;
    })[]) ?? [];
    if (deliveries.length === 0) break;

    for (const d of deliveries) {
      attempted++;
      const unsubToken = d.subscriptions?.unsubscribe_token;
      const unsubUrl = unsubToken
        ? `${siteUrl()}/unsubscribe?token=${unsubToken}`
        : null;

      const footer = unsubUrl
        ? `\n\n—\nYou received this because you're subscribed to ${list.name}.\nUnsubscribe: ${unsubUrl}`
        : "";

      try {
        const { providerMessageId } = await sendEmail({
          to: d.email,
          subject: message.subject,
          text: message.body_text + footer,
          html: message.body_html ?? undefined,
          replyTo: list.reply_to ?? undefined,
          headers: unsubUrl
            ? { "List-Unsubscribe": `<${unsubUrl}>` }
            : undefined,
        });
        await admin
          .from("deliveries")
          .update({
            status: "sent",
            provider_message_id: providerMessageId,
            sent_at: new Date().toISOString(),
            attempts: d.attempts + 1,
            error: null,
          })
          .eq("id", d.id);
        sent++;
      } catch (err) {
        await admin
          .from("deliveries")
          .update({
            status: "failed",
            attempts: d.attempts + 1,
            error: err instanceof Error ? err.message : String(err),
          })
          .eq("id", d.id);
        failed++;
      }
    }
  }

  // Finalize message status based on remaining queued rows.
  const { count: remaining } = await admin
    .from("deliveries")
    .select("id", { count: "exact", head: true })
    .eq("message_id", messageId)
    .eq("status", "queued");

  if (!remaining) {
    await admin
      .from("messages")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", messageId);
  }

  if (attempted > 0) {
    await logAudit({
      action: "email.broadcast",
      actorEmail: message.sender_email,
      targetType: "message",
      targetId: messageId,
      summary: `Delivered "${message.subject}" — ${sent} sent, ${failed} failed`,
      metadata: { sent, failed, attempted },
    });
  }

  return { messageId, attempted, sent, failed, configured: true };
}

/** Process any messages that still have queued deliveries (for cron). */
export async function processQueue(limit = 20): Promise<SendSummary[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("messages")
    .select("id")
    .in("status", ["queued", "sending"])
    .limit(limit);

  const summaries: SendSummary[] = [];
  for (const row of (data as { id: string }[]) ?? []) {
    summaries.push(await processMessage(row.id));
  }
  return summaries;
}
