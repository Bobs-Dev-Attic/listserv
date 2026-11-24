import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List } from "@/lib/database.types";
import { ComposeForm } from "./compose-form";

export const dynamic = "force-dynamic";

export default async function ComposePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lists")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  const list = data as Pick<List, "id" | "name"> | null;
  if (!list) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/dashboard/lists/${id}`}
          className="text-sm text-slate-400 hover:text-white"
        >
          ← {list.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">
          New message
        </h1>
        <p className="text-sm text-slate-400">
          Save a draft, then review and send it to confirmed subscribers.
        </p>
      </div>
      <div className="card p-6">
        <ComposeForm listId={id} />
      </div>
    </div>
  );
}
