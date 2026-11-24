import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List, Message } from "@/lib/database.types";
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
    .select("status")
    .eq("list_id", list.id)
    .eq("profile_id", user!.id)
    .maybeSingle();
  const isMember =
    (membership as { status: string } | null)?.status === "confirmed";

  if (!isMember) {
    const joinable =
      list.is_public && (list.type === "discussion" || list.type === "both");
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/groups" className="text-sm text-slate-500 hover:text-slate-900">
          ← All groups
        </Link>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">{list.name}</h1>
          {list.description && (
            <p className="mt-2 text-slate-600">{list.description}</p>
          )}
          {joinable ? (
            <form action={joinGroupAction} className="mt-6">
              <input type="hidden" name="list_id" value={list.id} />
              <input type="hidden" name="slug" value={list.slug} />
              <button className="btn-primary">Join this group</button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-slate-500">
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
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <GroupSidebar
        slug={slug}
        listId={list.id}
        name={list.name}
        canPost={canPost}
        active="messages"
      />

      <div>
        {/* breadcrumb */}
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/groups" className="hover:text-slate-900">
            Groups
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-700">{list.name}</span>
          <span>/</span>
          <span>Topics</span>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">
            Topics{" "}
            <span className="font-normal text-slate-400">
              · {sorted.length}
            </span>
          </h1>
          {canPost && (
            <Link href={`/groups/${slug}/new`} className="btn-primary">
              New topic
            </Link>
          )}
        </div>

        {!canPost && (
          <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Posting on this group is limited to admins — you&apos;ll receive its
            messages here.
          </p>
        )}

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {sorted.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No topics yet.{" "}
              {canPost && (
                <Link href={`/groups/${slug}/new`} className="text-brand-600">
                  Start the first one.
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map((t) => {
                const author = displayName(t.root.sender_email);
                return (
                  <li key={t.root.id}>
                    <Link
                      href={`/groups/${slug}/topics/${t.root.id}`}
                      className="group block px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-brand-700 group-hover:underline">
                          {t.root.subject}
                        </span>
                        {t.replies > 0 && (
                          <span className="rounded bg-slate-200 px-1.5 text-xs font-medium text-slate-600">
                            {t.replies}
                          </span>
                        )}
                        {t.root.kind === "broadcast" && (
                          <span className="badge bg-slate-100 text-slate-600">
                            announcement
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-slate-600">
                        {t.root.body_text}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
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
