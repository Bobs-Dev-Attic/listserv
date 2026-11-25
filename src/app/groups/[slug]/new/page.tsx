import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List, DeliveryMode } from "@/lib/database.types";
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
    .select("status, delivery_mode")
    .eq("list_id", list.id)
    .eq("profile_id", user!.id)
    .maybeSingle();
  const member = membership as {
    status: string;
    delivery_mode: DeliveryMode;
  } | null;
  const canPost =
    member?.status === "confirmed" &&
    (list.type === "discussion" || list.type === "both") &&
    list.posting_policy === "subscribers";
  if (!canPost) redirect(`/groups/${slug}`);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <GroupSidebar
        slug={slug}
        listId={list.id}
        name={list.name}
        canPost={canPost}
        active="new"
        deliveryMode={member?.delivery_mode}
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
            <span>New topic</span>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-white">New topic</h1>
          <div className="rounded-lg border border-white/10 bg-[#343842] p-6">
            <NewTopicForm slug={slug} />
          </div>
        </div>
      </div>
    </div>
  );
}
