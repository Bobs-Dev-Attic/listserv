import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List } from "@/lib/database.types";
import { GroupSidebar } from "@/components/group-sidebar";
import { NewTopicForm } from "./new-topic-form";

export const dynamic = "force-dynamic";

export default async function NewTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
  const canPost =
    (membership as { status: string } | null)?.status === "confirmed" &&
    (list.type === "discussion" || list.type === "both") &&
    list.posting_policy === "subscribers";
  if (!canPost) redirect(`/groups/${slug}`);

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <GroupSidebar
        slug={slug}
        listId={list.id}
        name={list.name}
        canPost={canPost}
        active="new"
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
          <span>New topic</span>
        </div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">New topic</h1>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <NewTopicForm slug={slug} />
        </div>
      </div>
    </div>
  );
}
