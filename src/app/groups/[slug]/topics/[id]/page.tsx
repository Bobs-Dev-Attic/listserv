import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List, Message } from "@/lib/database.types";
import { displayName, initials, avatarColor, timeAgo } from "@/lib/display";
import { GroupSidebar } from "@/components/group-sidebar";
import { ReplyForm } from "./reply-form";

export const dynamic = "force-dynamic";

type Post = Pick<
  Message,
  "id" | "subject" | "body_text" | "sender_email" | "created_at"
>;

function PostCard({ post }: { post: Post }) {
  const author = displayName(post.sender_email);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: avatarColor(author) }}
        >
          {initials(author)}
        </span>
        <div>
          <div className="font-medium text-slate-900">{author}</div>
          <div className="text-xs text-slate-400">{timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div className="mt-3 whitespace-pre-wrap text-sm text-slate-800">
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
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <GroupSidebar
        slug={slug}
        listId={list.id}
        name={list.name}
        canPost={canPost}
        active="messages"
      />

      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/groups" className="hover:text-slate-900">
            Groups
          </Link>
          <span>/</span>
          <Link href={`/groups/${slug}`} className="hover:text-slate-900">
            {list.name}
          </Link>
          <span>/</span>
          <span className="truncate">Topic</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">{root.subject}</h1>
        <p className="mb-4 text-sm text-slate-400">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </p>

        <div className="space-y-3">
          <PostCard post={root} />
          {replies.map((r) => (
            <PostCard key={r.id} post={r} />
          ))}
        </div>

        {canPost ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Reply to this topic
            </h2>
            <ReplyForm slug={slug} topicId={root.id} />
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Replies on this group are limited to admins.
          </p>
        )}
      </div>
    </div>
  );
}
