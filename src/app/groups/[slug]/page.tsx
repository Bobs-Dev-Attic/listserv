import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List, Message, DeliveryMode } from "@/lib/database.types";
import { displayName, timeAgo } from "@/lib/display";
import { GroupSidebar } from "@/components/group-sidebar";
import { claimSubscriptions, joinGroupAction } from "../actions";

export const dynamic = "force-dynamic";

type Row = Pick<
  Message,
  | "id"
  | "subject"
  | "body_text"
  | "sender_email"
  | "reply_to_message_id"
  | "created_at"
  | "kind"
>;

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await claimSubscriptions();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: listRow } = await supabase
    .from("lists")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  const list = listRow as List | null;
  if (!list) notFound();

  const { data: membership } = await supabase
    .from("subscriptions")
    .select("status, delivery_mode")
    .eq("list_id", list.id)
    .eq("profile_id", user!.id)
    .maybeSingle();
  const member = membership as {
    status: string;
    delivery_mode: DeliveryMode;
  } | null;
  const isMember = member?.status === "confirmed";

  if (!isMember) {
    const joinable =
      list.is_public && (list.type === "discussion" || list.type === "both");
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/groups" className="text-sm text-slate-400 hover:text-white">
          ← All groups
        </Link>
        <div className="mt-4 rounded-lg border border-white/10 bg-[#343842] p-8 text-center">
          <h1 className="text-xl font-semibold text-white">{list.name}</h1>
          {list.description && (
            <p className="mt-2 text-slate-300">{list.description}</p>
          )}
          {joinable ? (
            <form action={joinGroupAction} className="mt-6">
              <input type="hidden" name="list_id" value={list.id} />
              <input type="hidden" name="slug" value={list.slug} />
              <button className="rounded bg-[#4a90d2] px-4 py-2 font-medium text-white hover:bg-[#3b7bbf]">
                Join this group
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-slate-400">
              You&apos;re not a member of this group.
            </p>
          )}
        </div>
      </div>
    );
  }

  const canPost =
    (list.type === "discussion" || list.type === "both") &&
    list.posting_policy === "subscribers";

  const { data: msgRows } = await supabase
    .from("messages")
    .select(
      "id, subject, body_text, sender_email, reply_to_message_id, created_at, kind",
    )
    .eq("list_id", list.id)
    .order("created_at", { ascending: true });
  const messages = (msgRows as Row[]) ?? [];

  type Topic = { root: Row; replies: number; last: string };
  const topics = new Map<string, Topic>();
  for (const m of messages) {
    if (!m.reply_to_message_id) {
      topics.set(m.id, { root: m, replies: 0, last: m.created_at });
    }
  }
  for (const m of messages) {
    if (m.reply_to_message_id) {
      const t = topics.get(m.reply_to_message_id);
      if (t) {
        t.replies += 1;
        if (m.created_at > t.last) t.last = m.created_at;
      }
    }
  }
  const sorted = Array.from(topics.values()).sort((a, b) =>
    a.last < b.last ? 1 : -1,
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <GroupSidebar
        slug={slug}
        listId={list.id}
        name={list.name}
        canPost={canPost}
        active="messages"
        deliveryMode={member?.delivery_mode}
      />

      <div className="min-w-0 flex-1 px-4 py-5 md:px-8">
        {/* breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/groups" className="hover:text-white">
            Groups
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-200">{list.name}</span>
          <span>/</span>
          <span>Topics</span>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">
            Topics <span className="font-normal text-slate-500">· {sorted.length}</span>
          </h1>
          {canPost && (
            <Link
              href={`/groups/${slug}/new`}
              className="rounded bg-[#4a90d2] px-4 py-2 text-sm font-medium text-white hover:bg-[#3b7bbf]"
            >
              New topic
            </Link>
          )}
        </div>

        {!canPost && (
          <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Posting on this group is limited to admins — you&apos;ll receive its
            messages here.
          </p>
        )}

        <div className="overflow-hidden rounded-lg border border-white/10">
          {sorted.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No topics yet.{" "}
              {canPost && (
                <Link
                  href={`/groups/${slug}/new`}
                  className="text-[#5b9bd5] hover:underline"
                >
                  Start the first one.
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {sorted.map((t) => {
                const author = displayName(t.root.sender_email);
                return (
                  <li key={t.root.id}>
                    <Link
                      href={`/groups/${slug}/topics/${t.root.id}`}
                      className="block px-4 py-3 hover:bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#5b9bd5] hover:underline">
                          {t.root.subject}
                        </span>
                        {t.replies > 0 && (
                          <span className="rounded bg-white/10 px-1.5 text-xs font-medium text-slate-300">
                            {t.replies}
                          </span>
                        )}
                        {t.root.kind === "broadcast" && (
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-400">
                            announcement
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-slate-400">
                        {t.root.body_text}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Started by {author} @ {timeAgo(t.root.created_at)}
                        {t.replies > 0 && <> · Most recent @ {timeAgo(t.last)}</>}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
