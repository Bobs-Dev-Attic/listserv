import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailConfigured } from "@/lib/email";
import type { List, Message } from "@/lib/database.types";
import { StatusBadge } from "@/components/status-badge";
import { sendMessageAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function MessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: msgRow } = await supabase
    .from("messages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const message = msgRow as Message | null;
  if (!message) notFound();

  const { data: listRow } = await supabase
    .from("lists")
    .select("id, name, slug")
    .eq("id", message.list_id)
    .single();
  const list = listRow as Pick<List, "id" | "name" | "slug">;

  // Delivery breakdown (admins can read deliveries via RLS).
  const [confirmedCount, deliveries] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("list_id", message.list_id)
      .eq("status", "confirmed"),
    supabase.from("deliveries").select("status").eq("message_id", id),
  ]);

  const counts = { queued: 0, sent: 0, failed: 0, sending: 0, skipped: 0 };
  for (const d of (deliveries.data as { status: string }[]) ?? []) {
    counts[d.status as keyof typeof counts] =
      (counts[d.status as keyof typeof counts] ?? 0) + 1;
  }

  const emailConfigured = await isEmailConfigured();
  const canSend = ["draft", "queued", "sending", "failed"].includes(
    message.status,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/lists/${list.id}`}
          className="text-sm text-slate-400 hover:text-white"
        >
          ← {list.name}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-100">
            {message.subject}
          </h1>
          <StatusBadge status={message.status} />
        </div>
      </div>

      {!emailConfigured && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Email delivery isn&apos;t configured yet.</strong> You can
          queue this message, but nothing will be emailed until you set{" "}
          <code>EMAIL_FROM</code> and a provider key (e.g.{" "}
          <code>RESEND_API_KEY</code>) in your environment. Queued messages are
          saved and will send once configured.
        </div>
      )}

      <div className="card p-6">
        <div className="whitespace-pre-wrap text-sm text-slate-200">
          {message.body_text}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Confirmed subs" value={confirmedCount.count ?? 0} />
        <Stat label="Queued" value={counts.queued} />
        <Stat label="Sent" value={counts.sent} />
        <Stat label="Failed" value={counts.failed} />
      </div>

      <div className="card flex items-center justify-between p-6">
        <div>
          <div className="font-medium text-slate-100">
            {message.status === "sent"
              ? "This message has been sent."
              : message.status === "draft"
                ? "Draft — not yet sent."
                : "Queued for delivery."}
          </div>
          {message.sent_at && (
            <div className="text-sm text-slate-400">
              Sent {new Date(message.sent_at).toLocaleString()}
            </div>
          )}
        </div>
        {canSend && (
          <form action={sendMessageAction}>
            <input type="hidden" name="id" value={id} />
            <button className="btn-primary">
              {message.status === "draft"
                ? "Send to subscribers"
                : counts.failed > 0 || counts.queued > 0
                  ? "Retry sending"
                  : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-xl font-bold text-slate-100">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}
