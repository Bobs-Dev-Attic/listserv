import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { List } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lists")
    .select("*")
    .order("created_at", { ascending: false });
  const lists = (data as List[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Lists</h1>
        <Link href="/dashboard/lists/new" className="btn-primary">
          New list
        </Link>
      </div>

      {lists.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          No lists yet. Create your first one.
        </div>
      ) : (
        <div className="card divide-y divide-white/10">
          {lists.map((l) => (
            <Link
              key={l.id}
              href={`/dashboard/lists/${l.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-white/5"
            >
              <div>
                <div className="font-medium text-slate-100">{l.name}</div>
                <div className="text-sm text-slate-400">/{l.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge bg-brand-50 text-brand-700">{l.type}</span>
                <span
                  className={`badge ${
                    l.is_public
                      ? "bg-green-100 text-green-800"
                      : "bg-white/10 text-slate-300"
                  }`}
                >
                  {l.is_public ? "public" : "private"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
