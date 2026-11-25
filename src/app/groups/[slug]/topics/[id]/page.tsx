import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List, Message, DeliveryMode } from "@/lib/database.types";
import { displayName, timeAgo } from "@/lib/display";
import { Avatar } from "@/components/avatar";
import { Markdown } from "@/components/markdown";
import { GroupSidebar } from "@/components/group-sidebar";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ReplyForm } from "./reply-form";
import { DeletePostButton } from "./delete-post-button";
import { ModerationControls } from "./moderation-controls";

export const dynamic = "force-dynamic";

type Post = Pick<
  Message,
  | "id"
  | "subject"
  | "body_text"
  | "sender_email"
  | "sender_profile_id"
  | "created_at"
  | "seq"
  | "moderation_status"
>;

function PostCard({
  post,
  permalink,
  name,
  avatarUrl,
  slug,
  topicId,
  isRoot,
  canModerate,
}: {
  post: Post;
  permalink: string;
  name: string;
  avatarUrl: string | null;
  slug: string;
  topicId: string;
  isRoot: boolean;
  canModerate: boolean;
}) {
  const pending = post.moderation_status === "pending";
  const rejected = post.moderation_status === "rejected";
  return (
    <div
      id={`m-${post.id}`}
      className={`scroll-mt-20 rounded-lg border p-5 ${
        pending
          ? "border-amber-500/40 bg-amber-500/5"
          : rejected
            ? "border-white/10 bg-[#2d3139] opacity-70"
            : "border-white/10 bg-[#343842]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar url={avatarUrl} name={name} size={36} />
          <div className="font-medium text-white">{name}</div>
          {pending && (
            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
              Pending approval
            </span>
          )}
          {rejected && (
            <span className="rounded bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300">
              Rejected
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
          {canModerate && pending && (
            <ModerationControls
              messageId={post.id}
              slug={slug}
              topicId={topicId}
            />
          )}
          <span>{timeAgo(post.created_at)}</span>
          {post.seq != null && (
            <a
              href={permalink}
              className="text-slate-500 hover:text-[#5b9bd5]"
              title="Permalink to this message"
            >
              #{post.seq}
            </a>
          )}
          <CopyLinkButton path={permalink} />
          {canModerate && (
            <DeletePostButton
              messageId={post.id}
              slug={slug}
              isRoot={isRoot}
            />
          )}
        </div>
      </div>
      <div className="mt-3">
        <Markdown>{post.body_text}</Markdown>
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
    .select(
      "id, subject, body_text, sender_email, sender_profile_id, created_at, seq, moderation_status, list_id",
    )
    .eq("id", id)
    .maybeSingle();
  const root = rootRow as (Post & { list_id: string }) | null;
  if (!root || root.list_id !== list.id) notFound();

  const { data: replyRows } = await supabase
    .from("messages")
    .select(
      "id, subject, body_text, sender_email, sender_profile_id, created_at, seq, moderation_status",
    )
    .eq("reply_to_message_id", id)
    .order("created_at", { ascending: true });
  const replies = (replyRows as Post[]) ?? [];

  // Resolve author name + avatar for each sender (name/avatar only, privacy-scoped).
  const senderIds = Array.from(
    new Set(
      [root, ...replies]
        .map((p) => p.sender_profile_id)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const cards = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  if (senderIds.length > 0) {
    const { data: cardRows } = await supabase.rpc("member_cards", {
      p_ids: senderIds,
    });
    for (const c of (cardRows as {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    }[]) ?? []) {
      cards.set(c.id, { full_name: c.full_name, avatar_url: c.avatar_url });
    }
  }
  const authorOf = (p: Post) => {
    const card = p.sender_profile_id ? cards.get(p.sender_profile_id) : undefined;
    return {
      name: displayName(p.sender_email, card?.full_name),
      avatarUrl: card?.avatar_url ?? null,
    };
  };

  const { data: modData } = await supabase.rpc("user_has_permission", {
    p_perm: "moderate_topics",
    p_list: list.id,
  });
  const canModerate = modData === true;

  const { data: modMembersData } = await supabase.rpc("user_has_permission", {
    p_perm: "moderate_members",
    p_list: list.id,
  });
  const canModerateMembers = modMembersData === true;

  const base = `/groups/${slug}/topics/${root.id}`;

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
        canModerateMembers={canModerateMembers}
      />

      <div className="min-w-0 flex-1 px-4 py-5 md:px-8">
        <div className="w-full">
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
            {(() => {
              const a = authorOf(root);
              return (
                <PostCard
                  post={root}
                  permalink={`${base}#m-${root.id}`}
                  name={a.name}
                  avatarUrl={a.avatarUrl}
                  slug={slug}
                  topicId={root.id}
                  isRoot
                  canModerate={canModerate}
                />
              );
            })()}
            {replies.map((r) => {
              const a = authorOf(r);
              return (
                <PostCard
                  key={r.id}
                  post={r}
                  permalink={`${base}#m-${r.id}`}
                  name={a.name}
                  avatarUrl={a.avatarUrl}
                  slug={slug}
                  topicId={root.id}
                  isRoot={false}
                  canModerate={canModerate}
                />
              );
            })}
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
