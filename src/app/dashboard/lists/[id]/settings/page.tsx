import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List } from "@/lib/database.types";
import { ListForm } from "../../list-form";
import { deleteListAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function ListSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lists")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const list = data as List | null;
  if (!list) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/lists/${id}`}
          className="text-sm text-slate-400 hover:text-white"
        >
          ← {list.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">List settings</h1>
      </div>

      <div className="card p-6">
        <ListForm list={list} />
      </div>

      <div className="card border-red-500/30 p-6">
        <h2 className="font-semibold text-red-300">Danger zone</h2>
        <p className="mt-1 text-sm text-slate-300">
          Deleting a list removes all its subscribers and messages. This cannot
          be undone.
        </p>
        <form action={deleteListAction} className="mt-4">
          <input type="hidden" name="id" value={id} />
          <button className="btn-danger">Delete this list</button>
        </form>
      </div>
    </div>
  );
}
