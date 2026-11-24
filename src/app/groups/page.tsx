import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { List } from "@/lib/database.types";
import { claimSubscriptions, joinGroupAction } from "./actions";

export const dynamic = "force-dynamic";

const typeBadge: Record<string, string> = {
  broadcast: "Announcements",
  discussion: "Discussion",
  both: "Discussion + Announcements",
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
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <section>
        <h1 className="text-2xl font-bold text-white">Your groups</h1>
        {myLists.length === 0 ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-[#343842] p-8 text-center text-slate-400">
            You haven&apos;t joined any groups yet. Find one below.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {myLists.map((l) => {
              const canDiscuss = l.type === "discussion" || l.type === "both";
              return (
                <Link
                  key={l.id}
                  href={`/groups/${l.slug}`}
                  className="block rounded-lg border border-white/10 bg-[#343842] p-5 transition-colors hover:border-[#4a90d2]/50 hover:bg-[#3a3f4a]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-white">{l.name}</h2>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                      {typeBadge[l.type]}
                    </span>
                  </div>
                  {l.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                      {l.description}
                    </p>
                  )}
                  <p className="mt-3 text-sm font-medium text-[#5b9bd5]">
                    {canDiscuss ? "Open discussion →" : "View messages →"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {discover.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Discover groups</h2>
          <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
            {discover.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-4 bg-[#343842] px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="font-medium text-white">{l.name}</div>
                  {l.description && (
                    <p className="line-clamp-1 text-sm text-slate-400">
                      {l.description}
                    </p>
                  )}
                </div>
                <form action={joinGroupAction}>
                  <input type="hidden" name="list_id" value={l.id} />
                  <input type="hidden" name="slug" value={l.slug} />
                  <button className="rounded bg-[#4a90d2] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#3b7bbf]">
                    Join
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
