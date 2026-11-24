import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List, Message } from "@/lib/database.types";
import { displayName, initials, avatarColor, timeAgo } from "@/lib/display";
import { claimSubscriptions, joinGroupAction, leaveGroupAction } from "../actions";

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
    .select("id, status")
    .eq("list_id", list.id)
    .eq("profile_id", user!.id)
    .maybeSingle();
  const isMember =
    (membership as { status: string } | null)?.status === "confirmed";

  // Not a member yet → offer to join (public discussion lists only).
  if (!isMember) {
    const joinable =
      list.is_public && (list.type === "discussion" || list.type === "both");
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/groups" className="text-sm text-gray-500 hover:text-gray-900">
          ← All groups
        </Link>
        <div className="card mt-4 p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">{list.name}</h1>
          {list.description && (
            <p className="mt-2 text-gray-600">{list.description}</p>
          )}
          {joinable ? (
            <form action={joinGroupAction} className="mt-6">
              <input type="hidden" name="list_id" value={list.id} />
              <input type="hidden" name="slug" value={list.slug} />
              <button className="btn-primary">Join this group</button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-gray-500">
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

  // Group into topics (root message + its replies).
  type Topic = { root: Row; replies: number; last: string; lastBy: string };
  const topics = new Map<string, Topic>();
  for (const m of messages) {
    if (!m.reply_to_message_id) {
      topics.set(m.id, {
        root: m,
        replies: 0,
        last: m.created_at,
        lastBy: m.sender_email ?? "",
      });
    }
  }
  for (const m of messages) {
    if (m.reply_to_message_id) {
      const t = topics.get(m.reply_to_message_id);
      if (t) {
        t.replies += 1;
        if (m.created_at > t.last) {
          t.last = m.created_at;
          t.lastBy = m.sender_email ?? "";
        }
      }
    }
  }
  const sorted = Array.from(topics.values()).sort((a, b) =>
    a.last < b.last ? 1 : -1,
  );

  return (
    <div className="space-y-5">
      <div>
        <Link href="/groups" className="text-sm text-gray-500 hover:text-gray-900">
          ← All groups
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
          {list.description && (
            <p className="mt-1 text-sm text-gray-600">{list.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <form action={leaveGroupAction}>
            <input type="hidden" name="list_id" value={list.id} />
            <button className="btn-secondary px-3 py-1.5 text-sm">Leave</button>
          </form>
          {canPost && (
            <Link href={`/groups/${slug}/new`} className="btn-primary">
              New topic
            </Link>
          )}
        </div>
      </div>

      {!canPost && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Posting on this group is limited to admins — you&apos;ll receive its
          messages here.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {sorted.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No topics yet.{" "}
            {canPost && (
              <Link href={`/groups/${slug}/new`} className="text-brand-600">
                Start the first one.
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sorted.map((t) => {
              const author = displayName(t.root.sender_email);
              return (
                <li key={t.root.id}>
                  <Link
                    href={`/groups/${slug}/topics/${t.root.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50"
                  >
                    <span
                      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: avatarColor(author) }}
                    >
                      {initials(author)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-gray-900">
                          {t.root.subject}
                        </span>
                        {t.root.kind === "broadcast" && (
                          <span className="badge bg-gray-100 text-gray-600">
                            announcement
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">
                        {author} · {t.root.body_text}
                      </p>
                    </div>
                    <div className="ml-2 shrink-0 text-right text-xs text-gray-400">
                      <div>
                        {t.replies} {t.replies === 1 ? "reply" : "replies"}
                      </div>
                      <div className="mt-0.5">{timeAgo(t.last)}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
