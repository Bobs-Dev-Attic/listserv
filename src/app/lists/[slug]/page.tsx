import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List } from "@/lib/database.types";
import { SubscribeForm } from "./subscribe-form";

export const dynamic = "force-dynamic";

const typeDescription: Record<string, string> = {
  broadcast: "You'll receive announcements from the list owners.",
  discussion:
    "Members can post to the list and everyone receives the conversation.",
  both: "You'll get announcements and can take part in discussion.",
};

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lists")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  const list = data as List | null;

  if (!list) notFound();

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
            ← All lists
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
          {list.description && (
            <p className="mt-3 whitespace-pre-line text-gray-700">
              {list.description}
            </p>
          )}
          <p className="mt-4 text-sm text-gray-500">
            {typeDescription[list.type]}
          </p>

          <SubscribeForm slug={list.slug} />
        </div>
      </div>
    </main>
  );
}
