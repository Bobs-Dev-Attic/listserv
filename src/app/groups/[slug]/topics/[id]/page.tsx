import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List, Message } from "@/lib/database.types";
import { displayName, initials, avatarColor, timeAgo } from "@/lib/display";
import { ReplyForm } from "./reply-form";

export const dynamic = "force-dynamic";

type Post = Pick<
  Message,
  "id" | "subject" | "body_text" | "sender_email" | "created_at"
>;

function PostCard({ post }: { post: Post }) {
  const author = displayName(post.sender_email);
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: avatarColor(author) }}
        >
          {initials(author)}
        </span>
        <div>
          <div className="font-medium text-gray-900">{author}</div>
          <div className="text-xs text-gray-400">{timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
        {post.body_text}
      </div>
    </div>
  );
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
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
  if ((membership as { status: string } | null)?.status !== "confirmed") {
    redirect(`/groups/${slug}`);
  }

  const { data: rootRow } = await supabase
    .from("messages")
    .select("id, subject, body_text, sender_email, created_at, list_id")
    .eq("id", id)
    .maybeSingle();
  const root = rootRow as (Post & { list_id: string }) | null;
  if (!root || root.list_id !== list.id) notFound();

  const { data: replyRows } = await supabase
    .from("messages")
    .select("id, subject, body_text, sender_email, created_at")
    .eq("reply_to_message_id", id)
    .order("created_at", { ascending: true });
  const replies = (replyRows as Post[]) ?? [];

  const canPost =
    (list.type === "discussion" || list.type === "both") &&
    list.posting_policy === "subscribers";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href={`/groups/${slug}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← {list.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{root.subject}</h1>
        <p className="text-sm text-gray-400">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </p>
      </div>

      <div className="space-y-3">
        <PostCard post={root} />
        {replies.map((r) => (
          <PostCard key={r.id} post={r} />
        ))}
      </div>

      {canPost ? (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Reply to this topic
          </h2>
          <ReplyForm slug={slug} topicId={root.id} />
        </div>
      ) : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Replies on this group are limited to admins.
        </p>
      )}
    </div>
  );
}
