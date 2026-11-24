import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import type { List } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  broadcast: "Announcements",
  discussion: "Discussion",
  both: "Announcements + Discussion",
};

export default async function HomePage() {
  const supabase = await createClient();
  const user = await getUser();
  const { data } = await supabase
    .from("lists")
    .select("*")
    .eq("is_public", true)
    .order("name");
  const lists = (data as List[]) ?? [];

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            ListServ
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <Link href="/groups" className="btn-secondary">
                My groups
              </Link>
            ) : (
              <Link href="/login" className="btn-primary">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Mailing lists
        </h1>
        <p className="mt-2 text-gray-600">
          Browse public lists and subscribe. You&apos;ll get a confirmation email
          before anything is sent.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {lists.length === 0 && (
            <div className="card col-span-full p-8 text-center text-gray-500">
              No public lists yet.
            </div>
          )}
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/lists/${list.slug}`}
              className="card block p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{list.name}</h2>
                <span className="badge bg-brand-50 text-brand-700">
                  {typeLabel[list.type] ?? list.type}
                </span>
              </div>
              {list.description && (
                <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                  {list.description}
                </p>
              )}
              <p className="mt-3 text-sm font-medium text-brand-600">
                Subscribe →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
