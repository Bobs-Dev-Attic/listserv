import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import type { List, Message } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const supabase = await createClient();

  const [{ count: listCount }, { count: subCount }, { data: recent }] =
    await Promise.all([
      supabase.from("lists").select("id", { count: "exact", head: true }),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed"),
      supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const { data: lists } = await supabase
    .from("lists")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const recentMessages = (recent as Message[]) ?? [];
  const recentLists = (lists as List[]) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <Link href="/dashboard/lists/new" className="btn-primary">
          New list
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Lists" value={listCount ?? 0} />
        <Stat label="Confirmed subscribers" value={subCount ?? 0} />
        <Stat label="Messages sent" value={recentMessages.filter((m) => m.status === "sent").length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Your lists</h2>
            <Link href="/dashboard/lists" className="text-sm text-brand-600">
              View all
            </Link>
          </div>
          {recentLists.length === 0 ? (
            <p className="text-sm text-gray-500">No lists yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentLists.map((l) => (
                <li key={l.id} className="py-2">
                  <Link
                    href={`/dashboard/lists/${l.id}`}
                    className="flex items-center justify-between text-sm hover:text-brand-600"
                  >
                    <span className="font-medium">{l.name}</span>
                    <span className="text-gray-400">/{l.slug}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Recent messages</h2>
          {recentMessages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentMessages.map((m) => (
                <li key={m.id} className="py-2">
                  <Link
                    href={`/dashboard/messages/${m.id}`}
                    className="flex items-center justify-between text-sm hover:text-brand-600"
                  >
                    <span className="truncate font-medium">{m.subject}</span>
                    <StatusBadge status={m.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </div>
  );
}

