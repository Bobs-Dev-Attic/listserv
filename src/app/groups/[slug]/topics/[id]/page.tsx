import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List, Message, DeliveryMode } from "@/lib/database.types";
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
    <div className="rounded-lg border border-white/10 bg-[#343842] p-5">
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: avatarColor(author) }}
        >
          {initials(author)}
        </span>
        <div>
          <div className="font-medium text-white">{author}</div>
          <div className="text-xs text-slate-400">{timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div className="mt-3 whitespace-pre-wrap text-sm text-slate-200">
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
    .select("status, delivery_mode")
    .eq("list_id", list.id)
    .eq("profile_id", user!.id)
    .maybeSingle();
  const member = membership as {
    status: string;
    delivery_mode: DeliveryMode;
  } | null;
  if (member?.status !== "confirmed") {
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
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
            <Link href="/groups" className="hover:text-white">
              Groups
            </Link>
            <span>/</span>
            <Link href={`/groups/${slug}`} className="hover:text-white">
              {list.name}
            </Link>
            <span>/</span>
            <span className="truncate">Topic</span>
          </div>

          <h1 className="text-2xl font-bold text-white">{root.subject}</h1>
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
            <div className="mt-4 rounded-lg border border-white/10 bg-[#343842] p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-200">
                Reply to this topic
              </h2>
              <ReplyForm slug={slug} topicId={root.id} />
            </div>
          ) : (
            <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Replies on this group are limited to admins.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
