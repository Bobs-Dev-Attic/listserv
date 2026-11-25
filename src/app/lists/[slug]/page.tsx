import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { displayName } from "@/lib/display";
import { SiteHeader } from "@/components/site-header";
import { UserMenu } from "@/components/user-menu";
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
  const profile = await getProfile();
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
      <SiteHeader>
        {profile ? (
          <UserMenu
            name={displayName(profile.email, profile.full_name)}
            email={profile.email}
            avatarUrl={profile.avatar_url}
            isAdmin={profile.role === "admin"}
          />
        ) : (
          <Link href="/login" className="btn-primary px-4 py-1.5">
            Sign in
          </Link>
        )}
      </SiteHeader>

      <div className="w-full px-4 py-12 md:px-8">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-white"
        >
          ← All lists
        </Link>
        <div className="card mt-4 p-8">
          <h1 className="text-2xl font-bold text-slate-100">{list.name}</h1>
          {list.description && (
            <p className="mt-3 whitespace-pre-line text-slate-200">
              {list.description}
            </p>
          )}
          <p className="mt-4 text-sm text-slate-500">
            {typeDescription[list.type]}
          </p>

          <SubscribeForm slug={list.slug} />
        </div>
      </div>
    </main>
  );
}
