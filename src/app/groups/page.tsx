import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { List } from "@/lib/database.types";
import { claimSubscriptions, joinGroupAction } from "./actions";

export const dynamic = "force-dynamic";

const typeBadge: Record<string, { label: string; cls: string }> = {
  broadcast: { label: "Announcements", cls: "bg-gray-100 text-gray-700" },
  discussion: { label: "Discussion", cls: "bg-brand-50 text-brand-700" },
  both: { label: "Discussion + Announcements", cls: "bg-brand-50 text-brand-700" },
};

export default async function GroupsHome() {
  await claimSubscriptions();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subRows } = await supabase
    .from("subscriptions")
    .select("list_id")
    .eq("profile_id", user!.id)
    .eq("status", "confirmed");
  const myListIds = new Set(
    ((subRows as { list_id: string }[]) ?? []).map((s) => s.list_id),
  );

  const { data: myListRows } = myListIds.size
    ? await supabase
        .from("lists")
        .select("*")
        .in("id", Array.from(myListIds))
        .order("name")
    : { data: [] };
  const myLists = (myListRows as List[]) ?? [];

  const { data: publicRows } = await supabase
    .from("lists")
    .select("*")
    .eq("is_public", true)
    .in("type", ["discussion", "both"])
    .order("name");
  const discover = ((publicRows as List[]) ?? []).filter(
    (l) => !myListIds.has(l.id),
  );

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-gray-900">Your groups</h1>
        {myLists.length === 0 ? (
          <div className="card mt-4 p-8 text-center text-gray-500">
            You haven&apos;t joined any groups yet. Find one below.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {myLists.map((l) => {
              const canDiscuss = l.type === "discussion" || l.type === "both";
              const badge = typeBadge[l.type];
              return (
                <Link
                  key={l.id}
                  href={`/groups/${l.slug}`}
                  className="card block p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-gray-900">{l.name}</h2>
                    <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  </div>
                  {l.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {l.description}
                    </p>
                  )}
                  <p className="mt-3 text-sm font-medium text-brand-600">
                    {canDiscuss ? "Open discussion →" : "View messages →"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {discover.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Discover groups</h2>
          <div className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {discover.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">{l.name}</div>
                  {l.description && (
                    <p className="line-clamp-1 text-sm text-gray-600">
                      {l.description}
                    </p>
                  )}
                </div>
                <form action={joinGroupAction}>
                  <input type="hidden" name="list_id" value={l.id} />
                  <input type="hidden" name="slug" value={l.slug} />
                  <button className="btn-primary px-4 py-1.5">Join</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
