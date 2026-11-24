import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List } from "@/lib/database.types";
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

  // Must be a confirmed member and the group must allow member posting.
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
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href={`/groups/${slug}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← {list.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">New topic</h1>
      </div>
      <div className="card p-6">
        <NewTopicForm slug={slug} />
      </div>
    </div>
  );
}
