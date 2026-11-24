import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import type { List, Subscription, Message } from "@/lib/database.types";
import { StatusBadge } from "@/components/status-badge";
import { AddSubscribersForm } from "./add-subscribers-form";
import {
  setSubscriptionStatusAction,
  removeSubscriptionAction,
} from "../../actions";

export const dynamic = "force-dynamic";

const deliveryLabel: Record<string, string> = {
  each: "Each message",
  digest: "Digest",
  none: "No email",
};

const subStatusStyles: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  unsubscribed: "bg-white/10 text-slate-300",
  bounced: "bg-red-100 text-red-800",
};

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: listRow } = await supabase
    .from("lists")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const list = listRow as List | null;
  if (!list) notFound();

  const [{ data: subRows }, { data: msgRows }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("list_id", id)
      .order("subscribed_at", { ascending: false }),
    supabase
      .from("messages")
      .select("*")
      .eq("list_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const subscriptions = (subRows as Subscription[]) ?? [];
  const messages = (msgRows as Message[]) ?? [];
  const confirmed = subscriptions.filter((s) => s.status === "confirmed").length;
  const pending = subscriptions.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/lists"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Lists
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-100">{list.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {list.is_public ? (
              <a
                href={`${siteUrl()}/lists/${list.slug}`}
                className="text-brand-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                /lists/{list.slug} ↗
              </a>
            ) : (
              <span>/lists/{list.slug} (private)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/lists/${id}/settings`}
            className="btn-secondary"
          >
            Settings
          </Link>
          <Link
            href={`/dashboard/lists/${id}/compose`}
            className="btn-primary"
          >
            Compose message
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Confirmed" value={confirmed} />
        <Stat label="Pending" value={pending} />
        <Stat label="Messages" value={messages.length} />
      </div>

      {/* Subscribers */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Subscribers</h2>
        <div className="card p-5">
          <AddSubscribersForm listId={id} />
        </div>

        <div className="card overflow-hidden">
          {subscriptions.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No subscribers yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Delivery</th>
                  <th className="px-4 py-2 font-medium">Subscribed</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-medium text-slate-100">
                      {s.email}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`badge ${subStatusStyles[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-300">
                      {deliveryLabel[s.delivery_mode] ?? s.delivery_mode}
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {new Date(s.subscribed_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        {s.status !== "confirmed" && (
                          <form action={setSubscriptionStatusAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="list_id" value={id} />
                            <input type="hidden" name="status" value="confirmed" />
                            <button className="text-xs font-medium text-green-700 hover:underline">
                              Confirm
                            </button>
                          </form>
                        )}
                        {s.status !== "unsubscribed" && (
                          <form action={setSubscriptionStatusAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="list_id" value={id} />
                            <input
                              type="hidden"
                              name="status"
                              value="unsubscribed"
                            />
                            <button className="text-xs font-medium text-slate-300 hover:underline">
                              Unsubscribe
                            </button>
                          </form>
                        )}
                        <form action={removeSubscriptionAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="list_id" value={id} />
                          <button className="text-xs font-medium text-red-600 hover:underline">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Messages */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Messages</h2>
        {messages.length === 0 ? (
          <div className="card p-6 text-sm text-slate-400">
            No messages yet.{" "}
            <Link
              href={`/dashboard/lists/${id}/compose`}
              className="text-brand-600"
            >
              Compose one.
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-white/10">
            {messages.map((m) => (
              <Link
                key={m.id}
                href={`/dashboard/messages/${m.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/5"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-100">
                    {m.subject}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(m.created_at).toLocaleString()}
                    {m.status === "sent" &&
                      ` · ${m.recipient_count} recipients`}
                  </div>
                </div>
                <StatusBadge status={m.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="text-2xl font-bold text-slate-100">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </div>
  );
}
