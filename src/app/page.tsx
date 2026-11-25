import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { displayName } from "@/lib/display";
import { SiteHeader } from "@/components/site-header";
import { UserMenu } from "@/components/user-menu";
import type { List } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  broadcast: "Announcements",
  discussion: "Discussion",
  both: "Announcements + Discussion",
};

export default async function HomePage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const { data } = await supabase
    .from("lists")
    .select("*")
    .eq("is_public", true)
    .order("name");
  const lists = (data as List[]) ?? [];

  return (
    <main className="min-h-screen">
      <SiteHeader>
        {profile ? (
          <UserMenu
            name={displayName(profile.email, profile.full_name)}
            email={profile.email}
            avatarUrl={profile.avatar_url}
            handle={profile.username}
            isAdmin={profile.role === "admin"}
          />
        ) : (
          <Link href="/login" className="btn-primary px-4 py-1.5">
            Sign in
          </Link>
        )}
      </SiteHeader>

      <div className="w-full px-4 py-12 md:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          Mailing lists
        </h1>
        <p className="mt-2 text-slate-300">
          Browse public lists and subscribe. You&apos;ll get a confirmation email
          before anything is sent.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {lists.length === 0 && (
            <div className="card col-span-full p-8 text-center text-slate-500">
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
                <h2 className="font-semibold text-slate-100">{list.name}</h2>
                <span className="badge bg-brand-50 text-brand-700">
                  {typeLabel[list.type] ?? list.type}
                </span>
              </div>
              {list.description && (
                <p className="mt-2 line-clamp-3 text-sm text-slate-300">
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
